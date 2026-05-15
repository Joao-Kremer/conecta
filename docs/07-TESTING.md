# 09 — Testing strategy

> **When to read:** Every time you write code. Yes, every time.
> **Prerequisites:** `05-BACKEND_GUIDE.md`, `06-FRONTEND_GUIDE.md`
> **TL;DR:** Pyramid: many unit tests (domain/application), some integration (infra), few e2e (critical flows). Coverage thresholds enforced in CI. Multi-tenant isolation has dedicated tests.

---

## What we test, by layer

| Layer | Type | Tool | Coverage target |
|-------|------|------|------------------|
| Domain entities, value objects | Unit | Jest | 95% statements, 90% branches |
| Application use cases | Unit | Jest | 90% statements, 80% branches |
| Infrastructure repositories | Integration | Jest + Testcontainers (Postgres) | 70% |
| Presentation (controllers via Supertest) | Integration | Jest + Supertest + Testcontainers | covers all endpoints (happy + key error paths) |
| Cross-tenant isolation | Integration | Jest + Testcontainers | exhaustive — every mutating endpoint |
| Critical user flows | E2E | Playwright | covers the flows below |
| Frontend components (interaction-heavy) | Unit/integration | Vitest + RTL | as needed |
| Frontend critical flows | E2E | Playwright (shared with backend) | covers the flows below |

Global gate in CI: **70% statements** across the api app; **90% in `domain/` and `application/`**.
Build fails below thresholds.

## Critical e2e flows (must always pass)

1. **Signup → onboarding** — create org, verify email, log in, complete wizard.
2. **Invite → accept** — staff invite, accept, log in.
3. **Create student → enroll → invoice generated → webhook → invoice paid**.
4. **Coach attendance** — log in as coach, open today's class, register all students.
5. **Guardian portal** — log in, view dependents, pay an invoice via Pix flow (mocked gateway in test).
6. **Communication send** — segmented send, recipients receive correct payload.
7. **Anonymization** — student anonymized, PII becomes placeholders, IDs preserved.
8. **Cross-tenant blocked** — explicitly attempt to access another org's data via crafted IDs; expect 404.
9. **CSV import** — upload a fixture CSV, see results, errors flagged correctly.
10. **Tenant theming** — change brand primary + accent, reload dashboard, verify rendered CSS variables and computed pixel colors match expectations across a few themes.

## Theming-specific tests (`@school/shared/theming`)

Pure-function module — easy and cheap to cover thoroughly:

- `deriveTones(hex)` — snapshot for representative inputs (red, green, blue, near-black, near-white). Property test: derived `strong` always has WCAG contrast ≥ 4.5 against `soft`.
- `computeBrandTokens(theme)` — full snapshot of the resulting token bag.
- `contrastRatio(a, b)` — known-pair table (white vs black = 21, etc).
- `validateBrandColor(hex)` — accepts darks/mediums, rejects pastels, returns helpful messages.
- `renderThemeStyle(theme)` — output is well-formed CSS with only allowed chars (XSS guard); snapshot for 3+ themes.

Backend integration tests:
- `PATCH /organizations/:id/theme` accepts valid, rejects insufficient contrast with the right error code.
- `POST /organizations/:id/brand-assets` accepts valid PNG/SVG, rejects oversized, rejects mismatched MIME, strips dangerous SVG content.

Visual regression (Playwright):
- Render the dashboard with at least three themes (default + a dark brand like martial arts + a vivid brand like volleyball). Capture and compare screenshots.

## File layout

```
apps/api/
├── src/
│   └── modules/students/
│       ├── domain/
│       │   └── entities/
│       │       ├── student.entity.ts
│       │       └── student.entity.spec.ts          ← unit
│       └── application/
│           └── use-cases/
│               ├── create-student.use-case.ts
│               └── create-student.use-case.spec.ts  ← unit
├── test/
│   ├── integration/
│   │   ├── students.repository.int-spec.ts
│   │   └── students.controller.int-spec.ts          ← Supertest
│   ├── e2e/
│   │   └── signup-onboarding.e2e-spec.ts
│   └── isolation/
│       └── students.cross-tenant.spec.ts            ← multi-tenancy
└── jest.config.ts
```

```
apps/web/
├── src/
│   └── components/
│       └── student-form.test.tsx                    ← Vitest + RTL
└── e2e/
    └── guardian-portal.spec.ts                      ← Playwright
```

## Unit tests — domain / application

**Goals:** fast (<50ms each), isolated, deterministic, no I/O.

