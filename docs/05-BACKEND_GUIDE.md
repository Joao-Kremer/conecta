# 05 — Backend guide

> **When to read:** Before writing or modifying any backend code, designing an endpoint, debugging an API issue, or setting up logging/monitoring.
> **Prerequisites:** `01-ARCHITECTURE.md`, `02-DATA_MODEL.md`, `03-AUTH_AND_PERMISSIONS.md`
> **TL;DR:** NestJS + TypeORM. Clean Architecture per module. Use cases are single-method classes. Repositories abstract in domain, concrete in infrastructure. Validate at the edge with Zod. REST with versioned URLs, standard error shape, idempotency on side-effecting mutations. Pino + Sentry + AuditLog for observability.

---

## TypeScript configuration

`packages/tsconfig/base.json` is the source of truth. Highlights:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

`apps/api/tsconfig.json` extends and adds path aliases:
```json
"paths": {
  "@/*": ["src/*"],
  "@shared/*": ["src/shared/*"]
}
```

## Module skeleton

Every business module under `apps/api/src/modules/<feature>` follows this structure (see `01-ARCHITECTURE.md`). When creating one, copy the existing `students` module as a starting template (after Sprint 3 lands it).

### Domain layer

**Entities**:

```ts
// modules/students/domain/entities/student.entity.ts
import { Entity, PrimaryColumn, Column, ... } from 'typeorm';

@Entity({ name: 'students' })
export class Student {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({
    name: 'full_name_encrypted',
    type: 'text',
    transformer: createEncryptedTransformer(),
  })
  fullName!: string;

  @Column({ name: 'full_name_search', type: 'text' })
  fullNameSearch!: string;

  // ...

  // Behavior — invariants live here:
  enroll(class: Class, monthlyFee: Money, startDate: Date): Enrollment {
    if (this.status !== 'ACTIVE') {
      throw new StudentInactiveError(this.id);
    }
    return Enrollment.create({ studentId: this.id, classId: class.id, monthlyFee, startDate });
  }
}
```

**Rules:**
- Entity files can import TypeORM decorators (we accept this pragmatic coupling) but no infrastructure-specific code.
- Domain methods enforce invariants. Throwing `DomainException` subclasses (never raw `Error`).
- Constructors are private when invariants matter. Use static `create()` factory.

**Value objects**:

```ts
// modules/finance/domain/value-objects/money.vo.ts
export class Money {
  private constructor(public readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isInteger(cents) || cents < 0) {
      throw new InvalidMoneyError(cents);
    }
    return new Money(cents);
  }

  add(other: Money): Money { return new Money(this.cents + other.cents); }
  equals(other: Money): boolean { return this.cents === other.cents; }
}
```

**Repositories (abstract)**:

```ts
// modules/students/domain/repositories/students.repository.ts
export abstract class StudentsRepository {
  abstract findById(id: string): Promise<Student | null>;
  abstract findBySearch(q: string, scope: ListScope): Promise<Student[]>;
  abstract save(student: Student): Promise<void>;
}
```

No TypeORM imports here. Pure interface.

### Application layer

**Use cases**:

```ts
// modules/students/application/use-cases/create-student.use-case.ts
@Injectable()
export class CreateStudentUseCase {
  constructor(
    private readonly students: StudentsRepository,
    private readonly consents: ConsentsRepository,
    private readonly eventBus: DomainEventBus,
  ) {}

  async execute(input: CreateStudentInput): Promise<Student> {
    const consent = await this.consents.findActive({
      guardianId: input.primaryGuardianId,
      purpose: 'data_processing',
    });
    if (!consent) throw new ConsentRequiredError();

    const student = Student.create({
      fullName: input.fullName,
      birthDate: input.birthDate,
      // ...
    });

    await this.students.save(student);
    this.eventBus.publish(new StudentCreatedEvent(student));
    return student;
  }
}
```

**Rules:**
- One use case per file. One public method: `execute(input): Promise<output>`.
- Use cases inject **abstract repositories** and **ports** — not TypeORM repositories directly.
- Input/output types declared next to the class or in a `dtos/` subfolder.
- No HTTP, no decorators (other than `@Injectable`), no database details.

**Ports (interfaces for external systems)**:

```ts
// modules/communications/application/ports/email-sender.port.ts
export abstract class EmailSenderPort {
  abstract send(input: SendEmailInput): Promise<EmailSendResult>;
}
```

Implemented in `infrastructure/adapters/`.

### Infrastructure layer

**TypeORM repository implementation**:

```ts
// modules/students/infrastructure/repositories/students.typeorm.repository.ts
@Injectable()
export class StudentsTypeOrmRepository extends StudentsRepository {
  constructor(@InjectRepository(Student) private readonly repo: Repository<Student>) {
    super();
  }

  async findById(id: string): Promise<Student | null> {
    return this.repo.findOne({ where: { id, organizationId: ctx().organizationId } });
  }

  async save(student: Student): Promise<void> {
    await this.repo.save(student);
  }
  // ...
}
```

