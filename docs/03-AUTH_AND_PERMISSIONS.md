# 04 — Auth and authorization

> **When to read:** Any work touching auth, sessions, permissions, or multi-tenant scoping.
> **Prerequisites:** `01-ARCHITECTURE.md`, `02-DATA_MODEL.md`
> **TL;DR:** HTTP-only cookies + rotating refresh + sessions table for real revocation. RBAC with `.own-school` / `.own-class` / `.own` scopes resolved by ownership resolvers. Multi-tenancy enforced by AsyncLocalStorage + TypeORM subscriber.

---

## Authentication

### Dual-token cookie strategy

| Token | Type | Lifetime | Cookie |
|-------|------|----------|--------|
| Access | JWT (HS256), small payload | 15 min | `__Host-access` — HttpOnly, Secure, SameSite=Strict, Path=/ |
| Refresh | Opaque random (256-bit), stored as argon2id hash | 7 days | `__Host-refresh` — HttpOnly, Secure, SameSite=Strict, Path=/auth/refresh |

**Why:** access JWT removes hot-path DB lookups; refresh is opaque + DB-backed so we can actually revoke.

### Access token payload

```ts
{
  sub: string;                  // user id
  org: string;                  // organization id
  roles: RoleKey[];             // ['SCHOOL_STAFF']
  iat: number;
  exp: number;
  jti: string;                  // unique id
}
```

**What's NOT in the JWT:** permissions, scoped school ids, coached class ids, guardian ids. These are resolved per-request and cached in Redis to avoid bloating the token and to allow real-time revocation.

### Refresh rotation with reuse detection

```
1. Login        → create Session { family=new(), refresh_token_hash, expires_at }
                  set both cookies
2. /auth/refresh:
   a. Look up session by refresh hash
   b. If not found or revoked → 401, clear cookies
   c. If found AND replaced_by_id is set → REUSE DETECTED
      → revoke entire family (all sessions where family=session.family)
      → 401, clear cookies, log incident
   d. Else: create new session with same family, mark old as replaced
      issue new pair of cookies
3. Logout       → revoke session
4. Logout-all   → revoke all sessions where user_id = current
```

### Password hashing

- **argon2id** (`argon2` lib).
- Parameters: `memoryCost: 19456`, `timeCost: 2`, `parallelism: 1`. Adjust upward periodically.
- Re-hash on login if params changed.

### Password policy

- Minimum 10 characters.
- At least one letter, one digit.
- Blocklist of top 10k common passwords (zxcvbn or similar at signup time).
- Display realtime strength meter on frontend.

### Email verification

- Required before login (status `PENDING` → `ACTIVE` after verify).
- Verification token: 256-bit random, hashed in DB, 24h expiration.
- Endpoint `POST /auth/verify-email`.

### Password reset

- `POST /auth/forgot-password` — always returns 204 (no leak about email existence).
- Token: 256-bit random, hashed, 1h expiration, single-use.
- `POST /auth/reset-password` — accepts token + new password; revokes ALL sessions on success.

### MFA scaffolding (post-MVP activation)

- Schema: `users.mfa_enabled`, `users.mfa_secret_encrypted` (TOTP).
- Endpoint contracts ready in `apps/api/src/modules/auth/presentation/` (returning 501 NOT_IMPLEMENTED).
- Frontend reserves space for MFA challenge step.
- When activated, login returns `{ requiresMfa: true, mfaChallengeToken }` and a follow-up `/auth/mfa/verify` consumes it.

### CSRF

- `SameSite=Strict` covers modern browsers.
- Defense-in-depth: mutating requests must include header `X-Requested-With: school-platform`. Backend rejects mutations without it (returns 403). Browsers don't send this header on simple cross-site requests.

### Rate limiting (auth-specific)

