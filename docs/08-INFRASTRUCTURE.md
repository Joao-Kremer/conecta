# 11 — Infrastructure

> **When to read:** Setting up local env, modifying Docker/CI, deploying, or debugging an environment-specific issue.
> **Prerequisites:** `01-ARCHITECTURE.md`, `05-BACKEND_GUIDE.md`
> **TL;DR:** Docker Compose for local. GitHub Actions for CI/CD. Vercel for web, Railway (or Fly) for API, Neon for Postgres, Upstash for Redis. Migrations run as a separate job before app deploy.

---

## Environments

| Environment | Branch | URL pattern | Purpose |
|-------------|--------|-------------|---------|
| local | (any) | `localhost` | Dev box |
| staging | `develop` | `staging.conecta.app` | Pre-prod validation, demo |
| production | `main` (via tag) | `app.conecta.app` | Real users |

**Promotion path:** `feat/*` → PR → `develop` (auto-deploys to staging) → tag → `main` (auto-deploys to prod after manual approval).

## Local development (Docker Compose)

`docker-compose.yml` runs the infrastructure dependencies, **not** the apps (those run via `pnpm dev` for hot reload).

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: conecta
      POSTGRES_PASSWORD: conecta
      POSTGRES_DB: conecta_dev
    ports: ['55432:5432']   # host 55432 avoids conflict with local Postgres (5432) and other containers (5433)
    volumes: ['postgres-data:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U conecta -d conecta_dev']
      interval: 5s

  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s

  mailpit:                                # captures dev emails; UI at http://localhost:8025
    image: axllent/mailpit:latest
    ports: ['1025:1025', '8025:8025']

volumes:
  postgres-data:
  redis-data:
```

**Why not Dockerize the apps locally?** Hot reload + pnpm + Turborepo is faster and simpler outside containers during development. Containers are for staging/prod parity.

## Dockerfiles (production)

### API

`apps/api/Dockerfile`:

```dockerfile
# Stage 1 — builder
FROM node:20-alpine AS builder
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @conecta/api... build

# Stage 2 — runner
FROM node:20-alpine AS runner
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /repo/apps/api/dist ./dist
COPY --from=builder /repo/apps/api/package.json ./
COPY --from=builder /repo/packages/shared/dist ./node_modules/@conecta/shared/dist
COPY --from=builder /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml ../
RUN pnpm install --prod --frozen-lockfile
EXPOSE 3001
CMD ["node", "dist/main.js"]
```

Considerations:
- Multistage to keep the final image small.
- `--prod` install excludes dev deps.
- Container runs as non-root user (`USER node`).
- Healthcheck via `HEALTHCHECK CMD curl -f http://localhost:3001/health || exit 1`.

### Web

Web runs on **Vercel**, which builds from source. No Dockerfile needed.
If self-hosting becomes a requirement, use `next start` with the Next-provided standalone output.

## CI/CD (GitHub Actions)

### `.github/workflows/ci.yml` — runs on every PR

```yaml
name: CI
on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

jobs:
  lint-typecheck-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: test }
        ports: ['5432:5432']
        options: --health-cmd pg_isready
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test -- --coverage
      - run: pnpm test:isolation
      - uses: codecov/codecov-action@v4

  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm audit --audit-level=high

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: gitleaks/gitleaks-action@v2
```

### `.github/workflows/deploy-staging.yml` — runs on `develop` push

Steps:
1. Run CI gate (lint, typecheck, test).
2. **Run migrations against staging DB** in a dedicated job (`pnpm --filter @conecta/api migration:run`).
3. If migration step succeeds, deploy API to Railway (or Fly).
4. Web deploys automatically via Vercel's Git integration.
5. Smoke test: hit `/health/ready` and a couple of read endpoints; fail the deploy if not green.

### `.github/workflows/deploy-prod.yml` — runs on tag push

- Triggered by `v*.*.*` tags from `main`.
- Same flow as staging, with an **approval gate** (`environment: production`) requiring a maintainer click.
- Migration step is the riskiest part — see "Migration safety" below.

## Migration safety

1. **Migrations run before app deploy**, in a job that can fail without affecting running app.
2. **All migrations are reversible.** Generate with TypeORM CLI, then **manually inspect** the `down`.
3. **Backwards-compatible migrations only.** No drop column / rename column in a single deploy. Use the **expand-and-contract** pattern:
   - Deploy A: add new column (nullable).
   - Deploy B: write to both columns.
   - Backfill data.
   - Deploy C: read from new column.
   - Deploy D: drop old column.