**Wiring in the module**:

```ts
// modules/students/presentation/students.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Student])],
  controllers: [StudentsController],
  providers: [
    { provide: StudentsRepository, useClass: StudentsTypeOrmRepository },
    CreateStudentUseCase,
    FindStudentUseCase,
    // ...
  ],
})
export class StudentsModule {}
```

### Presentation layer

**Controllers**:

- Thin. Only: receive HTTP, validate, call use case, present response.
- Use `@RequirePermissions`, `@CheckOwnership`, `@CurrentUser`.
- Versioned: `@Controller({ path: 'students', version: '1' })`.

**HTTP DTOs**:

Two valid approaches; choose per module, be consistent within it:

1. **class-validator DTOs** (Nest-native, plays well with Swagger):
   ```ts
   export class CreateStudentDto {
     @IsString() @MinLength(3)
     fullName!: string;

     @IsDateString()
     birthDate!: string;
   }
   ```

2. **Zod via `ZodValidationPipe`** (shares with frontend, more expressive):
   ```ts
   const CreateStudentSchema = createStudentInputSchema; // from @school/shared
   type CreateStudentDto = z.infer<typeof CreateStudentSchema>;
   ```

   ```ts
   @Post()
   @UsePipes(new ZodValidationPipe(CreateStudentSchema))
   create(@Body() body: CreateStudentDto) { ... }
   ```

**Recommendation:** use **Zod via ZodValidationPipe** for cross-cutting forms shared with the frontend (most resources). Use class-validator only when integrating tightly with a Nest feature that expects metadata (rare).

**Presenters**:

Never expose `@Entity` directly — return DTOs:

```ts
export class StudentPresenter {
  static toHttp(s: Student): StudentResponseDto {
    return {
      id: s.id,
      fullName: s.fullName,             // already decrypted via transformer
      birthDate: s.birthDate.toISOString().slice(0, 10),
      status: s.status,
      // intentionally NOT exposing: organizationId, internal flags
    };
  }
}
```

## TypeORM rules

1. **Never `synchronize: true`.** Migrations only.
2. **Migrations in version control.** Reviewed in PR.
3. **N+1 awareness.** Use QueryBuilder with explicit `leftJoinAndSelect` for known relations. Don't use `find({ relations: { … } })` blindly on collections.
4. **Eager loading: only for 1:1 that always travels together** (e.g. `User → UserSettings`).
5. **Soft delete** via `@DeleteDateColumn` on entities marked in `02-DATA_MODEL.md`. Repository methods default to excluding soft-deleted; explicit `withDeleted: true` when needed.
6. **Transactions:** use `DataSource.transaction(async em => ...)` or `typeorm-transactional`. Never rely on "I'll remember to commit."
7. **Avoid raw SQL.** Use QueryBuilder. Raw SQL only for performance-critical reports and reviewed carefully.
8. **Naming strategy:** SnakeNamingStrategy applied globally (entities use camelCase, DB stays snake_case).
9. **Tenant filter:** in repositories, **always** include `organizationId` in the WHERE. The TenantSubscriber is a safety net, not the primary defense.

### Migration commands

```bash
pnpm --filter @conecta/api migration:generate src/infrastructure/database/migrations/AddXyz
pnpm --filter @conecta/api migration:run
pnpm --filter @conecta/api migration:revert
```

### DataSource configuration

Lives in `apps/api/src/infrastructure/database/data-source.ts` (separate from `app.module.ts` so the TypeORM CLI can load it). Reads from env validated by Zod.

## Error handling

### Domain exceptions

```ts
export abstract class DomainException extends Error {
  abstract readonly code: string;
  readonly status: number = 422;
  constructor(message: string, public readonly details?: Record<string, unknown>) {
    super(message);
  }
}

export class EnrollmentAlreadyCancelledError extends DomainException {
  readonly code = 'ENROLLMENT_ALREADY_CANCELLED';
  constructor(enrollmentId: string) {
    super(`Enrollment ${enrollmentId} is already cancelled.`, { enrollmentId });
  }
}
```

### Global exception filter

Catches `DomainException`, `HttpException`, and unknown. Returns:

```json
{
  "code": "ENROLLMENT_ALREADY_CANCELLED",
  "message": "Enrollment a1b2... is already cancelled.",
  "details": { "enrollmentId": "a1b2..." },
  "requestId": "req_abc"
}
```

HTTP status:
- `DomainException` → 422 (default, overridable)
- Validation errors → 400
- Not found → 404
- Auth errors → 401/403
- Idempotency conflict → 409
- Unknown → 500 (logged to Sentry)

### Catalog

Error codes are constants in `@school/shared/errors`. Backend and frontend both import. Codes are `SCREAMING_SNAKE_CASE` with resource prefix.