### Pattern

```ts
// apps/api/src/modules/students/application/use-cases/create-student.use-case.spec.ts
describe('CreateStudentUseCase', () => {
  let useCase: CreateStudentUseCase;
  let students: InMemoryStudentsRepository;
  let consents: InMemoryConsentsRepository;
  let bus: FakeEventBus;

  beforeEach(() => {
    students = new InMemoryStudentsRepository();
    consents = new InMemoryConsentsRepository();
    bus = new FakeEventBus();
    useCase = new CreateStudentUseCase(students, consents, bus);
  });

  it('requires active data_processing consent', async () => {
    await expect(useCase.execute(makeInput({}))).rejects.toThrow(ConsentRequiredError);
  });

  it('creates the student and emits StudentCreated', async () => {
    await consents.add(makeConsent({ purpose: 'data_processing' }));
    const student = await useCase.execute(makeInput({}));

    expect(student.id).toBeDefined();
    expect(students.items).toHaveLength(1);
    expect(bus.published).toHaveLength(1);
    expect(bus.published[0]).toBeInstanceOf(StudentCreatedEvent);
  });
});
```

### In-memory repositories

Each module ships an in-memory implementation of its abstract repositories under
`apps/api/src/modules/<feature>/infrastructure/repositories/in-memory/`. These are
also useful for prototyping, but their **primary role is testing**.

### Factories

Use `@faker-js/faker` wrapped in typed factories:

```ts
// apps/api/test/factories/student.factory.ts
export function makeStudent(overrides: Partial<Student> = {}): Student {
  return Student.create({
    id: faker.string.uuid(),
    organizationId: 'org_test',
    fullName: faker.person.fullName(),
    birthDate: faker.date.birthdate(),
    ...overrides,
  });
}
```

Avoid bare object literals in many tests; centralize the shape.

## Integration tests — repositories and controllers

**Goals:** verify TypeORM mapping, queries, constraints. Verify the wiring of guards,
pipes, filters, and use cases through Supertest.

### Setup with Testcontainers

```ts
// apps/api/test/setup-integration.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';

let container: StartedPostgreSqlContainer;
let dataSource: DataSource;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  dataSource = new DataSource({
    type: 'postgres',
    url: container.getConnectionUri(),
    entities: [...],
    migrationsRun: true,
  });
  await dataSource.initialize();
}, 30_000);

afterAll(async () => {
  await dataSource.destroy();
  await container.stop();
});

beforeEach(async () => {
  // Truncate tables between tests (or wrap in transaction)
});
```

### Repository test example

```ts
describe('StudentsTypeOrmRepository', () => {
  it('encrypts and decrypts full name transparently', async () => {
    await runWithContext({ organizationId: 'org_1' }, async () => {
      const repo = new StudentsTypeOrmRepository(dataSource.getRepository(Student));
      await repo.save(makeStudent({ fullName: 'Ana Silva' }));

      const found = await repo.findById(/* id */);
      expect(found?.fullName).toBe('Ana Silva');

      // Verify encryption at rest
      const raw = await dataSource.query('SELECT full_name_encrypted FROM students WHERE id = $1', [/* id */]);
      expect(raw[0].full_name_encrypted).not.toContain('Ana');
    });
  });
});
```

### Controller test (Supertest)

```ts
describe('POST /api/v1/students', () => {
  it('rejects without auth', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/students')
      .send(payload)
      .expect(401);
  });

  it('creates a student with proper role and consent', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/students')
      .set('Cookie', cookiesFor(orgStaffUser))
      .set('X-Requested-With', 'school-platform')
      .set('Idempotency-Key', 'idem_1')
      .send(payload)
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).toBeDefined();
        expect(body.fullName).toBe(payload.fullName);
      });
  });

  it('returns 422 with ENROLLMENT_REQUIRES_CONSENT code', async () => {
    // ...
  });
});
```

## Multi-tenancy isolation tests

Dedicated suite under `apps/api/test/isolation/`. For every mutating endpoint, the suite
seeds **two orgs** and verifies that **org A cannot** create, read, update, or delete
resources of **org B**, including via:

- Direct ID guessing.
- Crafted relations (e.g. trying to enroll a Student from org B into a Class of org A).
- Crafted query params.

This suite **must** be in CI. Each new resource added must extend it.

## Frontend tests

### Unit / component (Vitest + React Testing Library)

For components with non-trivial logic:

```tsx
test('disables submit while submitting', async () => {
  const onSubmit = vi.fn(() => new Promise(() => {}));
  render(<CreateStudentForm onSubmit={onSubmit} />);
  fireEvent.change(screen.getByLabelText(/Nome/), { target: { value: 'Ana' }});
  fireEvent.click(screen.getByRole('button', { name: /Salvar/ }));
  expect(screen.getByRole('button', { name: /Salvar/ })).toBeDisabled();
});
```

Avoid testing trivial markup. Test behavior.

### E2E (Playwright)

```ts
test('guardian pays an invoice via Pix', async ({ page }) => {
  await loginAsGuardian(page, fixtures.guardianA);
  await page.goto('/invoices');
  await page.getByRole('button', { name: /Pagar com Pix/ }).first().click();
  // mocked gateway flow…
  await expect(page.getByText(/Pagamento confirmado/)).toBeVisible();
});
```

Run against a dedicated test environment with stubbed external dependencies (Asaas sandbox,
Resend test mode, in-memory WhatsApp).

## Mocking external systems

External adapters (`infrastructure/adapters/`) are mocked in unit and most integration tests.
The adapter's contract is the **port** (abstract class in `application/ports/`).

```ts
class FakeEmailSender extends EmailSenderPort {
  public sent: SendEmailInput[] = [];
  async send(input: SendEmailInput) {
    this.sent.push(input);
    return { id: 'fake-message-id' };
  }
}
```

For the real adapter, write **one** integration test that hits the provider's sandbox.
That's it — don't repeat that in every test.

## Anti-patterns

- ❌ Testing the framework (e.g. "does NestJS inject?"). Trust the framework.
- ❌ Tests that depend on test execution order.
- ❌ Mocking the database — use Testcontainers.
- ❌ Massive setup blocks (>30 lines) — extract factories.
- ❌ Asserting on internal state nobody else sees.
- ❌ Snapshots for everything (large snapshots = nobody reads them).
- ❌ Skipping flaky tests instead of fixing root cause.
- ❌ Tests that "work in CI but fail locally" or vice versa.

## Running tests

```bash
pnpm test                    # all unit + integration in changed packages
pnpm test:watch              # watch mode
pnpm --filter @school/api test                    # only api
pnpm --filter @school/api test:integration
pnpm --filter @school/api test:isolation
pnpm test:e2e                # Playwright
```

CI runs:
```bash
pnpm lint
pnpm typecheck
pnpm test --coverage
pnpm test:isolation
pnpm test:e2e --reporter=github
```

---


---

## Universal checklist (every task)

- [ ] **Code compiles** without warnings: `pnpm typecheck` is green.
- [ ] **Lint is clean**: `pnpm lint` is green. No `eslint-disable` introduced without comment + justification.
- [ ] **Tests pass locally**: `pnpm test` is green.
- [ ] **No `any`, no `@ts-ignore`** introduced (or, if exceptionally needed, justified in PR description and in a code comment).
- [ ] **No secrets** committed (env values, API keys, tokens).
- [ ] **No `console.log` or `debugger`** in changed files.
- [ ] **No commented-out code** ("we might need this later" → delete; Git remembers).
- [ ] **No `TODO`/`FIXME`** without an associated tracking item.
- [ ] **No dead code** introduced (unused imports, unused vars).
- [ ] **Commits follow Conventional Commits** and tell a coherent story.
- [ ] **PR description** explains what changed, why, how to test, and any follow-ups.
- [ ] **`09-SPRINTS.md` updated** (`[x]` on completed items).
- [ ] **Affected docs updated** in the same PR (see `../CLAUDE.md` table).
- [ ] **Self-review the diff** before requesting human review.

## Backend tasks (in addition)

- [ ] **Use cases tested** with unit tests (in-memory repos, no DB).
- [ ] **At least one integration test** if the change touches persistence or controllers.
- [ ] **Cross-tenant isolation test** added for any new mutating endpoint.
- [ ] **Permission matrix updated** if a new endpoint, or a new permission key was added (seed + `04-AUTH...md`).
- [ ] **Migrations** generated, manually reviewed, **reversible**, and named clearly.
- [ ] **Migration runs cleanly** on a fresh DB AND on a staging-equivalent snapshot.
- [ ] **No `synchronize: true`** anywhere outside test setup.
- [ ] **Tenant scoping** verified — repository methods filter by `organization_id`.
- [ ] **PII fields encrypted** according to `02-DATA_MODEL.md` encryption catalog.
- [ ] **Audit log captured** for any create/update/delete on business data.
- [ ] **Idempotency** considered for mutations with external side effects.
- [ ] **Swagger / OpenAPI** updated for new endpoints (DTOs, response shapes, status codes).
- [ ] **Error codes** added to `@school/shared/errors` and used consistently.
- [ ] **Rate limits** evaluated for new public/auth-adjacent endpoints.
- [ ] **Logging at boundaries** (info-level business events; warn/error where appropriate).
- [ ] **No N+1 introduced** — checked with the simplest list test (or query log review).
- [ ] **DB indexes** added for new query patterns (composite with `organization_id`).
- [ ] **FK `ON DELETE` chosen deliberately** (default `RESTRICT` unless documented otherwise).