| Endpoint | Limit |
|----------|-------|
| `POST /auth/login` | 5/min per IP, 20/hr per email |
| `POST /auth/refresh` | 10/min per IP |
| `POST /auth/forgot-password` | 3/hr per IP, 3/day per email |
| `POST /auth/verify-email` | 10/hr per IP |

## Authorization model

### RBAC + scopes

Two layers:

1. **Role-based capabilities** (broad): does this user have permission X at all?
2. **Ownership scope** (narrow): if the permission is scoped (`.own-school`, `.own-class`, `.own`), is *this specific resource* in scope?

### Roles

```ts
type RoleKey = 'ADMIN' | 'ORG_STAFF' | 'SCHOOL_STAFF' | 'COACH' | 'GUARDIAN';
```

A user can hold multiple roles **except** within the staff hierarchy (mutually exclusive: ADMIN xor ORG_STAFF xor SCHOOL_STAFF). COACH and GUARDIAN can be combined with any.

Examples:
- An ADMIN who also coaches a class: `[ADMIN, COACH]`
- A parent who also works at the front desk: `[SCHOOL_STAFF, GUARDIAN]`

### Permissions

Permissions follow the format `resource:action[.scope]`. The scope suffix indicates the **ownership resolver** that must approve the resource.

Examples:
- `student:read` — read any student in the org (no resolver needed beyond tenant)
- `student:read.own-school` — read students enrolled in schools the user is staff of
- `student:read.own` — read students linked to this user as guardian

See `02-DATA_MODEL.md` for the full glossary of scope suffixes.

### Permission catalog

(Full catalog also seeded in DB; this list is the authoritative source.)

```
# Organization
organization:read
organization:update

# School
school:create
school:read
school:read.own-school
school:update
school:delete

# Modality
modality:create
modality:read
modality:update
modality:delete

# SchoolModality
school-modality:create
school-modality:create.own-school
school-modality:read
school-modality:read.own-school
school-modality:update
school-modality:update.own-school
school-modality:delete
school-modality:delete.own-school

# Class
class:create
class:create.own-school
class:read
class:read.own-school
class:read.own
class:update
class:update.own-school
class:delete
class:delete.own-school
class:assign-coach
class:assign-coach.own-school

# User & roles
user:create
user:read
user:read.own-school
user:update
user:delete
user:invite
user:impersonate
role:read
role:assign

# Student
student:create
student:create.own-school
student:read
student:read.own-school
student:read.own
student:update
student:update.own-school
student:update.own
student:delete
student:delete.own-school
student:export
student:anonymize

# Guardian
guardian:create
guardian:create.own-school
guardian:read
guardian:read.own-school
guardian:read.own
guardian:update
guardian:update.own-school
guardian:update.own
guardian:delete

# Enrollment
enrollment:create
enrollment:create.own-school
enrollment:read
enrollment:read.own-school
enrollment:read.own
enrollment:update
enrollment:update.own-school
enrollment:cancel
enrollment:cancel.own-school

# Attendance
attendance:create
attendance:create.own-school
attendance:create.own-class
attendance:read
attendance:read.own-school
attendance:read.own

# Finance
invoice:create
invoice:create.own-school
invoice:read
invoice:read.own-school
invoice:read.own
invoice:cancel
invoice:cancel.own-school
invoice:refund
payment:create
payment:create.own-school
payment:read
payment:read.own-school
payment:read.own
payment:refund
subscription:read
subscription:read.own-school
subscription:pause
subscription:pause.own-school
subscription:cancel
subscription:cancel.own-school

# Communications
communication-template:create
communication-template:create.own-school
communication-template:read
communication-template:read.own-school
communication-template:update
communication-template:update.own-school
communication-template:delete
communication:send
communication:send.own-school
communication:send.own-class
communication:read
communication:read.own-school
communication:read.own

# Imports
import:create
import:create.own-school
import:read
import:read.own-school

# Reports
report:read
report:read.own-school
report:export

# Audit
audit:read
audit:read.own-school

# Settings
settings:read
settings:update

# Branding (white-label)
brand:read
brand:update

# Payment gateway (per-tenant Asaas account)
payment-gateway:read
payment-gateway:connect
payment-gateway:disconnect
```