## Dependency injection patterns

- Prefer constructor injection.
- Inject **abstract classes** (the contract), not concrete implementations.
- Avoid `@Inject('TOKEN')` strings — use class tokens.
- Don't use `forwardRef` unless there's a true circular dep — usually means a missing module split.

## Configuration

`apps/api/src/infrastructure/config/env.schema.ts`:

```ts
export const envSchema = z.object({
  NODE_ENV: z.enum(['development','staging','production']),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(64),
  JWT_REFRESH_SECRET: z.string().min(64),
  ENCRYPTION_KEY: z.string().length(64),
  SEARCH_HASH_KEY: z.string().length(64),
  ENCRYPTION_KEY_VERSION: z.coerce.number().default(1),
  COOKIE_DOMAIN: z.string(),
  FRONTEND_URL: z.string().url(),
  ASAAS_API_KEY: z.string(),
  ASAAS_WEBHOOK_TOKEN: z.string(),
  RESEND_API_KEY: z.string(),
  ZAPI_INSTANCE_ID: z.string(),
  ZAPI_TOKEN: z.string(),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string(),
  R2_PUBLIC_URL: z.string().url(),
  SENTRY_DSN: z.string().url().optional(),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace']).default('info'),
  RETENTION_MONTHS: z.coerce.number().default(24),
});
```

Validation runs at bootstrap. **App refuses to start if env is invalid.**

## Logging

- **Pino** with `nestjs-pino`.
- **JSON** in staging/prod, pretty-print in dev.
- **Request ID** injected via middleware, propagated in async context.
- **Request log** captures method, path, status, duration, userId, organizationId, requestId.
- Redaction rules in `04-SECURITY_AND_LGPD.md`.

## Bootstrap (`main.ts`) — checklist

When `apps/api/src/main.ts` is created/modified, ensure:

- [ ] `app.useGlobalPipes(new ZodValidationPipe())` or class-validator equivalent
- [ ] `app.useGlobalFilters(new GlobalExceptionFilter())`
- [ ] `app.useGlobalInterceptors(new AuditInterceptor(), new IdempotencyInterceptor())`
- [ ] `app.use(helmet())` with strict CSP
- [ ] `app.enableCors({ origin: env.FRONTEND_URL, credentials: true })`
- [ ] `app.use(cookieParser())`
- [ ] Versioning enabled (`URI` strategy, default `v1`)
- [ ] Swagger module setup, gated to non-prod
- [ ] Graceful shutdown hooks (`SIGINT`, `SIGTERM`)
- [ ] Pino logger registered as Nest logger
- [ ] Trust proxy if behind a load balancer (`app.set('trust proxy', 1)`)

## Patterns to follow

### Pagination

Cursor-based for lists likely to grow (audit logs, communications, students). Offset-based acceptable for small bounded lists (schools, modalities).

Cursor format: opaque base64 of `{ id, created_at }`. Response includes `nextCursor`.

### Filtering

Standardize on query params:
```
GET /v1/students?status=ACTIVE&schoolId=...&q=joao&cursor=...&limit=50
```

Build with a `ListStudentsQueryDto` Zod schema.

### File uploads (multipart)

Used for brand assets (logo, favicon) and CSV imports. Standard pattern:

- `@nestjs/platform-express` `FileInterceptor` (or `FilesInterceptor`) configured per-endpoint.
- `multer` storage = memory (never disk — we forward to R2).
- Per-endpoint limits: file size, count, MIME allowlist.
- Validation in a dedicated pipe: real MIME via `file-type` (magic bytes, not the user-supplied header), real dimensions via `sharp` for raster, sanitization via `DOMPurify` for SVG (see `04-SECURITY_AND_LGPD.md`).
- Upload to R2 via the `StoragePort` adapter — never directly from the controller.
- Persist only the resulting URL/key on the entity. Don't store binary content in Postgres.

### Background jobs

Defined in `infrastructure/queues/`:

```ts
@Processor('email-queue')
export class EmailWorker {
  @Process()
  async handle(job: Job<SendEmailJobData>) { ... }
}
```

Always idempotent. Always retry-safe. Use job IDs derived from business keys when possible (e.g. `invoice-reminder:{invoiceId}:{stage}`).

### Domain events

```ts
// publishing
this.eventBus.publish(new StudentCreatedEvent(student));

// handling
@EventsHandler(StudentCreatedEvent)
export class SendWelcomeEmailHandler implements IEventHandler<StudentCreatedEvent> {
  handle(event: StudentCreatedEvent) { ... }
}
```

Events are fire-and-forget within a transaction (use `@nestjs/cqrs` event bus or a custom one).
For events that must outlive the transaction (e.g. enqueue a job), use an **outbox pattern** in critical flows.

### Idempotency middleware

