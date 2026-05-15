# 05 — Security and LGPD

> **When to read:** Any work involving PII, consent, encryption, audit, or compliance.
> **Prerequisites:** `02-DATA_MODEL.md`, `03-AUTH_AND_PERMISSIONS.md`
> **TL;DR:** PII encrypted at rest with AES-256-GCM. Search via paired hash columns. Consent required before student creation. Anonymization (not deletion) on the right to be forgotten. Audit log captures every mutation.

---

## Threat model (in scope)

| Threat | Mitigation |
|--------|------------|
| Database leak (dump stolen) | All PII encrypted with key NOT stored in DB |
| Application breach (RCE) | Defense in depth: encryption key in secret manager, rate limits, audit |
| Cross-tenant data leak | Multi-tenant enforcement at 5 layers (see `04-…`) |
| Auth token theft via XSS | HTTP-only cookies (JS can't read) |
| Auth token replay | Refresh rotation with reuse detection |
| CSRF | SameSite=Strict + custom header |
| Brute force login | Per-IP and per-email rate limits, lockout after N failures |
| Malicious insider read | Audit log, fine-grained permissions, principle of least privilege |
| Webhook spoofing | HMAC signature verification + idempotency table |
| Supply chain | Lockfile pinned, dependabot, npm audit on CI |
| LGPD non-compliance | Consent records, encryption, anonymization, exports, data minimization |

Out of scope for MVP: physical security of provider DCs, advanced persistent threats, DDoS at network layer (rely on Cloudflare / provider).

## Encryption at rest

### Algorithm

AES-256-GCM (authenticated encryption). 96-bit IV per record. Tag stored alongside ciphertext.

### Storage format

Single text column, format:
```
v1:<base64-iv>:<base64-ciphertext>:<base64-tag>
```

The `v1` prefix is the **key version**, allowing seamless rotation without re-encrypting in a single deploy.

### Key management

- Master key stored in secret manager (Doppler / Infisical / cloud provider).
- Env var `ENCRYPTION_KEY` (64 hex chars = 32 bytes).
- `ENCRYPTION_KEY_VERSION` env var indicates current writing version.
- Multiple keys supported for reading during rotation period.
- **Never logged, never echoed back through API.**

### TypeORM transformer

```ts
@Column({ type: 'text', transformer: createEncryptedTransformer() })
documentEncrypted: string;
```

The transformer:
- `to(value)`: encrypts on the way to DB.
- `from(value)`: decrypts on the way out.
- Null → null (no error).

### Searching encrypted fields

Plaintext is **never** in DB. To support exact-match lookup, a paired column stores a deterministic transformation:

| Type | Approach | Where used |
|------|----------|------------|
| Names | Normalized: lowercase + strip accents + collapse whitespace | `*_search` for prefix/equality |
| CPF, phone | HMAC-SHA256 with a separate `SEARCH_HASH_KEY` | `*_search` for equality only |

Critical: **two different keys** — `ENCRYPTION_KEY` (reversible AES) and `SEARCH_HASH_KEY` (one-way HMAC). Compromise of search hashes alone does not reveal plaintexts.

### What is encrypted (and what is not)

Encrypted (see catalog in `02-DATA_MODEL.md`):
- Names of natural persons (Student, Guardian)
- Documents (CPF, CNPJ)
- Phones
- Medical information, allergies, medications
- MFA secrets

**Not encrypted:**
- Email addresses (used for login, comms — encrypting breaks transactional flow). Treated as restricted PII via logs and exports.
- Public-ish data (city, neighborhood) — judgment call; current decision: not encrypted.
- Statuses, enums, IDs, timestamps.

If unsure: **encrypt it**. Cheap to add, hard to retrofit.

## Consent (LGPD foundation)

Stored in `consents`. Granular by purpose:

```ts
type ConsentPurpose =
  | 'data_processing'      // mandatory to operate
  | 'photo_use'            // optional, for galleries/marketing
  | 'communications'       // mandatory for transactional, optional for marketing
  | 'marketing';           // optional
```

- A `Consent` row references the Guardian who accepted, and (when applicable) the specific Student.
- The terms version is stored verbatim (immutable PDF in storage, hash recorded).
- IP + user agent + timestamp captured.
- Revocation is a separate row with `revoked_at` — original consent is **never edited**.

### Rules

- `data_processing` consent is required before any `student` row is created in the same transaction.
- Marketing communications must filter recipients by `marketing` consent.
- Revoking `data_processing` triggers anonymization for the associated student.
- The terms page (public) shows the current version and links to the PDF.

## Right to access, portability, correction

### Export endpoint

`GET /me/data-export` — authenticated.

- For a Guardian: returns all their data + dependents' data (with consent for the dependents).
- For Staff/Admin: returns their own user profile only.
- Processed in the `data-export` queue (can be heavy).
- Result is a signed URL emailed to the user, valid for 24h, file expires after 7 days.
- Format: JSON (machine-readable) + PDF summary (human-readable).

### Correction

Standard update endpoints. Guardians can self-update via portal for their fields and dependent's non-critical fields (cannot edit medical notes — staff-only).

## Right to be forgotten — anonymization

**We never DELETE PII.** We replace it with placeholders to preserve referential integrity (financial records, audit logs need stable IDs).

### Endpoint

`POST /students/:id/anonymize` (permission `student:anonymize`, ADMIN only).

### Process

In a transaction:
1. Replace `full_name_encrypted`, `document_encrypted`, etc. with deterministic placeholders (`'***ANONYMIZED***'`).
2. Clear `full_name_search` (set to a sentinel).
3. Set `anonymized_at = now()`.
4. Soft-delete the row (`deleted_at`).
5. For linked `guardians` with no other students: also offer to anonymize.
6. Write an `audit_log` entry of type `student.anonymized`.

### Automatic anonymization

A daily job (`anonymization` queue) scans for:
- Enrollments cancelled > 24 months ago AND no other active enrollments for the student → anonymize.
- Guardians with no non-anonymized linked students → anonymize.

Configurable retention window via env (`RETENTION_MONTHS`, default 24).

### What stays

- IDs, foreign keys, timestamps.
- Financial records (Invoice/Payment) with amounts and dates.
- Audit log entries with `actor_user_id` (the user's name is fetched from the User row, which is also anonymized if applicable).

## Logging hygiene

### Pino redaction

```ts
{
  redact: {
    paths: [
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.refreshToken',
      '*.mfaSecret',
      '*.document',
      '*.cpf',
      '*.cnpj',
      '*.phone',
      '*.email',
      '*.fullName',
      '*.medicalNotes',
      '*.allergies',
      '*.medications',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
    ],
    censor: '[REDACTED]',
  },
}
```

### Error messages

- Never echo back submitted credentials.
- Never include PII in error responses.
- Generic messages for security-sensitive failures ("Invalid credentials" not "User not found").

## Transport and infrastructure security

- **HTTPS** everywhere. HSTS preload-ready (`max-age=31536000; includeSubDomains; preload`).
- **Helmet** with strict CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff.
- **CORS**: explicit whitelist (`FRONTEND_URL` env), credentials allowed only for whitelisted origins.
- **Rate limiting** via `@nestjs/throttler` with Redis storage (so it's shared across instances).
- **Secrets**: Doppler/Infisical. Never in code, never in `.env` committed.
- **Backups**: daily automatic. Encrypted at rest. Test restore monthly.
- **Database**: TLS connections only. Read-only replica for reports (post-MVP).
- **Object storage**: private buckets. Signed URLs only (max 1h).

## Brand asset uploads (white-label)

Tenants upload logos and favicons. Untrusted file uploads are a classic vector. Rules:

- **Allowed MIME**: `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`. Anything else → reject.
- **Max size**: 2 MB. Enforced at the multer (or equivalent) layer before persistence.
- **Raster validation**: open the image with `sharp` server-side, read actual dimensions and format. If the declared MIME doesn't match the real content → reject. Downscale to max 1024px on longest side.
- **SVG sanitization**: parse with `DOMPurify` (server-side, via `jsdom`) configured to strip:
  - `<script>` tags and event-handler attributes (`onload`, `onclick`, etc.)
  - External references (`<image href="...">`, `<use xlink:href="...">`)
  - Embedded foreign objects, animations referencing external URIs
  - Anything not on a strict allowlist of safe SVG elements
- **Storage path**: `orgs/<orgId>/brand/<uuid>.<ext>` — random filename prevents enumeration; tenant prefix prevents cross-tenant hot-linking via crafted URLs.
- **Serving**: through the CDN with `Content-Disposition: inline` and `X-Content-Type-Options: nosniff`. SVG served with `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` so even a malicious SVG that slipped sanitization can't execute scripts when rendered.
- **Audit**: every brand asset change writes an `organization.brand_asset_updated` audit entry.


## Payment gateway credentials (per-tenant)

Each tenant connects their own Asaas account via API key. These are highly sensitive credentials — direct access to the tenant's money. Rules:

- **Storage**: `organizations.settings.paymentGateway.apiKey_encrypted` (AES-256-GCM, same scheme as other PII). Never stored or logged in plaintext.
- **Validation on connect**: when the admin pastes a key, the backend calls Asaas's `/myAccount` endpoint to verify it's valid before persisting. Invalid keys are rejected with `PAYMENT_GATEWAY_INVALID_CREDENTIALS`.
- **Never returned via API**: read endpoints expose only `status` and `lastFour` (last 4 chars of the key, masked). Even ADMIN cannot retrieve the full key — they re-enter it if needed.
- **Access scope**: only the `AsaasAdapter` reads the decrypted key, never controllers or use cases directly. Decrypted key cached in Redis for 60s to reduce load.
- **Rotation**: the admin can disconnect and reconnect with a new key. Old key wiped immediately.
- **Audit**: connect, disconnect, and reconnect events recorded with `organization.payment_gateway_connected` / `_disconnected` actions, with `connectedBy` user id.
- **Webhook token**: a platform-generated opaque random token (256-bit) is also stored per tenant. It's the only thing in the webhook URL — no org id leaks publicly. Globally unique (partial unique index).

## Webhooks security (multi-tenant)

Each tenant's Asaas account is configured to send events to a tenant-specific URL:
`https://api.school-platform.app/webhooks/asaas/{webhookToken}`

Processing:

1. Resolve `organizationId` from `webhookToken` (constant-time lookup; cached). If not found → 404, log incident.
2. Verify HMAC signature using the tenant's Asaas-configured signing secret (stored per tenant).
3. Insert into `webhook_events` with `(provider, gateway_event_id)` UNIQUE constraint for idempotency.
4. Respond 200 immediately, enqueue for processing.
5. Workers process with exponential retry; failed events go to DLQ.
6. The `RequestContext` for the worker is bootstrapped with the resolved `organizationId` so tenant scoping applies normally.

Token rotation: the tenant can regenerate their webhook token if compromised — the old one stops accepting deliveries immediately, and the admin re-configures the URL in Asaas.

## Audit log

Captures every create/update/delete. See `05-BACKEND_GUIDE.md` for usage; here we cover security aspects.

- Append-only — no UPDATE or DELETE from app code.
- Actor (`actor_user_id`) can be NULL for system actions (cron jobs).
- Before/after JSONs are stored as-is **after applying log redaction** (encrypted fields stay encrypted in the snapshot too, but their `_search` column also makes it in — both are useless without the key).
- Retention: 5 years.
- ADMIN can read all org-wide; SCHOOL_STAFF can read `.own-school`.

## Idempotency

- Header `Idempotency-Key` on mutating endpoints (invoice create, manual payment register, send communication).
- Key + user_id + request_hash stored in `idempotency_keys`.
- Same key + same body → returns cached response.
- Same key + different body → 422 with code `IDEMPOTENCY_CONFLICT`.
- TTL 24h.

## Secret rotation playbooks

### JWT secret

1. Add new secret env (`JWT_ACCESS_SECRET_NEXT`).
2. Code verifies tokens with BOTH current and next.
3. Issue new tokens with NEXT.
4. After max token lifetime + buffer, remove old.

### Encryption key

1. Add `ENCRYPTION_KEY_V2` env.
2. Set `ENCRYPTION_KEY_VERSION=2` so new writes use v2.
3. Reads handle both v1 and v2 (key version is in the ciphertext prefix).
4. Background re-encryption job updates v1 → v2 rows (optional, can wait).
5. After all rows migrated, remove `ENCRYPTION_KEY_V1`.

### Search hash key

Trickier — search columns would need recompute on rotation. Treated as long-lived. Rotation only on suspected compromise.

## Security checks in CI

- `npm audit` (or `pnpm audit`) — fails on HIGH or CRITICAL.
- Dependabot or Renovate on weekly schedule.
- `gitleaks` or `trufflehog` on every push (no leaked secrets in commits).
- Bandit-style scanner for TS (eslint-plugin-security).

## What to do if a breach is suspected

1. **Don't panic, don't delete logs.**
2. Rotate JWT secrets — invalidates all access tokens worldwide.
3. Rotate refresh secrets and revoke all sessions: `UPDATE sessions SET revoked_at = NOW()`.
4. Check `audit_logs` for the suspected window.
5. Notify the owner immediately, with evidence.
6. Begin LGPD breach notification timer (ANPD, 72h for high-risk).
