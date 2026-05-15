# 01 — Architecture and conventions

> **When to read:** Before writing any code or designing any module.
> **TL;DR:** Multi-tenant SaaS for sports schools, multi-school-per-org. Turborepo monorepo. NestJS API + Next.js web. Clean Architecture per module. Multi-tenancy via `organization_id` + AsyncLocalStorage. Single source of truth for types in `@school/shared`. Conventional Commits, kebab-case files, strict TS.

---

## Part A — Project overview

### What we are building

A web platform (PWA) for sports schools to manage their entire operation:

- **Roster:** students, guardians, classes, coaches.
- **Operations:** attendance, scheduling, communications.
- **Money:** enrollment fees, monthly tuition, automatic billing (Pix, boleto, subscription).
- **Compliance:** LGPD-grade data handling for minors.
- **White-label:** each tenant brands the app with their own colors, logo, and name.

The initial client has 50 students; the product is built **multi-tenant from day one** so it can be sold to other schools without rework.

### Domain hierarchy

```
Organization
  └── School (physical unit)
        └── SchoolModality (modality offered by this unit, with its own pricing)
              └── Class (specific group with schedule, capacity, coach)
                    └── Enrollment (student ↔ class link)
                          └── Invoices, Attendance, Communications, ...
```

Key invariants:

- A **Student** belongs to the Organization, not a School. They can be enrolled in multiple schools/modalities.
- A **Modality** is a catalog item at the Organization level (e.g. "Football", "Volleyball").
- A **SchoolModality** is the offering of a modality by a specific School, with that unit's pricing.
- A **Class** belongs to one SchoolModality and can override the price.
- An **Enrollment** snapshots the price at the moment it's created, so changing the Modality/Class price later does not retroactively affect existing enrollments.

### Personas

| Role | Scope | Primary use cases |
|------|-------|-------------------|
| **ADMIN** | Whole Organization | Setup, full control, financial decisions, invites, branding |
| **ORG_STAFF** | Whole Organization (operational) | Day-to-day across all schools, cannot delete or refund |
| **SCHOOL_STAFF** | Specific Schools they're assigned to | Day-to-day for their unit(s) |
| **COACH** | Specific Classes they're assigned to | Attendance, class-level communication |
| **GUARDIAN** | Their dependents (Students linked via StudentGuardian) | View child's data, payments, communications, pay invoices |

**Students do not have login in the MVP** — simplifies permissions and LGPD handling for minors.

### Key qualities (the bar)

| Quality | What this means concretely |
|---------|----------------------------|
| **Correct** | Use cases tested with >90% coverage. Data integrity protected at multiple layers. |
| **Secure** | LGPD-grade encryption of PII. Auth via HTTP-only cookies + rotating refresh. Audit log of everything. |
| **Tenant-isolated** | Impossible for org A to see org B's data, by construction. Defense in depth. |
| **Brandable** | Each tenant configures their own primary + accent colors, logo, favicon, and brand name; theming applies across app, login, emails, and PDFs. |
| **Maintainable** | Clean Architecture per module. Single source of truth for types (Zod). |
| **Operable** | Health checks, structured logs, error tracking, daily backups. |

### Non-goals for the MVP

Explicitly **out of scope** to keep focus:

- Native mobile apps (PWA covers it)
- Active MFA/2FA (schema is ready, activation is post-MVP)
- Student login
- Photo/video gallery for students
- Event RSVPs (games, tournaments)
- Student assessments / evolution tracking
- ICP-Brasil digital signatures
- Document upload in the enrollment flow
- In-flow enrollment payment (pay after admin approves)
- Gamification
- AI features
- Multiple payment gateways (only Asaas)
- Custom roles via UI (seeded versioning is enough)
- Prometheus/Grafana (structured logs + Sentry)
- Custom domain per tenant (Tier 2 of white-label, post-MVP)
- Email "From" with tenant's domain (post-MVP)
- Dark mode (post-MVP)

Anything above goes into the post-MVP backlog in `09-SPRINTS.md`.

---

## Part B — System architecture

### Monorepo layout

```
school-platform/
├── apps/
│   ├── api/                      NestJS backend
│   └── web/                      Next.js frontend
├── packages/
│   ├── shared/                   @school/shared — Zod schemas, types, theming, permissions
│   ├── ui/                       @school/ui — shared React components
│   ├── eslint-config/            @school/eslint-config
│   └── tsconfig/                 @school/tsconfig
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── docs/
```

- **Build orchestration:** Turborepo with caching.
- **Package manager:** pnpm (workspaces).
- **Node version:** 20 LTS, enforced via `.nvmrc` and `engines` field.
- **TypeScript:** strict throughout. No `any`, no `@ts-ignore` without justification.