`IdempotencyInterceptor`:
1. Reads `Idempotency-Key` header on mutations.
2. Computes hash of body.
3. Checks `idempotency_keys`. If hit and body matches → returns cached response.
4. Else proceeds, captures response, stores.
5. Same key + different hash → 409 `IDEMPOTENCY_CONFLICT`.

## What "good code" looks like here

✅ Small modules, focused use cases, dependencies via abstractions.
✅ Tests run in milliseconds because domain doesn't need a DB.
✅ A junior dev can find any feature in ≤ 30 seconds by file structure alone.
✅ Every endpoint has a Zod schema, a use case, a unit test, and a brief Swagger description.
✅ Migrations are small, reviewed, and reversible.

## Anti-patterns

❌ Service classes that wrap a repository and add nothing.
❌ Use cases that do 5 different things (split them).
❌ Controllers with business logic.
❌ Repositories returning DTOs (return domain entities).
❌ Catching `Error` and re-throwing without context.
❌ Adding `@Injectable()` to value objects.
❌ Mixing concerns inside transformers/decorators.
❌ Hard-coding business rules in seeds (use the same use cases).

---

## API contracts

The rules below define how every endpoint in this API is shaped, versioned, errored, and made idempotent. Apply them consistently — clients and tooling depend on it.


---

## Base URL and versioning

- API base path: `/api/v1`.
- Versioning strategy: URL (`/api/v1/...`, `/api/v2/...`).
- Breaking changes require a new major version. Non-breaking additions are made in place.
- Internal endpoints (health, metrics, queues dashboard) live outside `/api/v1`.

## Content types

- Requests: `application/json` (or `multipart/form-data` for uploads, only `imports` and avatars).
- Responses: `application/json`.
- Always UTF-8.

## Authentication

- Cookies (`__Host-access`, `__Host-refresh`) — see `03-AUTH_AND_PERMISSIONS.md`.
- Mutations require header `X-Requested-With: school-platform` (CSRF defense).
- Some endpoints accept `Idempotency-Key` (see below).

## Standard response shapes

### Single resource

```json
{
  "id": "...",
  "fullName": "...",
  "...": "..."
}
```

### Collection (cursor pagination)

```json
{
  "data": [ { "id": "...", "...": "..." } ],
  "pagination": {
    "limit": 50,
    "nextCursor": "eyJpZCI6Ii4uLiIsImNyZWF0ZWRBdCI6Ii4uLiJ9",
    "hasMore": true
  }
}
```

### Empty success (e.g. delete)

`HTTP 204 No Content` with no body.

### Action result

Where the action returns metadata but no resource:

```json
{
  "result": "ok",
  "details": { "...": "..." }
}
```

## Error shape

**All errors share the same body:**

```json
{
  "code": "ENROLLMENT_ALREADY_CANCELLED",
  "message": "Enrollment is already cancelled.",
  "details": { "enrollmentId": "..." },
  "requestId": "req_abc"
}
```

| Concern | Rule |
|---------|------|
| `code` | `SCREAMING_SNAKE_CASE`, prefixed by resource. Stable. Documented. |
| `message` | Human-readable, localized via `Accept-Language`. Never contains PII. |
| `details` | Optional. Free-form object with context for the client. |
| `requestId` | Always present. Echoes the `X-Request-Id`. |

### Status code mapping

| Code | Use for |
|------|---------|
| 200 OK | Successful read or action with body |
| 201 Created | Resource created |
| 204 No Content | Success, no body |
| 400 Bad Request | Malformed request, validation error |
| 401 Unauthorized | Auth missing or invalid |
| 403 Forbidden | Auth valid but lacks permission |
| 404 Not Found | Resource does not exist (or not visible to this tenant) |
| 409 Conflict | Idempotency conflict, version conflict |
| 410 Gone | Resource was anonymized / permanently removed |
| 422 Unprocessable Entity | Business rule violation (DomainException) |
| 429 Too Many Requests | Rate limited |
| 500 Internal Server Error | Unknown — logged to Sentry |
| 503 Service Unavailable | Dependent system down (gateway, DB) |