4. **No long-running locks.** For large tables (when they appear), use `CREATE INDEX CONCURRENTLY`, batched updates, etc.
5. **Backup before risky migrations.** Neon has PITR — but trigger a snapshot before destructive changes anyway.

## Secrets

- **Source of truth:** Doppler or Infisical.
- Synced into Railway / Vercel / GitHub Actions via their integrations.
- Local: `.env.local` (gitignored). `.env.example` is committed with placeholder values.
- Never commit real secrets. Pre-commit hook with `gitleaks` and CI gate.

### Required env vars

See `apps/api/.env.example` and `apps/api/src/infrastructure/config/env.schema.ts` for the canonical list. Summary:

```
# Required at boot
NODE_ENV
PORT
DATABASE_URL
REDIS_URL
JWT_SECRET                        min 32 chars
COOKIE_SECRET                     min 32 chars
ENCRYPTION_KEY                    32 bytes, base64-encoded (openssl rand -base64 32)
SEARCH_HASH_SECRET                min 32 chars

# Sprint 1+
JWT_ACCESS_TOKEN_TTL              seconds (default 900)
JWT_REFRESH_TOKEN_TTL             seconds (default 2592000)
APP_URL
WEB_URL
RESEND_API_KEY                    empty → use Mailpit in dev
MAIL_FROM
```

Web app (Sprint 2) additionally needs:
```
NEXT_PUBLIC_API_URL
NEXT_PUBLIC_APP_URL
```

## Providers (chosen for MVP)

| Concern | Provider | Why |
|---------|----------|-----|
| API runtime | Railway or Fly.io | Simple container deploys, autoscale, low ops overhead |
| Web hosting | Vercel | Best-in-class Next.js DX, generous free tier |
| Postgres | Neon | Serverless, branching for previews, point-in-time recovery |
| Redis | Upstash | Serverless, generous free tier, BullMQ works fine |
| Object storage | Cloudflare R2 | S3-compatible, no egress fees, cheap |
| Email | Resend | Modern DX, good deliverability, free tier |
| Payments | Asaas | Best Brazilian gateway for Pix + boleto + subscriptions |
| Error tracking | Sentry | Standard, generous free tier |
| Log aggregation | Axiom or Better Stack | Cheap structured log search |
| Secrets | Doppler | Or Infisical — both fine |

Reasoning: all have free or near-free tiers suitable for an MVP; all are replaceable behind ports (see `01-ARCHITECTURE.md`).

## DNS & TLS

- Domain managed via Cloudflare DNS.
- TLS terminated at the provider (Vercel + Railway both handle it).
- HSTS headers configured (`04-SECURITY_AND_LGPD.md`).
- Apex `app.conecta.app`, `api.conecta.app`, `staging.*` — final domain TBD before launch.

## Backups & disaster recovery

| Data | Strategy | RPO | RTO |
|------|----------|-----|-----|
| Postgres | Neon PITR (7-day retention) | < 1 min | < 1 hour |
| Object storage (R2) | Versioning + lifecycle rules | n/a | < 1 hour |
| Application | Stateless, redeployable from Git | n/a | < 30 min |
| Secrets | Doppler vault + offline copy of master | n/a | < 1 hour |

Run a **disaster recovery drill** quarterly: restore a backup to a fresh DB, verify the app boots against it, verify a sample of records.

## Observability stack on infra

| Layer | Tool |
|-------|------|
| Uptime monitoring | UptimeRobot / BetterStack, pinging `/health` |
| Error tracking | Sentry (backend + frontend) |
| Structured logs | Axiom or BetterStack Logs (drained from Railway/Vercel) |
| Queue dashboard | `/admin/queues` (bull-board), ADMIN only |
| DB metrics | Neon dashboard |
| Redis metrics | Upstash dashboard |

Alerts:
- `/health/ready` failing > 2 min → page on duty.
- Sentry error spike (P0 errors) → notify.
- Queue DLQ > 0 → notify within 15 min.

## Local setup checklist for a new dev

1. Install: Node 20 LTS, pnpm 9+, Docker.
2. Clone repo, `cp apps/api/.env.example apps/api/.env`, set `ENCRYPTION_KEY=$(openssl rand -base64 32)`.
3. `pnpm install`.
4. `docker compose up -d`.
5. `pnpm --filter @conecta/api migration:run`.
6. `pnpm dev`.
7. Hit `http://localhost:3001/health/ready` — should return `{"status":"ok","database":"up"}`.

If any step fails: open an issue. If you fix something during setup that wasn't in the docs, add a PR updating this section.