## Frontend tasks (in addition)

- [ ] **Form validation** uses the Zod schema from `@school/shared` (no duplicate schemas).
- [ ] **Server errors mapped** to React Hook Form errors via `details.fields`.
- [ ] **Loading / empty / error states** present and visually correct.
- [ ] **Mobile layout** verified (coach attendance especially).
- [ ] **Keyboard navigation** works on forms, modals, and tables.
- [ ] **Permissions** gate visible actions via CASL `useAbility`.
- [ ] **TanStack Query** keys are stable and invalidated correctly on mutations.
- [ ] **No `useEffect` data fetching** (use TanStack Query instead).
- [ ] **i18n** strings via `t(...)` (no hardcoded user-facing strings).
- [ ] **Currency / date formatting** uses the project helpers.
- [ ] **Sentry boundary** does not swallow useful errors.
- [ ] **Accessibility**: jsx-a11y lint clean; meaningful labels; focus states visible.

## Security & LGPD (when applicable)

- [ ] **No PII in logs** — verified by tailing logs during local test, or by reading redaction config.
- [ ] **No PII in error responses** — generic messages for security-sensitive failures.
- [ ] **Encryption transformer** applied to all new PII columns.
- [ ] **Search-hash column** added for fields requiring lookup.
- [ ] **Consent rules** enforced (`data_processing` for student creation, `marketing` for marketing comms).
- [ ] **Anonymization** path considered for any new entity that holds PII.
- [ ] **Audit log** writes for all mutations on PII-bearing entities.

## Infrastructure / CI (when applicable)

- [ ] **Workflow runs locally** (where applicable, e.g. nektos/act) or in a draft PR.
- [ ] **Secrets** added to provider (Doppler + CI) when introducing new envs.
- [ ] **`.env.example`** updated.
- [ ] **Healthcheck** still works after change.
- [ ] **Deploy path** validated (deployed to staging successfully before considering done).

## Documentation tasks

- [ ] **Affected docs** updated and consistent.
- [ ] **New ADR** created if an architectural decision was made.
- [ ] **Glossary** updated if a new domain term was introduced.

## Definition of "tested enough"

A common failure mode is shipping with technically-passing tests that cover nothing.
Use these heuristics:

- **For a use case:** at least one happy-path test + one test per branch (each `if`, each thrown error, each significant condition).
- **For a controller:** auth/perm/ownership rejection tests + happy path + main validation error.
- **For an event handler:** at least one test verifying the handler reacts and produces the expected effect.
- **For UI behavior:** one test per non-trivial interaction (submit, validation, conditional render).
- **For multi-tenancy:** a dedicated test that another org cannot perform the same operation.

If you can delete a test and **no other test fails**, you're not testing enough or testing the wrong thing.

## What "ready for review" means

The PR should be:

- **Self-explanatory** from the description alone for a teammate not in context.
- **Small enough to review** — ideally < 400 lines of net change. Larger PRs require justification.
- **Focused** — one feature or fix per PR. Refactors split into separate PRs when possible.
- **Greened by CI** — never request review with red CI.
- **Tagged** with the relevant sprint number (label or branch prefix).

## Common "almost done" rejections

These come back from review every time. Catch them yourself:

1. ❌ Tests changed but coverage % dropped.
2. ❌ Migration generated but not run (or not reversible).
3. ❌ New endpoint missing from Swagger.
4. ❌ Permission added but not in seed.
5. ❌ Empty state forgotten on a new list view.
6. ❌ `console.log` left in for debugging.
7. ❌ Strings hardcoded instead of in i18n.
8. ❌ Sentry crash on unhandled rejection.
9. ❌ N+1 query on the list endpoint.
10. ❌ Frontend form happy but server returns 422 with no error display.