### Validation errors (400)

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Some fields are invalid.",
  "details": {
    "fields": {
      "fullName": ["Required."],
      "birthDate": ["Must be a valid date."]
    }
  },
  "requestId": "req_..."
}
```

Frontends map `details.fields.<name>` to React Hook Form errors via `form.setError`.

## URL design

### Resources

- Plural nouns: `/students`, `/enrollments`, `/invoices`.
- Nested only for **strong containment**: `/classes/:id/attendance-sessions`. Otherwise flat with query params: `GET /attendance-sessions?classId=...`.
- Actions on resources: `POST /enrollments/:id/cancel`, `POST /invoices/:id/refund`. Not RPC-style global verbs.

### Filtering, sorting, pagination

Query params:
- `cursor` — opaque base64 cursor for pagination.
- `limit` — page size (default 50, max 200).
- `q` — free-text search where supported.
- Resource-specific filters: `status`, `schoolId`, `classId`, `from`, `to`, etc.
- `sort` (rare, only when not default): `sort=createdAt:desc`.

Defined in a Zod schema per endpoint, validated at the edge.

## Idempotency

### When to require it

- Any **mutation** that creates external side effects:
  - `POST /invoices` (creates gateway invoice)
  - `POST /payments` (manual payment)
  - `POST /communications` (sends emails / WhatsApp)
  - `POST /enrollments` (creates Asaas subscription)
  - `POST /enrollments/:id/cancel` (cancels external subscription)

### Header

```
Idempotency-Key: <client-generated UUID v4>
```

### Behavior

- Server stores `(key, user_id, request_hash, response, status_code)` in `idempotency_keys`.
- Same key + same hash → returns cached response (with original status).
- Same key + different hash → `409 IDEMPOTENCY_CONFLICT`.
- Missing key on a required endpoint → `400 IDEMPOTENCY_KEY_REQUIRED`.
- TTL 24h.

### Client responsibility

- Generate a stable key per logical action.
- Use the same key if retrying after a timeout.
- New action → new key.

## Examples — selected endpoints

### Auth

```
POST   /api/v1/auth/signup-organization
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/logout-all
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/verify-email
POST   /api/v1/auth/accept-invite
GET    /api/v1/auth/me
```

#### Login

Request:
```http
POST /api/v1/auth/login
Content-Type: application/json
X-Requested-With: school-platform

{ "email": "ana@school.com", "password": "..." }
```

Response (200):
```http
HTTP/1.1 200 OK
Set-Cookie: __Host-access=...; HttpOnly; Secure; SameSite=Strict; Path=/
Set-Cookie: __Host-refresh=...; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh

{
  "user": {
    "id": "...",
    "email": "ana@school.com",
    "name": "Ana",
    "organizationId": "...",
    "roles": ["SCHOOL_STAFF"],
    "permissions": ["student:read.own-school", "..."],
    "scopedSchoolIds": ["sch_..."]
  }
}
```

### Students

```
GET    /api/v1/students                    list (paginated, filterable)
POST   /api/v1/students                    create (Idempotency-Key required)
GET    /api/v1/students/:id                detail
PATCH  /api/v1/students/:id                partial update
DELETE /api/v1/students/:id                soft delete (status=INACTIVE), not anonymization
POST   /api/v1/students/:id/anonymize      anonymize (ADMIN only)
GET    /api/v1/students/:id/enrollments    enrollments for a student
GET    /api/v1/students/:id/attendance     attendance history
```

### Enrollments

```
GET    /api/v1/enrollments
POST   /api/v1/enrollments                 create + creates subscription (Idempotency)
GET    /api/v1/enrollments/:id
PATCH  /api/v1/enrollments/:id             only mutable fields (notes, etc.)
POST   /api/v1/enrollments/:id/pause       state transition (Idempotency)
POST   /api/v1/enrollments/:id/resume
POST   /api/v1/enrollments/:id/cancel
```

State changes via dedicated action endpoints, not via PATCH. This makes intent explicit
and keeps PATCH small.

### Webhooks

```
POST   /api/v1/webhooks/asaas/:webhookToken
```

- No standard auth (cookies don't apply).
- `:webhookToken` resolves to an `organizationId` via `organizations.settings.paymentGateway.webhookToken`.
- HMAC signature verified using the tenant's Asaas-configured signing key.
- Idempotency via `(provider, gateway_event_id)` UNIQUE constraint.
- Responds 200 quickly; processing is async with tenant-bootstrapped RequestContext.

### Payment gateway management (per-tenant Asaas account)

```
GET    /api/v1/organizations/:id/payment-gateway              # status + lastFour
POST   /api/v1/organizations/:id/payment-gateway/connect      # { provider, apiKey } — validates with Asaas before persisting
POST   /api/v1/organizations/:id/payment-gateway/disconnect   # wipes encrypted key
POST   /api/v1/organizations/:id/payment-gateway/rotate-webhook-token  # regenerates webhookToken on suspected compromise
```

### Brand assets (multipart upload)

```
PATCH  /api/v1/organizations/:id/theme              # JSON: colors + brandName
POST   /api/v1/organizations/:id/brand-assets       # multipart/form-data: logo / favicon
DELETE /api/v1/organizations/:id/brand-assets/:asset  # remove a specific asset
```

- `Content-Type: multipart/form-data` for upload endpoints (the only place in the API that uses this besides CSV imports).
- Field name: `file`. Optional field `kind` ∈ {`logo`, `logo_small`, `favicon`}.
- Server validates MIME via magic bytes, dimensions via `sharp`, and sanitizes SVGs (see `04-SECURITY_AND_LGPD.md`).
- Returns `{ url: string, kind: string }`.
- `PATCH /theme` validates colors with WCAG AA contrast; rejects with `422 BRAND_COLOR_CONTRAST_INSUFFICIENT` if a color fails.

## Payment gateway: abstract port + per-tenant adapter

The platform is gateway-agnostic by design (see decision 0008 in `10-DECISIONS.md`). All payment logic depends on an abstract port, never on a concrete vendor.

### The port

```ts
// modules/finance/application/ports/payment-gateway.port.ts
export abstract class PaymentGatewayPort {
  abstract createCustomer(input: CreateCustomerInput): Promise<CustomerRef>;
  abstract createInvoice(input: CreateInvoiceInput): Promise<InvoiceRef>;
  abstract createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionRef>;
  abstract cancelSubscription(ref: SubscriptionRef): Promise<void>;
  abstract refundPayment(ref: PaymentRef, input: RefundInput): Promise<void>;
  abstract validateCredentials(): Promise<GatewayAccountInfo>;
  // ... small, vendor-neutral surface
}
```

Vendor-specific concepts (Asaas's customer/billing/payment IDs, Stripe's PaymentIntent, etc.) live **inside the adapter only** and are exposed upward as opaque `*Ref` strings.

### The adapter

`AsaasAdapter` in `modules/finance/infrastructure/adapters/asaas/` implements the port. Each method translates port calls into Asaas REST calls.

### Per-tenant resolution

Each tenant has their own Asaas account. The adapter must use the correct credentials for the current request's tenant. We solve this with a factory:

```ts
@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly orgs: OrganizationsRepository,
    private readonly crypto: EncryptionService,
    @InjectRedis() private readonly cache: Redis,
  ) {}

  async forCurrentTenant(): Promise<PaymentGatewayPort> {
    const orgId = ctx().organizationId;
    const cached = await this.cache.get(`gateway:${orgId}`);
    const config = cached ? JSON.parse(cached) : await this.loadConfig(orgId);

    if (config.status !== 'ACTIVE') {
      throw new PaymentGatewayNotConnectedError();
    }
    if (config.provider === 'ASAAS') return new AsaasAdapter(config.apiKey);
    throw new UnsupportedGatewayProviderError(config.provider);
  }

  private async loadConfig(orgId: string) {
    const org = await this.orgs.findById(orgId);
    const cfg = org.settings?.paymentGateway;
    if (!cfg) return { status: 'NOT_CONFIGURED' };
    const apiKey = this.crypto.decrypt(cfg.apiKey_encrypted);
    const out = { ...cfg, apiKey };
    await this.cache.setex(`gateway:${orgId}`, 60, JSON.stringify(out));
    return out;
  }
}
```

Use cases inject the **factory**, not the port directly:

```ts
@Injectable()
export class CreateInvoiceUseCase {
  constructor(
    private readonly invoices: InvoicesRepository,
    private readonly gateways: PaymentGatewayFactory,
  ) {}

