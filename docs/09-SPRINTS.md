# 12 — Features and sprints

> **When to read:** Every session. This is the **source of truth** for what's done and what's next.
> **Prerequisites:** `01-ARCHITECTURE.md`
> **TL;DR:** 7 sprints from foundation to launch-ready. Mark `[x]` when an item meets the Definition of Done (`07-TESTING.md`). Do not add scope outside this backlog without approval.

---

## How to use this file

- Each item is a checkbox. `[ ]` = todo. `[x]` = done.
- **Do not** mark `[x]` until **every** item in `07-TESTING.md` is satisfied.
- New scope discovered mid-sprint: add to "Backlog (post-MVP / undecided)" at the bottom and ask before bumping it up.
- Update this file in the **same PR** that completes the work.
- After each sprint, write a brief retro at the bottom of the sprint section.

Legend in parentheses after items: `(BE)` backend, `(FE)` frontend, `(INF)` infra, `(DOC)` docs.

---

## Sprint 0 — Foundation

**Goal:** Empty but production-ready monorepo. Anyone can clone, install, run, and contribute.

- [x] Initialize Turborepo + pnpm workspace (INF)
- [x] Configure shared `tsconfig` package (INF)
- [x] Configure shared `eslint-config` package with strict rules (INF)
- [x] Configure Prettier with shared config (INF)
- [ ] Add `commitlint` + `husky` for Conventional Commits (INF)
- [ ] Add lint-staged for staged-file checks (INF)
- [x] Create `apps/api` scaffold (NestJS) (BE)
- [ ] Create `apps/web` scaffold (Next.js App Router + Tailwind + shadcn init) (FE)
- [x] Create `packages/shared` with Zod placeholder + barrel export (BE/FE)
- [ ] Create `packages/ui` for shared React components (FE)
- [x] Add `docker-compose.yml` with Postgres + Redis + Mailpit (INF)
- [x] Wire `pnpm dev` to run api + web concurrently via Turborepo (INF)
- [x] Set up `.env.example` for api (web: deferred to Sprint 2) (INF)
- [x] Implement env validation with Zod in `apps/api` (BE)
- [x] Configure TypeORM DataSource (separate file for CLI compatibility) (BE)
- [x] Add base migration that creates `uuid-ossp` / `pgcrypto` extensions + helper functions (BE)
- [x] Configure Pino + nestjs-pino logger (BE)
- [x] Configure Helmet + CORS + cookie-parser in `main.ts` (BE)
- [x] Configure global exception filter stub (BE)
- [x] Configure global validation pipe (Zod) (BE)
- [x] Health check endpoints `/health` and `/health/ready` (BE)
- [ ] Configure Swagger at `/api/docs` (gated to non-prod) (BE)
- [x] Configure GitHub Actions: `ci.yml` (lint, typecheck, audit, gitleaks — test job added in Sprint 1) (INF)
- [ ] Configure Codecov upload (INF)
- [ ] Configure GitHub branch protection rules on `develop` and `main` (INF)
- [x] Add `README.md`, `CONTRIBUTING.md`, `CLAUDE.md` (DOC)
- [x] Add `docs/` folder with all numbered docs (DOC)
- [ ] First PR template (`.github/PULL_REQUEST_TEMPLATE.md`) (INF)
- [ ] Verify cold-clone setup works on a fresh machine (DOC)

**Sprint 0 retro:** API foundation complete and smoke-tested (`pnpm lint && pnpm typecheck` green, Docker healthy, `/health/ready` returning DB up). Deferred to Sprint 1 or 2 entry point: `apps/web`, `packages/ui`, commitlint/husky, lint-staged, Swagger, GitHub Actions CI, PR template. Mailpit was chosen over MailHog (better UI, actively maintained). Postgres runs on host port 55432 to avoid conflicts with local Postgres (5432) and other containers (5433).

---

## Sprint 1 — Identity, hierarchy, auth, RBAC

**Goal:** Backend can register an organization, create users, assign roles, log them in and out securely.

### Domain & data

- [x] Migration: `organizations`, `schools`, `modalities`, `school_modalities`, `classes` (BE)
- [x] Migration: `users`, `roles`, `permissions`, `role_permissions`, `user_roles` (BE)
- [x] Migration: `staff_schools`, `coach_classes` (BE)
- [x] Migration: `sessions`, `invites` (BE)
- [x] Migration: `audit_logs` (BE)
- [x] Seed: system roles + full permissions catalog from `03-AUTH_AND_PERMISSIONS.md` (BE)
- [x] Seed: dev org + ADMIN user (`pnpm seed:dev`) (BE)
- [x] `@school/shared/theming` package: hex schema, `deriveTones`, `computeBrandTokens`, `contrastRatio`, `validateBrandColor` (BE/FE)
- [x] Migration: ensure `organizations.settings` includes `theme` shape with defaults (BE)

