# Conecta

Multi-tenant SaaS platform for managing sports schools (escolinhas esportivas).
One organization can run multiple physical schools, each offering modalities from the
organization's catalog, organized in classes with students, guardians, attendance,
billing (Pix/boleto/subscriptions), and internal notifications.

## Stack

- **Backend:** NestJS + TypeORM + PostgreSQL + Redis + BullMQ
- **Frontend:** Next.js (App Router) + TanStack Query + Tailwind + shadcn/ui
- **Monorepo:** Turborepo + pnpm workspaces
- **Auth:** HTTP-only cookies + JWT access + rotating refresh tokens
- **Payments:** Asaas adapter behind `PaymentGatewayPort` — each tenant connects their own Asaas account; platform is never a financial intermediary
- **Multi-tenant:** Shared DB with `organization_id` discriminator + AsyncLocalStorage context
- **White-label:** Each tenant configures brand colors, logo, favicon, and name — applied across app, emails, and PDFs

## Documentation

**Start here:** [`docs/README.md`](./docs/README.md)

All architecture, features, conventions, and decisions live in [`docs/`](./docs/).
If you are a Claude Code agent, also read [`CLAUDE.md`](./CLAUDE.md) first.

## Quick start (local development)

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker

# 1. Install
pnpm install

# 2. Copy env and fill in required secrets
cp apps/api/.env.example apps/api/.env
# Must set: ENCRYPTION_KEY=`openssl rand -base64 32`

# 3. Start infrastructure (Postgres, Redis, Mailpit)
docker compose up -d

# 4. Run migrations
pnpm --filter @conecta/api migration:run

# 5. Start dev server
pnpm dev

# API:     http://localhost:3001
# Health:  http://localhost:3001/health/ready
# Mailpit: http://localhost:8025  (captures all outbound email in dev)
```

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Run all apps in dev mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Run `tsc --noEmit` across the monorepo |
| `pnpm test` | Run unit + integration tests |
| `pnpm test:e2e` | Run e2e tests (Playwright) |
| `pnpm --filter @conecta/api migration:generate -- src/infrastructure/database/migrations/<Name>` | Generate a new migration |
| `pnpm --filter @conecta/api migration:run` | Apply pending migrations |
| `pnpm --filter @conecta/api migration:revert` | Revert the last migration |

## Repository structure

```
.
├── apps/
│   ├── api/                 # NestJS backend
│   └── web/                 # Next.js frontend (Sprint 2)
├── packages/
│   ├── shared/              # Zod schemas, types, permissions
│   ├── ui/                  # Shared React components (Sprint 2)
│   ├── eslint-config/       # Shared lint config
│   └── tsconfig/            # Shared TS config
├── docs/                    # All project documentation
├── CLAUDE.md                # Agent instructions
├── docker-compose.yml
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Contributing

### Workflow

1. **Pick a task** from `docs/09-SPRINTS.md` (or get one assigned).
2. **Create a branch** off `develop`: `git checkout -b feat/<sprint>-<short-description>`.
3. **Implement** following the relevant guidelines in `docs/`.
4. **Write tests** alongside the code (see `docs/07-TESTING.md`).
5. **Update docs** affected by your change.
6. **Run the full check locally:**
   ```bash
   pnpm lint && pnpm typecheck && pnpm test
   ```
7. **Push and open a PR** against `develop`. Fill the PR template completely.
8. **Self-review the diff** before requesting human review.
9. **Iterate on feedback.** Squash-and-merge when approved and CI is green.

### Branch naming

| Prefix | Use for |
|--------|---------|
| `feat/` | New features |
| `fix/` | Bug fixes |
| `refactor/` | Refactors without behavior change |
| `chore/` | Tooling, CI, deps |
| `docs/` | Documentation only |
| `test/` | Test-only changes |
| `perf/` | Performance improvements |

Examples: `feat/s1-auth-refresh-rotation`, `fix/s3-student-cpf-validation`.

### Commit messages

Conventional Commits format:

```
<type>(<scope>): <subject>

<body — optional, explain why, not what>

<footer — optional, BREAKING CHANGE or issue ref>
```

Examples:
- `feat(auth): add refresh token rotation`
- `fix(students): validate CPF before encryption`
- `refactor(enrollments): extract MonthlyFee value object`
- `docs(data-model): document SchoolModality price override`

### Definition of Done

A task is **only** done when every item in the Definition of Done section of `docs/07-TESTING.md` is satisfied. No exceptions.

### Reviewing

- Read the PR description first.
- Check the diff against the relevant guideline doc.
- Verify tests cover the change.
- Verify docs were updated where needed.
- Run it locally if the change is non-trivial.

### When in doubt

Ask. A 30-second question is cheaper than a 2-hour rewrite.