### API module structure (Clean Architecture)

Every business module in `apps/api/src/modules/<feature>` follows:

```
modules/<feature>/
├── domain/
│   ├── entities/             Business rules + TypeORM @Entity decorators
│   ├── value-objects/        Immutable types with validation (e.g. Money, Email, CPF)
│   ├── events/               Domain events (e.g. EnrollmentCreatedEvent)
│   └── repositories/         Abstract classes (interfaces) — no TypeORM imports
├── application/
│   ├── use-cases/            One file per use case, single execute() method
│   ├── services/             Cross-use-case orchestration (only when needed)
│   ├── ports/                Abstract interfaces for external systems (mailer, gateway)
│   └── dtos/                 Application-layer DTOs (input/output of use cases)
├── infrastructure/
│   ├── repositories/         TypeORM implementations of domain/repositories
│   ├── persistence/          Migrations specific to this module (or root /migrations)
│   ├── adapters/             Concrete implementations of application/ports
│   └── mappers/              Entity ↔ Persistence model mapping (if needed)
└── presentation/
    ├── controllers/          HTTP entry points
    ├── http-dtos/            DTOs annotated with class-validator + Swagger
    ├── presenters/           Format domain objects for HTTP responses
    └── <feature>.module.ts   NestJS module declaration
```

#### Dependency direction (strict)

```
presentation ──► application ──► domain ◄── infrastructure
```

Rules:
- `domain` imports **nothing** from other layers.
- `application` imports only from `domain`.
- `infrastructure` may import from `domain` and `application` (to implement their ports).
- `presentation` imports from `application` (use cases) and `domain` (types).

Enforced by ESLint `import/no-restricted-paths`. See `05-BACKEND_GUIDE.md`.

#### Why this structure

- **Testability:** use cases are pure TS — instantiable with fakes, runnable without booting Nest.
- **Replaceability:** swap TypeORM for another ORM by changing only `infrastructure/`.
- **Clarity:** new contributors find the same shape in every module.

### Module catalog (planned for MVP)

| Module | Purpose |
|--------|---------|
| `auth` | Login, refresh, logout, signup org, invite, password reset, MFA scaffolding |
| `organizations` | Org CRUD, settings, theming (white-label) |
| `schools` | School CRUD per org |
| `modalities` | Org-level modality catalog |
| `school-modalities` | School ↔ Modality offering + pricing |
| `classes` | Class CRUD, coach assignment |
| `users` | User profile, role assignment, listing |
| `students` | Student CRUD with encrypted PII |
| `guardians` | Guardian CRUD with encrypted PII |
| `student-guardians` | The N:N link with attributes |
| `consents` | LGPD consent records |
| `enrollments` | Enroll, pause, cancel, resume |
| `attendance` | Sessions and records |
| `invoices` | Invoice lifecycle |
| `payments` | Payment lifecycle and reconciliation |
| `subscriptions` | Recurring billing state |
| `webhooks` | Gateway webhook ingestion |
| `notifications` | Internal pull-only notifications to guardians, scoped by org / school / class / individual (no external delivery — see ADR 0009) |
| `audit` | Audit log read API |
| `imports` | CSV import jobs |
| `enrollment-requests` | Public pre-enrollment requests + admin approval |
| `reports` | Read models for dashboards |

### Cross-cutting concerns (`apps/api/src/shared/`)

```
shared/
├── context/                  AsyncLocalStorage RequestContext + provider
├── decorators/               @CurrentUser, @RequirePermissions, @CheckOwnership, @Public, @IdempotencyKey
├── guards/                   AuthGuard, PermissionsGuard, OwnershipGuard, TenantGuard
├── interceptors/             AuditInterceptor, SchoolScopeInterceptor, IdempotencyInterceptor
├── filters/                  GlobalExceptionFilter
├── pipes/                    ZodValidationPipe (alternative to class-validator for some cases)
├── errors/                   DomainException + subclasses, error code catalog
└── crypto/                   Encryption transformer, search-hash helper
```

### Infrastructure layer (`apps/api/src/infrastructure/`)

```
infrastructure/
├── config/                   Env schema + ConfigModule
├── database/                 TypeORM DataSource, migration runner config
├── queues/                   BullMQ setup, queue tokens, worker registration
├── mail/                     Resend adapter
├── messaging/                Z-API (WhatsApp) adapter
├── storage/                  R2/S3 adapter (signed URLs)
├── payment-gateway/          Asaas adapter
└── health/                   Health checks
```

### Web app structure (Next.js App Router)