### Role → Permission matrix

See `PROJECT_PLAN.md` §7 (preserved for historical reference). The current authoritative
matrix is in the **seed file** at `apps/api/src/infrastructure/database/seeds/role-permissions.seed.ts`.

Tightened summary:

| Permission family | ADMIN | ORG_STAFF | SCHOOL_STAFF | COACH | GUARDIAN |
|-------------------|:-----:|:---------:|:------------:|:-----:|:--------:|
| `organization:update`, `school:create/delete`, `settings:update`, `brand:update`, `payment-gateway:connect`, `payment-gateway:disconnect`, `*:refund`, `student:anonymize`, `user:impersonate` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `school:update`, `user:invite (staff/coach/guardian)`, `role:assign (non-admin)` | ✅ | ✅ | ❌ | ❌ | ❌ |
| Org-wide CRUD on people/finance/comms | ✅ | ✅ | ❌ | ❌ | ❌ |
| `*.own-school` (CRUD restricted to assigned schools) | ✅¹ | ✅¹ | ✅ | ❌ | ❌ |
| `class:read.own`, `attendance:create.own-class`, `communication:send.own-class` | ✅¹ | ✅¹ | ✅¹ | ✅ | ❌ |
| `*.own` (own children's data) | ❌ | ❌ | ❌ | ❌ | ✅ |

¹ ADMIN/ORG_STAFF/SCHOOL_STAFF inherit narrower scopes implicitly via broader perms.

### Ownership resolvers

Registered per resource in a registry. Cached in Redis with `TTL=60s` (key: `ownership:{userId}:{resource}:{resourceId}:{scope}`).

```ts
interface OwnershipResolver {
  canAccess(
    scope: 'own-school' | 'own-class' | 'own',
    resourceId: string,
    ctx: RequestContext,
  ): Promise<boolean>;
}
```

#### Student resolver

```sql
-- own-school: any enrollment in scoped schools
SELECT 1 FROM enrollments
 WHERE student_id = :studentId
   AND school_id = ANY(:scopedSchoolIds)
   AND organization_id = :orgId
 LIMIT 1;

-- own: this guardian is linked
SELECT 1 FROM student_guardians sg
  JOIN guardians g ON g.id = sg.guardian_id
 WHERE sg.student_id = :studentId
   AND g.user_id = :currentUserId
   AND sg.organization_id = :orgId
 LIMIT 1;
```

#### School resolver (own-school)
`staff_schools` lookup. O(1).

#### Class resolver (own)
`coach_classes` lookup. O(1).

#### Invoice / Payment / Enrollment / Attendance resolvers
Use denormalized `school_id` on the resource for `own-school`. For `.own`, traverse to Student → Guardian.

## Multi-tenancy enforcement

### Layer 1 — Request context

`AuthGuard` decodes the access JWT and populates:

```ts
RequestContext.set({
  userId,
  organizationId,
  roles,                     // from JWT
  permissions,               // from Redis cache, fetched if missing
  scopedSchoolIds,           // from staff_schools, if SCHOOL_STAFF
  coachedClassIds,           // from coach_classes, if COACH
  guardianIds,               // from guardians where user_id=userId, if GUARDIAN
});
```

Stored in `AsyncLocalStorage` (Node 16+). Every async operation inside the request sees the same context.

### Layer 2 — TypeORM subscriber

A global `TenantSubscriber` implements `EntitySubscriberInterface`:

```ts
beforeInsert(event) {
  if (entityHasOrganizationId(event.entity)) {
    if (!event.entity.organizationId) {
      event.entity.organizationId = ctx.organizationId;
    } else if (event.entity.organizationId !== ctx.organizationId) {
      throw new ForbiddenException('Cross-tenant write blocked');
    }
  }
}
```

For reads, the recommended pattern is **explicit** `andWhere('e.organization_id = :orgId')` in repositories. **Do not rely on subscriber-only filtering for reads** — it's a defense layer, not the primary one. Subscriber adds it if missing as a safety net and logs a warning.

### Layer 3 — School scope interceptor

For SCHOOL_STAFF, applies `WHERE school_id = ANY(:scopedSchoolIds)` to queries on tables that have `school_id`. Implemented via QueryBuilder-aware decorator on repositories.

### Layer 4 — DB constraints

- Composite FKs where applicable.
- Triggers that validate `organization_id` consistency across joins (e.g. `enrollments.school_id` and `enrollments.class_id` must reference rows with matching `organization_id`).

### Layer 5 — Tests

Multi-tenancy isolation is covered by **dedicated integration tests** that try to leak data across tenants and expect failure. Run on every CI build. See `07-TESTING.md`.

## Implementation patterns

### Controllers

```ts
@Controller({ path: 'students', version: '1' })
@UseGuards(AuthGuard, PermissionsGuard, OwnershipGuard, TenantGuard)
export class StudentsController {
  constructor(private readonly findStudent: FindStudentUseCase) {}

  @Get(':id')
  @RequirePermissions('student:read', 'student:read.own-school', 'student:read.own')
  @CheckOwnership({ resource: 'student', paramName: 'id' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StudentResponseDto> {
    const student = await this.findStudent.execute({ id, user });
    return StudentPresenter.toHttp(student);
  }
}
```

- `@RequirePermissions(...keys)` is **OR**: user with any of these proceeds. The matched permission's scope determines what `OwnershipGuard` checks.
- `@CheckOwnership` registers the resolver to invoke.
- `@CurrentUser` injects the typed `AuthUser` from RequestContext.
- `@Public` opts an endpoint out of `AuthGuard` (e.g. signup, webhooks).

### Permission cache invalidation

- On `UserRole` change → `DEL perms:user:{userId}`.
- On `StaffSchool` / `CoachClass` change → `DEL ownership:{userId}:*` and `DEL scopes:{userId}`.
- TTLs: `perms:user:*` = 5min, `ownership:*` = 60s, `scopes:*` = 5min.

### Frontend mirror (CASL)

`@school/shared/permissions/ability.ts` exports `defineAbilityFor(user)`. The web app builds this on login (from `/auth/me` response). Used **only for UX** — hiding buttons, gating routes:

```tsx
<Can I="update" a="Student" this={student}>
  <Button onClick={openEdit}>Edit</Button>
</Can>
```

**Server-side check is authoritative.** Frontend hiding is convenience; it must never be the only enforcement.

## Onboarding flows

### New organization (admin signup)

1. `POST /auth/signup-organization` with `{ organizationName, adminName, email, password, acceptTerms: true }`.
2. Creates `organizations`, creates `users` (status PENDING), creates `user_roles` (ADMIN).
3. Emits verification email with token.
4. User clicks link → `POST /auth/verify-email` → status ACTIVE.
5. First login redirects to onboarding wizard (create first school, modalities, terms).

### Inviting staff/coach

1. ADMIN/ORG_STAFF: `POST /invites` with `{ email, role, schoolIds? }`.
2. Creates `invites` row with hashed token, sends email with link.
3. Invitee `POST /auth/accept-invite` with `{ token, name, password }`.
4. Creates `users` (ACTIVE, emailVerifiedAt=now), `user_roles`, `staff_schools` (if SCHOOL_STAFF).
5. Marks `invites.accepted_at`.

### Inviting a guardian (automatic on guardian creation)

1. Staff registers a Guardian with email.
2. System auto-creates an `invites` row with context `{ guardian_id }`.
3. Sends a welcome email: "Your child has been enrolled at X — set your password to access the portal."
4. Guardian accepts → creates `users`, links via `guardians.user_id`, assigns GUARDIAN role.