### Modules

- [x] `organizations` module — entity + repo + CRUD use cases + controller (BE)
- [x] `schools` module — entity + repo + CRUD + tenant scope (BE)
- [x] `modalities` module — entity + repo + CRUD (BE)
- [x] `school-modalities` module — entity + repo + CRUD + price override (BE)
- [x] `classes` module — entity + repo + CRUD + schedule validation (BE)
- [x] `users` module — entity + profile use cases (read/update self) (BE)
- [x] `roles` module — assign/revoke roles, list (BE)

### Auth

- [x] Encryption transformer + tests (BE)
- [x] Search-hash helper (HMAC) + tests (BE)
- [x] Argon2 password hasher + helper (BE)
- [x] JWT access token issuer/verifier (BE)
- [x] Opaque refresh token generator + hasher (BE)
- [x] `auth/signup-organization` use case + endpoint (BE)
- [x] `auth/verify-email` use case + endpoint (BE)
- [x] `auth/login` use case + endpoint with rate limit (BE)
- [x] `auth/refresh` use case + endpoint with rotation + reuse detection (BE)
- [x] `auth/logout` and `auth/logout-all` (BE)
- [x] `auth/forgot-password` and `auth/reset-password` (BE)
- [x] `auth/accept-invite` (BE)
- [x] `auth/me` (BE)
- [x] `users/invites` create/revoke (BE)

### Email (transactional)

> Prerequisite of the auth flow above (signup verify, invite, password reset). The same adapter is reused by Sprint 5 (invoice / payment templates) and could later be reused by the post-MVP marketing-campaign system (see ADR 0009).

- [x] `EmailSenderPort` abstract port in `application/ports/` (BE)
- [x] `ResendAdapter` implementation in `apps/api/src/infrastructure/mail/` (BE)
- [x] Dev/test adapter targeting MailHog selected by env (NodemailerAdapter via SMTP) (BE)
- [x] `@react-email/components` setup with a shared base layout (BE)
- [x] Template: `WelcomeEmail` (post-verify) (BE)
- [x] Template: `VerifyEmailEmail` (signup + email change) (BE)
- [x] Template: `InviteEmail` (consumed by `users/invites` and by guardian auto-invite in Sprint 3) (BE)
- [x] Template: `PasswordResetEmail` (BE)
- [ ] Async dispatch via BullMQ queue + retry/DLQ — worker in `infrastructure/mail/workers/` (deferred post-MVP)
- [x] Audit log entry on outbound email (recipient hash + template id, no body) (BE)
- [x] Unit tests per template (snapshot + props validation) (BE)
- [ ] Integration test: full auth flow renders to MailHog, asserts subject + key body fragments (BE)

### Authorization

- [x] `AuthGuard` (BE)
- [x] `RequestContext` with AsyncLocalStorage (BE)
- [x] `PermissionsGuard` + `@RequirePermissions` decorator (BE)
- [x] `OwnershipGuard` + `@CheckOwnership` decorator (BE)
- [x] Ownership resolver registry + implementations for: school, class, student stub (BE)
- [x] `TenantSubscriber` (TypeORM) (BE)
- [x] `SchoolScopeInterceptor` for SCHOOL_STAFF (BE)
- [x] Permission cache layer (Redis) + invalidation hooks (BE)

### Cross-cutting

- [x] `GlobalExceptionFilter` mapping `DomainException` → standard error shape (BE)
- [x] `RequestIdMiddleware` (BE)
- [x] `AuditInterceptor` writing async via queue (BE)
- [x] `IdempotencyInterceptor` (BE)
- [x] CSRF guard (rejects mutations without `X-Requested-With`) (BE)

### Tests

- [x] Unit tests for all use cases (BE)
- [x] Integration tests for auth flow (signup → verify → login → refresh → logout) (BE)
- [x] Cross-tenant isolation test suite seeded with two orgs (BE)
- [x] Permission matrix integration test (every role × every endpoint) (BE)

**Sprint 1 retro:** Backend completo. 198 testes passando em 48 suites, lint e typecheck verdes. BullMQ para dispatch assíncrono de e-mail foi deliberadamente adiado para pós-MVP (substituído por despacho síncrono via Resend/Nodemailer). `@conecta/shared/theming` implementado com 11-stop HSL palette e validação WCAG 2.1. Audit log de e-mails usa hash SHA-256 do destinatário (sem PII). Os testes de integração usam repos in-memory (Map) sem dependência de banco real.

---

## Sprint 2 — Frontend base + auth screens