  async execute(input: CreateInvoiceInput): Promise<Invoice> {
    const gateway = await this.gateways.forCurrentTenant();
    const ref = await gateway.createInvoice({ ... });
    // ...
  }
}
```

### No-gateway-yet behavior

If `settings.paymentGateway.status !== 'ACTIVE'`, billing-dependent endpoints respond `422 PAYMENT_GATEWAY_NOT_CONNECTED` with a friendly message. The rest of the platform (roster, attendance, communications) keeps working — only invoice/subscription flows are blocked.

### Connecting and validating

`POST /api/v1/organizations/:id/payment-gateway/connect` body `{ provider: 'ASAAS', apiKey }`:

1. Encrypt `apiKey` with AES-256-GCM.
2. Call `validateCredentials()` via a temporary adapter instance — verifies the key by hitting Asaas's `/myAccount`.
3. On success: persist, generate a fresh `webhookToken` (256-bit random), return `{ status: 'ACTIVE', lastFour, webhookToken, webhookUrl }`.
4. Frontend displays the URL — admin pastes it into Asaas to receive webhooks.
5. Audit `organization.payment_gateway_connected`.

`POST /api/v1/organizations/:id/payment-gateway/disconnect`:
1. Wipe `apiKey_encrypted`, set `status='DISCONNECTED'`.
2. Audit. Cache invalidation.

## Webhook security flow (per-tenant Asaas)

```
1. Receive POST /api/v1/webhooks/asaas/:webhookToken
2. Read raw body (do NOT json-parse before HMAC check)
3. Resolve organizationId from :webhookToken (constant-time lookup; cached 60s)
   If not found → 404, log incident (potential probe)
4. Compute HMAC-SHA256(raw_body, asaasSigningKeyFor(organizationId))
5. Compare with header (constant-time). On mismatch → 401, log.
6. Parse JSON
7. Insert webhook_events { organization_id, provider, gateway_event_id, event_type, payload }
   ON CONFLICT (provider, gateway_event_id) DO NOTHING