```
apps/web/src/
├── app/                      Routes (App Router)
│   ├── (public)/             Public marketing, signup, login
│   ├── (auth)/               Protected app — admin/staff/coach
│   │   ├── layout.tsx        Auth shell + school selector
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── classes/
│   │   └── ...
│   ├── (guardian)/           Guardian portal — separate UX
│   └── api/                  Route Handlers (proxy to NestJS, attach cookies)
├── components/
│   ├── ui/                   shadcn primitives (do not edit, regenerate)
│   ├── forms/                Form components (RHF + Zod)
│   ├── tables/               Data tables
│   └── feature-specific/     Co-located with features
├── lib/
│   ├── api/                  Typed HTTP client per resource
│   ├── auth/                 Cookie helpers, session checks
│   ├── permissions/          CASL ability builder (consumes @school/shared)
│   ├── theme/                Tenant theme resolver + <style> renderer (see 06-FRONTEND_GUIDE.md)
│   └── utils/                Formatting, currency, date
├── hooks/                    Custom hooks (useCurrentUser, useSchoolScope, etc)
└── locales/                  i18next/next-intl resources (pt-BR default)
```

### Shared package (`packages/shared`)

The **single source of truth** for types crossing the API boundary.

```
shared/src/
├── schemas/                  Zod schemas per resource
│   ├── student.schema.ts
│   ├── enrollment.schema.ts
│   ├── organization-theme.schema.ts
│   └── ...
├── types/                    Inferred types + helper types
├── constants/                Enums (RoleKey, EnrollmentStatus, etc)
├── permissions/              Permission catalog + CASL ability factory
├── theming/                  deriveTones, computeBrandTokens, contrastRatio, validateBrandColor
└── errors/                   Error code catalog (matches backend)
```

The Zod schema defines the shape. Backend uses `z.infer<typeof schema>` and a Zod pipe; frontend uses the same schema for form validation (RHF + zodResolver) and runtime parsing.

### Multi-tenancy

Full details in `03-AUTH_AND_PERMISSIONS.md`. Summary:

- Every business table has `organization_id`.
- Most have `school_id` (denormalized when applicable for fast scope filters).
- `AuthGuard` populates `RequestContext` with `organizationId`, `roles`, `permissions`, `scopedSchoolIds`, `coachedClassIds`, `guardianIds`.
- `TenantSubscriber` (TypeORM `EntitySubscriberInterface`) auto-sets `organization_id` on insert and adds `WHERE` clauses on read.
- `SchoolScopeInterceptor` filters `school_id IN (...)` for SCHOOL_STAFF.
- DB-level: composite indexes `(organization_id, id)`, FKs constrained.

### Async work

- **Redis + BullMQ** for queues.
- Queues registered as Nest providers with typed payloads.
- Workers live in `apps/api/src/modules/<feature>/infrastructure/workers/`.
- Dashboard at `/admin/queues` (ADMIN only).
- See `05-BACKEND_GUIDE.md` for retry/DLQ specifics.

### Build and deploy

- **Turborepo** caches lint/test/build per package.
- **CI:** GitHub Actions runs lint, typecheck, test on every PR. Deploys staging on `develop` push, prod on tag.
- **Containers:** API runs in a container (Railway/Fly). Web on Vercel.
- **Migrations:** separate CI job, runs **before** the app deploys.
- See `08-INFRASTRUCTURE.md`.

### Architectural decisions reference

For the "why" behind specific choices, see `10-DECISIONS.md`:

- 0001 — TypeORM over Prisma
- 0002 — Cookies HTTP-only with rotating refresh
- 0003 — Modality global with SchoolModality offering
- 0004 — Clean Architecture per module
- 0005 — Multi-tenancy via discriminator + AsyncLocalStorage
- 0006 — Shared Zod schemas as the contract
- 0007 — White-label via CSS variables with tenant derivation

---

## Part C — Conventions

### Language

- **Code, identifiers, comments, commits, PRs, docs:** English.
- **User-facing strings:** Portuguese (pt-BR) via i18n; English added later.

### File and folder naming

| Concern | Rule | Example |
|---------|------|---------|
| Folders | `kebab-case` | `school-modalities/` |
| Files | `kebab-case.<role>.<ext>` | `create-student.use-case.ts` |
| TypeScript classes | `PascalCase` | `class CreateStudentUseCase` |
| TypeScript types/interfaces | `PascalCase` | `type StudentResponseDto` |
| TypeScript variables/functions | `camelCase` | `const studentsRepo` |
| Constants | `SCREAMING_SNAKE_CASE` | `const MAX_PAGE_SIZE` |
| Enums | `PascalCase` for the enum, `SCREAMING_SNAKE_CASE` for values | `EnrollmentStatus.ACTIVE` |
| React components | `kebab-case` file exporting `PascalCase` symbol | `student-form.tsx` → `StudentForm` |
| React hooks | `useXxx` | `useAbility` |
| Test files | mirror source with `.spec.ts` or `.test.tsx` | `create-student.use-case.spec.ts` |