**Goal:** Web app has login, signup, invite-accept, layouts, and the proxy/auth plumbing.

> **Phase A reconciliation (2026-05-18)** — commit `9b95aa7` delivered the Next.js
> scaffold + auth screens. Audited against the Definition of Done (`07-TESTING.md`).
> `pnpm typecheck` and `pnpm lint` are green (lint config was broken on delivery — the
> web app's bespoke `FlatCompat` setup was replaced with the shared
> `@conecta/eslint-config/base`, matching `apps/api`; 21 pre-existing `import/order`
> errors auto-fixed). Checkboxes below reflect the audit. **Known open debts (each is
> its own unchecked line item):**
> - ~~**i18n not wired**~~ — RESOLVED 2026-05-18: `next-intl` wired (single-locale
>   pt-BR, no routing) via `src/i18n/request.ts` + plugin + `NextIntlClientProvider`;
>   all 12 screens/layouts migrated to `t()`. Lint + typecheck + prod build green.
> - ~~**CASL not implemented**~~ — RESOLVED 2026-05-18: real `defineAbilityFor`
>   in `@conecta/shared/permissions` (@casl/ability), unit-tested; `useAbility`
>   reworked to the documented memoized pattern; sidebar gated via `ability.can()`.
> - ~~**No frontend tests**~~ — PARTIAL 2026-05-18: Vitest + RTL configured;
>   auth-form unit tests (login/signup/forgot, 9 tests) green. Playwright e2e
>   still deferred (the 2 e2e items below remain unchecked).
> - ~~**Sentry / school selector / shadcn gaps**~~ — RESOLVED 2026-05-18:
>   `@sentry/nextjs` wired (server/edge/client + `global-error.tsx`, no-op
>   without DSN, sourcemaps off); school selector in the top bar (TanStack
>   Query + shadcn dropdown + `selectedSchool` store); shadcn `dialog`/`table`/
>   `dropdown-menu` added.
> - ~~**Phase A bugs**~~ — FIXED 2026-05-18 (`@radix-ui/react-slot`):
>   (a) `ui/button.tsx` `asChild` now renders via `Slot` (valid single
>   element for `<Button asChild><Link>`); (b) `ui/form.tsx` `FormControl`
>   is now a `Slot`, so `id`/aria land on the actual input — label/input
>   association restored.
> - **Still open:** **auth store not hydrated** client-side (server layouts
>   pass `user` as a prop; `useAbility(userOverride)` bridges this until
>   hydration lands); **Playwright e2e** deferred.

### Setup

- [x] Install shadcn/ui + base components (button, input, form, dialog, toast, table, dropdown) (FE) — _button/input/label/card/form + dialog/table/dropdown-menu; toast via sonner_
- [x] Set up TanStack Query provider + devtools in dev (FE)
- [x] Set up React Hook Form helpers (FE)
- [x] Zustand stores: `auth`, `selectedSchool` (FE)
- [x] `next-intl` setup with pt-BR resources (FE) — _single-locale pt-BR (no routing); plugin + `src/i18n/request.ts` + `NextIntlClientProvider`; all screens use `t()`_
- [x] Typed API client in `apps/web/src/lib/api/` (FE)
- [x] `/api/[...proxy]/route.ts` cookie-forwarding handler (FE)
- [x] CASL ability builder in `@school/shared/permissions` (BE/FE) — _`defineAbilityFor` (@casl/ability) in `@conecta/shared`; scope suffix dropped (UX-only, server enforces); unit-tested_
- [x] `useAbility` hook (FE) — _memoized `defineAbilityFor`; store-based with `userOverride` for not-yet-hydrated SSR props; sidebar gated via `ability.can()`_
- [x] **Theme provider:** `getOrganizationTheme()` server resolver + `<style>` injection in root layout (FE)
- [x] Tailwind config consumes `--brand-*` CSS variables; fixed semantic + neutral tokens defined inline (FE)
- [x] Default brand tokens applied when no tenant resolved (FE)
- [x] `BrandLogo` component with letter fallback (FE)

### Screens

- [x] Public layout (marketing-style header/footer) (FE)
- [x] Landing page (minimal) (FE)
- [x] Signup organization page + form (FE)
- [x] Verify email page (FE)
- [x] Login page (FE)
- [x] Forgot password page (FE)
- [x] Reset password page (FE)
- [x] Accept invite page (FE)
- [x] Auth layout `(auth)/layout.tsx` (FE)
- [x] Guardian layout `(guardian)/layout.tsx` (FE)
- [x] Sidebar nav with role-based items (FE)
- [x] Top bar with school selector + user menu + logout (FE) — _`SchoolSelector` (TanStack Query `/schools` + shadcn dropdown + `selectedSchool` store; hidden when no schools)_
- [ ] 401 handling: silent refresh attempt; on failure redirect to `/login` (FE) — _partial: client.ts retries refresh, `(auth)` layout redirects; unified flow + test pending_
- [x] Empty dashboard page (placeholder) (FE)
- [x] Toast system wired (FE)
- [x] Error boundary + Sentry frontend init (FE) — _`error.tsx` + `global-error.tsx` capture to Sentry; `@sentry/nextjs` server/edge/client, no-op without DSN, sourcemaps off_