8. If inserted (new event):
     Enqueue { eventId, organizationId } to webhook-processor queue
9. Respond 200 OK
10. Worker picks up:
     - Bootstrap RequestContext with organizationId (so all downstream code is tenant-scoped)
     - Load event from webhook_events
     - Dispatch to handler by event_type
     - Mark PROCESSED on success, FAILED on exhausted retries
```

## OpenAPI / Swagger

- Available at `/api/docs` in dev and staging.
- Auto-generated from controllers + DTO decorators.
- For Zod-based DTOs, use `nestjs-zod` or a converter to keep Swagger accurate.
- Disabled in production (information disclosure).

## Versioning a schema (forward changes)

Adding a field: safe — backward compatible.
Renaming or removing a field: bump version.

When bumping:
1. Add new version of the route (`@Controller({ path: 'students', version: '2' })`).
2. Keep v1 alongside.
3. Deprecate v1 in docs, set a sunset date.
4. Announce; track usage.
5. Remove v1.

## Headers Reference

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Cookie` | → | Auth |
| `Set-Cookie` | ← | Auth issuance / revocation |
| `X-Requested-With: school-platform` | → | CSRF defense on mutations |
| `Idempotency-Key` | → | Idempotency on selected mutations |
| `X-Request-Id` | ↔ | Correlation. Client may send; server always echoes |
| `Accept-Language` | → | Localize messages |
| `Authorization` | — | NOT used in this API. Bearer tokens are not part of the design. |

---

## Observability

Three pillars (logs, errors, audit) plus health checks and a queue dashboard. No Prometheus in MVP.


---

## Three pillars

| Pillar | Tool | What it answers |
|--------|------|------------------|
| **Logs** | Pino + Axiom (or Better Stack) | "What happened?" Structured, queryable. |
| **Errors** | Sentry | "What broke and where?" Stack traces + context. |
| **Audit** | DB table `audit_logs` | "Who did what to which data, when?" |

Plus:
- **Health checks** for uptime probes.
- **Queues dashboard** (BullMQ + bull-board) for async work visibility.

We **defer** real metrics (Prometheus/Grafana) until there's a measurable need.

## Request correlation — `request_id`

Every request gets one. It travels through:
- HTTP headers (`X-Request-Id`)
- Logs (`requestId: "..."`)
- Audit log rows (`audit_logs.request_id`)
- Background jobs spawned by the request (passed in job data)
- Sentry events (tag)
- Error responses (in the body)

Middleware:
```ts
// apps/api/src/shared/middlewares/request-id.middleware.ts
const incoming = req.headers['x-request-id'];
const requestId = typeof incoming === 'string' && incoming.length <= 64
  ? incoming
  : `req_${nanoid()}`;
req.headers['x-request-id'] = requestId;
res.setHeader('X-Request-Id', requestId);
```

Pino is configured with `mixin` reading from `RequestContext` so every log includes `requestId`, `userId`, `organizationId`.

## Logging

### Configuration

```ts
// apps/api/src/infrastructure/logging/logger.config.ts
export const loggerConfig: Params = {
  pinoHttp: {
    level: env.LOG_LEVEL,
    transport: env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { singleLine: true } }
      : undefined,
    redact: { paths: REDACTION_PATHS, censor: '[REDACTED]' },
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, userAgent: req.headers['user-agent'] }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    mixin() {
      const ctx = RequestContext.tryGet();
      return ctx
        ? { requestId: ctx.requestId, userId: ctx.userId, organizationId: ctx.organizationId }
        : {};
    },
  },
};
```

### When to log what

| Level | Use for |
|-------|---------|
| `fatal` | The app cannot recover (e.g. DB connection lost permanently). |
| `error` | An operation failed for technical reasons (catch + log + rethrow or 500). |
| `warn` | Notable but recoverable: rate limit hit, retry triggered, deprecation. |
| `info` | Business milestones: signup, payment received, communication sent. Default level. |
| `debug` | Step-by-step traces in dev / staging only. |
| `trace` | Very verbose, rarely enabled. |

**Examples (info-level):**

```ts
logger.info(
  { studentId, enrollmentId, monthlyFeeCents },
  'Enrollment created',
);

logger.info(
  { invoiceId, amountCents, method },
  'Payment confirmed via webhook',
);
```

**Bad logs** to avoid:
- `logger.info('start')` / `'end'` with no context.
- Logging PII (names, CPF, phone). Redaction will catch most, but don't tempt fate.
- Logging entire response bodies.
- String concatenation in messages: use the `{ key }` object instead.

### Querying logs (Axiom)

Typical investigation queries:
- "All errors for user X in last hour" → filter `level='error' AND userId='X'`.
- "Slow requests" → filter `responseTime > 1000`.
- "All audit-relevant events for org Y today" → filter `organizationId='Y' AND msg ~ 'audit'`.

## Error tracking (Sentry)