#### File-role suffixes (backend)

- `.entity.ts` — TypeORM entity (domain)
- `.value-object.ts` (or `.vo.ts`)
- `.repository.ts` — abstract (domain)
- `.typeorm.repository.ts` — TypeORM implementation
- `.in-memory.repository.ts` — fake for tests
- `.use-case.ts`
- `.dto.ts` — application DTO; `.http-dto.ts` for presentation
- `.controller.ts`, `.module.ts`
- `.event.ts`, `.handler.ts`
- `.port.ts` — abstract external system
- `.adapter.ts` — concrete external system
- `.guard.ts`, `.pipe.ts`, `.interceptor.ts`, `.filter.ts`, `.decorator.ts`
- `.migration.ts` — TypeORM CLI generates

### Database naming

- **Tables:** `snake_case` plural — `students`, `school_modalities`, `attendance_records`.
- **Columns:** `snake_case` — `organization_id`, `created_at`, `full_name_encrypted`.
- **Enums (DB-native or check):** `SCREAMING_SNAKE_CASE` values.
- **Indexes:** `idx_<table>_<columns>` — `idx_students_org_full_name_search`.
- **Foreign keys:** `fk_<table>_<column>`.
- **Constraints:** `chk_<table>_<rule>`.

### Commits — Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Refactor without behavior change |
| `perf` | Performance improvement |
| `test` | Test-only changes |
| `docs` | Documentation only |
| `chore` | Tooling, deps, CI |
| `build` | Build system / dep changes affecting build |
| `style` | Formatting (no logic) |
| `revert` | Revert of a previous commit |

Rules:
- Subject in **imperative mood, lowercase**, no trailing period.
- Subject under 72 chars.
- Scope is the module or area (`auth`, `students`, `infra`, `web`, `shared`).
- Body wrapped at 80 chars, explains the why.
- Breaking changes: `BREAKING CHANGE:` in the footer, plus `!` after type/scope.

Examples:
```
feat(auth): add refresh token rotation with reuse detection
fix(enrollments): prevent enrolling student in class of different school
refactor(students)!: split CreateStudentUseCase into Create + AttachGuardian
```

### Branch naming

`<type>/<sprint?>-<short-description>` — e.g. `feat/s1-auth-refresh-rotation`, `fix/s3-student-cpf-validation`, `chore/upgrade-nestjs-10`.

### Pull request description template

```markdown
## What
<concise summary>

## Why
<rationale; link to sprint item if applicable>

## How
<key implementation details, only what's non-obvious from the diff>

## Tests
<what tests were added and what they cover>

## Screenshots / recordings
<if UI changes>

## Checklist
- [ ] Definition of Done (docs/07-TESTING.md) satisfied
- [ ] docs/09-SPRINTS.md updated
- [ ] Affected docs updated
- [ ] Migrations reviewed and reversible (if any)
- [ ] No new permissions without seed updates
```

PR size: aim for under 400 net lines changed. Squash-and-merge into `develop` after CI is green.

### Code style

- **Prettier** with the shared config formats everything.
- **ESLint** with shared config enforces the rest.
- **No reformatting unrelated lines** in a feature PR.

### Imports (enforced by ESLint `import/order`)

1. Node built-ins
2. External packages
3. `@school/*` workspace packages
4. `@app/*` aliases (or `@/`)
5. Relative imports (`./`, `../`)

Inside each group: alphabetical.

### TypeScript style

- Prefer **named exports**; default exports only where required by frameworks.
- Prefer `type` for unions and aliases, `interface` for extensible object shapes.
- Prefer `readonly` for class fields not meant to be reassigned.
- **Discriminated unions** for state.
- Avoid `enum` unless needed at runtime; prefer `as const` literal unions.

### Comments

- **Prefer self-explanatory code** over comments.
- Comments explain **why**, not **what**.
- `// TODO:` only with a tracking item.
- `/** JSDoc */` for public-facing utilities and complex use cases.

### URLs and route names

- API URLs: `kebab-case` plural — `/api/v1/school-modalities`.
- App Router segments: `kebab-case`.

### Magic numbers / strings

Extract to `constants.ts` in the module. Cross-module constants go to `@school/shared/constants`.

### Git hygiene

- Don't commit IDE config files, OS junk, or build artifacts.
- Commit `pnpm-lock.yaml`.

### When in doubt

Match the existing pattern. If there isn't one, ask before inventing. Prefer the simpler option. Boring is good.