### Tests

- [x] Unit tests for auth forms (validation, submit states) (FE) — _Vitest + RTL; login/signup/forgot, 9 tests_
- [ ] Playwright e2e: signup → verify → login → land on dashboard (FE) — _deferred (needs api+web+seed orchestration)_
- [ ] Playwright e2e: invite → accept → log in (FE) — _deferred_

**Sprint 2 retro:** _(fill in when done)_

---

## Sprint 3 — Schools, modalities, classes, students, guardians

**Goal:** Full CRUD on the entire roster, including encrypted PII and consent flow.

### Backend

- [ ] `students` module — entity (with all encrypted fields), repository, CRUD use cases (BE)
- [ ] `guardians` module — entity, repository, CRUD use cases (BE)
- [ ] `student-guardians` module — link CRUD with attributes (BE)
- [ ] `consents` module — record consent, revoke, list (BE)
- [ ] Guardian auto-invite on creation (BE)
- [ ] Student search via `*_search` columns (BE)
- [ ] Soft-delete behavior on all PII-bearing entities (BE)
- [ ] `student:anonymize` use case + endpoint (BE)
- [ ] Ownership resolvers: student (own-school, own), guardian (own-school, own), class (own-school), school-modality (own-school) (BE)
- [ ] Audit decorator applied on every mutation (BE)

### Frontend

- [ ] Schools list + create/edit (FE)
- [ ] Modalities list + create/edit (FE)
- [ ] School modalities list + create/edit + price override (FE)
- [ ] Classes list + create/edit + schedule editor + coach assignment (FE)
- [ ] Students list with search, filters, pagination (FE)
- [ ] Student detail with tabs: profile, guardians, enrollments, attendance, finance (FE)
- [ ] Student create wizard (steps: student info → guardians → terms acceptance) (FE)
- [ ] Student edit form (PII fields gated by permission) (FE)
- [ ] Guardian create/edit form (FE)
- [ ] Guardian-student link UI (add/remove with role + flags) (FE)
- [ ] Consent terms PDF preview + acceptance UX (FE)
- [ ] `WhatsAppButton` component in `packages/ui` — normalizes Brazilian phone to E.164 and opens `https://wa.me/<phone>?text=<message>` in a new tab; used wherever a guardian phone is shown (guardian list, student detail, defaulters list, attendance roster, notification read-status drill-down) (FE)

### Tests

- [ ] Unit tests for all new use cases (BE)
- [ ] Integration tests for encrypted persistence (verify ciphertext at rest) (BE)
- [ ] Cross-tenant isolation tests for new endpoints (BE)
- [ ] Playwright e2e: create student end-to-end with guardian invite (FE)

**Sprint 3 retro:** _(fill in when done)_

---

## Sprint 4 — Enrollments & attendance

**Goal:** Students can be enrolled in classes; coaches can take attendance on mobile.

### Backend

- [ ] `enrollments` module — entity, repository, use cases: create, pause, resume, cancel (BE)
- [ ] Enrollment invariants: school/class match, modality match, price snapshot (BE)
- [ ] Enrollment ownership resolvers (BE)
- [ ] `attendance` module — entities `attendance_sessions` + `attendance_records` (BE)
- [ ] Use case: create session for today (auto when class scheduled) (BE)
- [ ] Use case: register attendance batch (one call per session) (BE)
- [ ] Use case: list attendance for a class / a student / a date range (BE)
- [ ] Attendance ownership resolvers (`own-school`, `own-class`, `own`) (BE)
- [ ] Domain event: `EnrollmentCreated` → triggers initial Invoice creation (placeholder until Sprint 5) (BE)

### Frontend

- [ ] Enroll student in class: dialog/page with price preview (FE)
- [ ] Pause / resume / cancel enrollment with confirmation (FE)
- [ ] Enrollment history on student detail (FE)
- [ ] Coach attendance UI (mobile-first):
  - [ ] Today's classes list (FE)
  - [ ] One-tap presence per student (FE)
  - [ ] Bulk mark all present (FE)
  - [ ] Justify absence with optional note (FE)
- [ ] Attendance history on student detail (FE)
- [ ] Attendance report (per class, per period) — basic table (FE)