### Setup

- Init in `main.ts` **before** Nest bootstrap.
- DSN in env (`SENTRY_DSN`); disabled in dev.
- Captures unhandled exceptions, 500-level errors, and unhandled promise rejections.
- Frontend (`apps/web`) also initializes Sentry.

### What gets reported

- Anything not caught by `DomainException` flow.
- 500-level responses.
- Worker job failures after final retry.

### What doesn't

- `DomainException` (these are business rules, not bugs). Logged at `warn`, not sent to Sentry.
- 401/403/404/422 (expected). Logged at `info` or `warn`.

### Context attached

- `user.id`, `user.organizationId`.
- `tags`: `requestId`, `route`, `version`.
- `extra`: relevant payload (with PII stripped).

### Source maps

Uploaded on deploy. Required for usable stack traces.

## Audit log

### Purpose

Compliance + accountability. Every change to business data is recorded — by whom, when,
from where, with before/after snapshots.

### Implementation

A global `AuditInterceptor` (Nest interceptor) wraps mutating handlers:

1. Before handler:
   - Identify the resource being mutated (decorator-based: `@AuditResource('student')`).
   - If update/delete, fetch current state for `before` snapshot.
2. After handler (success):
   - Capture `after` snapshot for create/update.
   - Build `audit_logs` row with `action`, `resource`, `resource_id`, `actor_user_id`,
     `organization_id`, `school_id` (if available), `request_id`, IP, user agent.
   - **Persist async** via `audit-writer` queue (don't block response).
3. On handler failure: no audit row (the operation didn't happen).

### Action naming

`<resource>.<verb>`: `student.created`, `enrollment.cancelled`, `invoice.refunded`,
`user.invited`, `role.assigned`, `consent.revoked`, `organization.theme_updated`,
`organization.brand_asset_updated`, `organization.brand_asset_deleted`,
`organization.payment_gateway_connected`, `organization.payment_gateway_disconnected`.

### What's in `before` / `after`

- The persistent entity, including encrypted columns as-is (they remain encrypted in audit too).
- Sensitive fields are NOT decrypted for storage in the audit log.
- Internal flags removed (e.g. `password_hash`).

### Reading audit logs

`/admin/audit` UI:
- Filter by actor, resource, action, date range, school.
- View before/after diff side by side.
- Export CSV.

Permissions: `audit:read` (ADMIN/ORG_STAFF), `audit:read.own-school` (SCHOOL_STAFF).

### Retention

5 years. After that, partition + archive (consider post-MVP).

## Health checks

### Endpoints

```
GET /health           # public, no deps; confirms process is up. Returns 200 always (if app is up).
GET /health/ready     # internal; checks DB, Redis. Returns 503 if any check fails.
```

### Implementation

Use `@nestjs/terminus`:

```ts
@Get('ready')
@Public()
check() {
  return this.health.check([
    () => this.db.pingCheck('database'),
    () => this.redis.pingCheck('redis'),
  ]);
}
```

### Probes

- Load balancer / orchestrator points liveness at `/health`.
- Readiness probe points at `/health/ready` (won't route traffic until DB+Redis up).

## Queue observability

### Dashboard

`@bull-board/express` mounted at `/admin/queues`. ADMIN role only. Shows:
- Jobs by status (waiting, active, completed, failed, delayed).
- Job payloads (without PII — strip in serializer).
- Retry from UI.
- DLQ items for review.

### Job logging

Workers log:
- `info` on start: `{ jobId, jobName, attempts }`
- `info` on success with duration.
- `warn` on retry.
- `error` on final failure + Sentry capture.

### Dead-letter queue (DLQ)

After max retries, the job moves to `<queue>-dlq`. Admin reviews and either:
- Re-enqueues after fix.
- Marks as discarded with reason (auditable).

## Frontend observability

- Sentry SDK initialized in `app/layout.tsx` (or via `Sentry.init` in a separate file).
- Captures unhandled errors, promise rejections, route-level errors.
- Performance: page transitions, longest contentful paint (optional).
- User feedback widget enabled (helps support).
- `requestId` from error responses is shown to users in error toasts ("Sorry — code: req_abc").

## Observable patterns to follow

- **Log at boundaries**: HTTP requests, queue jobs, webhook intake, external API calls.
- **Include IDs, not blobs**: `studentId`, not the whole student object.
- **One log line per business event**, not five per function call.
- **Errors include a code**: the audit/log + the response should agree.
- **Worker idempotency keys** logged so retries are traceable.

## Anti-patterns

- ❌ `console.log` in production code.
- ❌ Logging passwords, tokens, PII. (Redaction catches a lot — don't lean on it.)
- ❌ Massive log payloads (logging the full request body).
- ❌ Sentry-spamming `DomainException` (use `warn` log instead).
- ❌ Logs with no actor/tenant context.
- ❌ Sampling errors away (we have low volume).