### Tests

- [ ] Unit tests for enrollment lifecycle transitions (BE)
- [ ] Unit tests for attendance invariants (BE)
- [ ] Integration tests for enrollment + attendance (BE)
- [ ] Cross-tenant isolation: enrollment cannot link student of org A with class of org B (BE)
- [ ] Playwright e2e: coach logs in, takes attendance, parent sees record (FE)

**Sprint 4 retro:** _(fill in when done)_

---

## Sprint 5 — Finance (Asaas, invoices, dunning, payment portal)

**Goal:** Money flows. Subscriptions created with Asaas, invoices generated, webhooks reconcile, guardians can pay.

### Backend

#### Payment gateway abstraction & connection
- [ ] `PaymentGatewayPort` defined in `modules/finance/application/ports` (BE)
- [ ] `PaymentGatewayFactory` resolving the adapter per tenant from `organizations.settings.paymentGateway` (BE)
- [ ] `AsaasAdapter` implementing the port — all vendor-specific concepts (customer/billing IDs) live inside (BE)
- [ ] `EncryptionService` integration for `apiKey_encrypted` (BE)
- [ ] `POST /payment-gateway/connect` — validates the key via Asaas `/myAccount`, encrypts and persists, generates `webhookToken` (BE)
- [ ] `POST /payment-gateway/disconnect` — wipes the encrypted key, invalidates cache (BE)
- [ ] `POST /payment-gateway/rotate-webhook-token` (BE)
- [ ] `GET /payment-gateway` — status + lastFour + webhookUrl (BE)
- [ ] Redis cache for decrypted credentials, 60s TTL, invalidation hooks on disconnect/rotate (BE)
- [ ] Audit log entries: `organization.payment_gateway_connected` / `_disconnected` / `_webhook_rotated` (BE)
- [ ] `PaymentGatewayNotConnectedError` (422 `PAYMENT_GATEWAY_NOT_CONNECTED`) thrown by billing endpoints when gateway is missing (BE)

#### Invoicing, payments, subscriptions
- [ ] `invoices` module — entity, repository, use cases (BE)
- [ ] Manual invoice creation (ADMIN/STAFF) (BE)
- [ ] Auto invoice creation when enrollment is created (initial monthly + enrollment fee if any) (BE)
- [ ] `payments` module — entity, repository, use cases (BE)
- [ ] Manual payment registration (cash / pix outside gateway) (BE)
- [ ] `subscriptions` module — entity + sync use cases (BE)
- [ ] Subscription created on enrollment create (BE)
- [ ] Subscription paused / cancelled on enrollment pause / cancel (BE)
- [ ] Invoice cancel use case (BE) — refund is processed manually by the operator in the Asaas dashboard (see ADR 0010); only cancel is exposed in the platform UI in the MVP

#### Webhooks
- [ ] `POST /webhooks/asaas/:webhookToken` with tenant resolution, HMAC validation, idempotent insert (BE)
- [ ] Webhook processor worker handling: PAYMENT_RECEIVED, PAYMENT_OVERDUE, PAYMENT_REFUNDED — with RequestContext bootstrapped from `webhook_events.organization_id` (BE)
- [ ] Dunning worker (daily): mark overdue invoices, queue reminder communications (BE)

#### Transactional emails (reuse Resend adapter from Sprint 1)

- [ ] Template: `InvoiceIssuedEmail` — sent when an invoice is created (BE)
- [ ] Template: `InvoiceOverdueEmail` — sent by dunning worker on overdue invoices (BE)
- [ ] Template: `PaymentReceivedEmail` — sent on webhook `PAYMENT_RECEIVED` confirmation (BE)
- [ ] Wire dunning worker to dispatch `InvoiceOverdueEmail` instead of the placeholder "reminder communications" (BE)

### Frontend (admin/staff)

#### Payment gateway connection
- [ ] Settings → Payments page: shows status (`Not connected`, `Active`, `Invalid`), masked `lastFour`, copyable webhook URL (FE)
- [ ] "Connect Asaas" dialog: pastes API key, calls validate endpoint, shows friendly error if invalid (FE)
- [ ] Inline explainer: "Don't have an Asaas account? Create one here" + link to Asaas signup (FE)
- [ ] Disconnect confirmation with strong copy ("This won't refund anyone; future invoices will fail until you reconnect") (FE)
- [ ] Banner across the app when gateway is not connected: "Connect your Asaas account to start billing → [Connect]" (FE)
- [ ] Disable invoice/enrollment-with-subscription actions when gateway is missing, with tooltip explaining why (FE)

#### Invoicing & payments
- [ ] Invoices list with filters (status, due range, school, student) (FE)
- [ ] Invoice detail with payment history + actions: cancel only — refund is processed manually in the Asaas dashboard (see ADR 0010) (FE)
- [ ] Manual payment dialog (FE)
- [ ] Defaulters list (FE)
- [ ] Revenue widget on dashboard (this month, last month, YoY) (FE)

### Frontend (guardian portal)

- [ ] Invoices list for guardian's dependents (FE)
- [ ] Invoice detail with Pix QR + copy link (FE)
- [ ] Payment confirmation page (FE)
- [ ] Payment history (FE)

### Tests

- [ ] Unit tests for invoice / payment / subscription use cases (BE)
- [ ] Unit tests for `PaymentGatewayFactory` resolution and caching (BE)
- [ ] Unit tests for `AsaasAdapter` with HTTP mocks (BE)
- [ ] Integration test: connect-flow rejects invalid API key with `PAYMENT_GATEWAY_INVALID_CREDENTIALS` (BE)
- [ ] Integration test: billing endpoints return `422 PAYMENT_GATEWAY_NOT_CONNECTED` when gateway is missing (BE)
- [ ] Integration tests for webhook handlers with replayed Asaas fixtures (BE)
- [ ] Cross-tenant isolation: org A's webhook token cannot affect org B's data; org A's connected key never used for org B's calls (BE)
- [ ] Idempotency test: same webhook delivered twice → processed once (BE)
- [ ] Encrypted-at-rest test: `apiKey_encrypted` value in DB is unreadable without the key (BE)
- [ ] Playwright e2e: connect Asaas → enroll → invoice generated → webhook simulated → invoice marked paid → guardian sees it (FE)

**Sprint 5 retro:** _(fill in when done)_

---

## Sprint 6 — Internal notifications

**Goal:** Admin / staff / coach can post notifications targeted at the whole organization, a school, a class, or an individual guardian. Guardians see them inside the portal. Direct contact via WhatsApp is one click away wherever a guardian phone is shown (manual, no automation).

> **Scope note:** the original Sprint 6 (multi-channel marketing campaigns with templates, segmentation, scheduling and provider-tracked delivery via Resend + Z-API) is moved to the backlog. This sprint replaces it with the minimum needed to communicate inside the platform. See ADR 0009.

### Backend

- [ ] Migration: `notifications` table — `id`, `organization_id`, `audience_type` (`ALL_ORG` | `SCHOOL` | `CLASS` | `INDIVIDUAL_GUARDIAN`), `school_id` (nullable), `class_id` (nullable), `guardian_id` (nullable), `created_by_user_id`, `title`, `body`, `created_at`, `deleted_at` (BE)
- [ ] Migration: `notification_reads` table — `notification_id`, `guardian_id`, `read_at`, PK on the pair (BE)
- [ ] Composite indexes leading with `organization_id` (BE)
- [ ] `notifications` module — entity, abstract repository, TypeORM repository (BE)
- [ ] Use case: `CreateNotification` with audience consistency check (school / class / guardian must belong to caller's org and lie within their scope) (BE)
- [ ] Use case: `ListNotificationsForGuardian` — resolves notifications visible to the calling guardian based on linked students' org / school / class membership (BE)
- [ ] Use case: `MarkNotificationAsRead` (BE)
- [ ] Use case: `ListSentNotifications` — admin / staff / coach list with `readCount / totalRecipients` aggregated per row (BE)
- [ ] Use case: `GetNotificationReadStatus` — drill-down: which guardians read, which didn't, with phone numbers for the click-to-WhatsApp helper (BE)
- [ ] Use case: `SoftDeleteNotification` (BE)
- [ ] Ownership resolvers: `own-org`, `own-school`, `own-class` (BE)
- [ ] Permission seeds: `notification:create`, `notification:read`, `notification:delete` mapped to the right roles (BE)
- [ ] Audit log entries on create and delete (BE)

### Frontend — guardian portal

- [ ] Bell icon in the guardian header with unread count, polled every 60s while the tab is visible (FE)
- [ ] Dropdown shows the last 5 notifications with relative time (FE)
- [ ] `/avisos` page: full notification list with infinite scroll (FE)
- [ ] Notification expanded view (inline or detail page) auto-marks as read on open (FE)

### Frontend — admin / staff / coach

- [ ] `/comunicados` page: list of sent notifications with `lidas / total` counter per row (FE)
- [ ] "Novo comunicado" form with audience picker:
  - [ ] Toda a organização (ADMIN / ORG_STAFF only) (FE)
  - [ ] Escola — dropdown scoped to user's schools (FE)
  - [ ] Turma — dropdown scoped to user's schools, with search (FE)
  - [ ] Responsável específico — name search (FE)
- [ ] Title + body fields with simple validation (FE)
- [ ] Notification detail page with read / unread breakdown table (FE)
- [ ] On unread rows: click-to-WhatsApp button (uses the helper delivered in Sprint 3) pre-filled with a follow-up message template (FE)
- [ ] Soft-delete notification with confirmation (FE)

### Tests

- [ ] Unit tests for all use cases (BE)
- [ ] Unit tests for audience visibility logic: notification posted to class C is visible to guardians of students enrolled in C and only them (BE)
- [ ] Cross-tenant isolation: org A admin cannot post to org B; guardian of org A cannot list notifications of org B (BE)
- [ ] Permission matrix: SCHOOL_STAFF cannot post `ALL_ORG`; COACH can only post `CLASS` for classes they coach (BE)
- [ ] Playwright e2e: admin posts notification → guardian sees it in bell → opens → admin sees read count increment (FE)
- [ ] Playwright e2e: admin opens read-status drill-down → click-to-WhatsApp opens `wa.me` URL with correct number (FE)

**Sprint 6 retro:** _(fill in when done)_

---

## Sprint 7 — MVP polish and launch

**Goal:** Close the MVP. Home dashboards for both admin and guardian, basic legal pages, critical error states, performance and security smoke, deploy to production.

> **Scope note:** the original Sprint 7 (full reports, pre-enrollment funnel, CSV import, LGPD operational endpoints, white-label configuration UI, audit log UI, queue dashboard, onboarding wizard, Lighthouse hardening, public docs) is moved to the backlog. This sprint replaces it with the minimum needed to put a working product in production. See ADR 0010.

### Home dashboards

- [ ] Admin home: 4 KPI cards — active students, monthly revenue, defaulters (count + amount), upcoming classes (today + tomorrow) (FE)
- [ ] Each card links to its underlying list (FE)
- [ ] Lightweight aggregator queries for the 4 KPIs (no read-model machinery yet) (BE)
- [ ] Guardian home: unread notifications + next class per dependent + open invoices with pay action (FE)

### Legal essentials

- [ ] Public privacy policy page (template content, lawyer review pre-launch) (FE)
- [ ] Public terms of service page (template content, lawyer review pre-launch) (FE)
- [ ] Footer links from public pages to privacy and terms (FE)

### Critical error / empty states

- [ ] Empty states on the main list pages (students, classes, invoices, notifications, defaulters, attendance) (FE)
- [ ] 404 and 500 pages (FE)
- [ ] 403 page with "voltar" CTA (FE)
- [ ] Silent-refresh failure → friendly redirect to `/login` (already wired in Sprint 2; verify) (FE)

### Performance and security smoke

- [ ] N+1 query hunt on the heaviest endpoints: students list, invoices list, attendance history, defaulters list (BE)
- [ ] Verify required composite indexes lead with `organization_id` on hot tables (BE)
- [ ] Helmet CSP reviewed for production (INF)
- [ ] Rate limits in place on auth + webhook endpoints (BE)
- [ ] Secrets rotated for production (INF)

### Deploy

- [ ] Production environment provisioned (DB, Redis, app, web) (INF)
- [ ] Migrations applied to production (INF)
- [ ] DNS + TLS confirmed (INF)
- [ ] Backups configured and a manual restore drill performed on a staging clone (INF)
- [ ] Sentry production project wired for both api and web (BE/FE)
- [ ] Health checks `/health` and `/health/ready` passing under real traffic (INF)
- [ ] End-to-end smoke test in production: signup org → invite staff → create student → enroll → take attendance → guardian pays first invoice → admin sees revenue update (FE/BE)

### Tests

- [ ] Final cross-tenant isolation sweep across all production endpoints (BE)
- [ ] Performance smoke: 1k students seed → list page p95 < 2s (FE)

**Sprint 7 retro:** _(fill in when done)_

---

## Launch checklist (post-Sprint 7, pre-production)

- [ ] All sprints' items `[x]`.
- [ ] Penetration smoke test (manual, with checklist from `04-SECURITY_AND_LGPD.md`).
- [ ] All env vars set in production secret manager.
- [ ] DNS + TLS confirmed.
- [ ] Backups confirmed and a restore drill performed within 30 days.
- [ ] Status page or runbook for "if API is down."
- [ ] Owner-facing operations docs: how to refund, how to anonymize, how to handle a breach (DOC).
- [ ] One real test customer (the owner's school) migrated end-to-end.
- [ ] First production audit log entries reviewed.

---

## Backlog (post-MVP / undecided)

Add items here when discovered during the MVP; **do not** silently expand sprint scope.

- [ ] **Marketing campaigns and transactional message ledger** (the original Sprint 6 — see ADR 0009 for why it was deferred):
  - [ ] Resend adapter implementing `EmailSenderPort` (keep as separate dependency if not yet built for transactional emails in earlier sprints)
  - [ ] Z-API adapter implementing `WhatsAppSenderPort`
  - [ ] `communication-templates` module — CRUD with placeholders
  - [ ] `communications` module — entity, send use case, recipient ledger
  - [ ] Segmentation builder: filter by school, class, status, defaulter, age group
  - [ ] Saved custom recipient groups (named segments)
  - [ ] `communication_recipients` status updates from provider webhooks
  - [ ] Communication consent enforcement (marketing requires `marketing` consent)
  - [ ] Rate limiting per channel per organization
  - [ ] Templates list + editor with placeholder picker + preview
  - [ ] New communication wizard: channel, template, audience, schedule, preview
  - [ ] Communication history with delivery status drill-down
- [ ] **Notification delivery beyond in-app pull** (extends Sprint 6):
  - [ ] Email push: send "you have a new notice" email when a notification is posted (reuses Resend adapter)
  - [ ] Web push (PWA) for notifications
- [ ] **MVP-deferred features** (the original Sprint 7 contents and a few items pulled out of Sprints 3-5 — see ADR 0010 for why):
  - [ ] Full reports dashboard — read models / queries for total students, defaulters, attendance %, monthly revenue, MoM growth, class occupancy, plus widgets and per-report CSV export
  - [ ] "Students at risk" report (rule: absent ≥ 3 sessions in 30 days OR overdue ≥ 30 days)
  - [ ] CSV import — `imports` module + queue + worker, parser with row-level errors, templates for students/guardians/enrollments, admin upload UI with progress and partial-success handling
  - [ ] Public pre-enrollment form under `/[org-slug]/pre-enroll` + `enrollment_requests` module + admin queue UI + "lead arrived" notification
  - [ ] LGPD `me/data-export` endpoint + worker (JSON + PDF) + guardian portal request and download UI
  - [ ] Daily anonymization job (24-month retention)
  - [ ] Cookie consent banner
  - [ ] White-label configuration UI (Settings → Brand): brand colors form with live preview, contrast validation, preset palettes, logo upload + SVG sanitization, favicon upload / auto-generation, save endpoint with audit log, theme applied to React Email templates and PDFs, WhatsApp message prefix, cross-tab broadcast on theme save
  - [ ] Audit log admin UI (filters, diff view, CSV export)
  - [ ] Queue dashboard at `/admin/queues` (ADMIN only)
  - [ ] Onboarding wizard (polished first-login experience)
  - [ ] Email templates final design pass
  - [ ] Lighthouse hardening (≥ 90 perf, ≥ 95 a11y on key pages)
  - [ ] Public docs page (FAQ + getting started)
  - [ ] Anonymize student admin UI (backend use case already shipped in MVP; only UI is deferred)
  - [ ] Invoice refund admin UI (refund processing deferred — admin uses Asaas dashboard in MVP)
  - [ ] Attendance offline support (queued sync) for the coach mobile UI
- [ ] Native mobile app (React Native or Capacitor wrapper)
- [ ] MFA/2FA activation (schema is already there)
- [ ] Student login
- [ ] Photo / video gallery per student (LGPD: explicit photo consent already supported)
- [ ] Event RSVPs (games, tournaments)
- [ ] Student assessments / evolution tracking
- [ ] ICP-Brasil signatures (post if customers demand)
- [ ] Document upload in enrollment flow
- [ ] In-flow enrollment payment (pay during enrollment)
- [ ] Gamification (badges, streaks)
- [ ] AI assistants (insights, draft communications)
- [ ] Multiple payment gateways (Stripe, Pagar.me, Mercado Pago adapters) — port + factory are already in place; only the adapters need writing
- [ ] Custom roles via UI
- [ ] Prometheus/Grafana metrics
- [ ] White-label tier 2: **custom domain** per tenant (Cloudflare for SaaS, TLS automation, DNS verification)
- [ ] White-label tier 2: **email "From" with tenant domain** (Resend domain verification per tenant, DKIM/SPF)
- [ ] White-label tier 2: **hide "Powered by SchoolHub"** as a paid feature
- [ ] White-label tier 2: **dark mode** as tenant-level toggle (derive dark equivalents from brand colors)
- [ ] White-label tier 2: **per-school branding** (currently per-Organization)
- [ ] Read replica for reports
- [ ] Multi-tenancy SSO (per-org)
- [ ] White-label / branded portal per school
- [ ] Mobile app for guardians (push notifications)
- [ ] WhatsApp two-way conversation (replies)
- [ ] Calendar integrations (Google/Apple Calendar feeds for classes)
- [ ] Coach payroll / hours tracking
