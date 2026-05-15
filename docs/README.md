# Documentation index

This folder is the **single source of truth** for the project. Code follows docs.
If you find a discrepancy, fix the doc or the code, but never let them diverge.

## How to use this folder

Ten focused documents, numbered to indicate reading order for new contributors (human or AI):

| # | Document | What it covers | When to read |
|---|----------|----------------|--------------|
| — | [`PROJECT_PLAN.md`](./PROJECT_PLAN.md) | Original consolidated plan (historical) | Reference only |
| 01 | [`01-ARCHITECTURE.md`](./01-ARCHITECTURE.md) | Vision, monorepo, Clean Architecture, conventions | First, before any code |
| 02 | [`02-DATA_MODEL.md`](./02-DATA_MODEL.md) | Full schema, invariants, glossary of domain terms | Any DB work or term confusion |
| 03 | [`03-AUTH_AND_PERMISSIONS.md`](./03-AUTH_AND_PERMISSIONS.md) | Auth flow, RBAC, permissions catalog, ownership | Any auth/perms work |
| 04 | [`04-SECURITY_AND_LGPD.md`](./04-SECURITY_AND_LGPD.md) | Encryption, consent, anonymization, uploads | Any PII handling |
| 05 | [`05-BACKEND_GUIDE.md`](./05-BACKEND_GUIDE.md) | NestJS + TypeORM patterns, API contracts, observability | Any API work |
| 06 | [`06-FRONTEND_GUIDE.md`](./06-FRONTEND_GUIDE.md) | Next.js patterns, style guide, white-label theming | Any UI work |
| 07 | [`07-TESTING.md`](./07-TESTING.md) | Testing strategy + Definition of Done | Always |
| 08 | [`08-INFRASTRUCTURE.md`](./08-INFRASTRUCTURE.md) | Docker, CI/CD, deploy, environments | Deploy work |
| 09 | [`09-SPRINTS.md`](./09-SPRINTS.md) | Backlog with checkboxes ⭐ | Every session — check progress |
| 10 | [`10-DECISIONS.md`](./10-DECISIONS.md) | Architecture Decision Records (ADRs) | When making/revisiting a decision |

The root-level [`CLAUDE.md`](../CLAUDE.md) contains the agent's workflow and behavioral rules. Read it first in any AI session.

## Reading paths by task

**"I'm starting fresh."**
`CLAUDE.md` → `docs/README.md` (this file) → `01-ARCHITECTURE.md` → `09-SPRINTS.md` → `07-TESTING.md`

**"I'm implementing an API endpoint."**
`05-BACKEND_GUIDE.md` → `07-TESTING.md` (+ `03-AUTH_AND_PERMISSIONS.md` for auth, `04-SECURITY_AND_LGPD.md` for PII)

**"I'm building a UI screen."**
`06-FRONTEND_GUIDE.md` → `05-BACKEND_GUIDE.md` (for API contracts) → `07-TESTING.md`

**"I'm modifying the database schema."**
`02-DATA_MODEL.md` → `05-BACKEND_GUIDE.md` (TypeORM section) → `07-TESTING.md` → add entry to `10-DECISIONS.md` if it's a structural decision

**"I'm working on auth/permissions."**
`03-AUTH_AND_PERMISSIONS.md` → `04-SECURITY_AND_LGPD.md` → `05-BACKEND_GUIDE.md` → `07-TESTING.md`

**"I'm working on theming or brand assets."**
`06-FRONTEND_GUIDE.md` (Style guide + White-label sections) → `04-SECURITY_AND_LGPD.md` (uploads)

**"I'm setting up deploy."**
`08-INFRASTRUCTURE.md` → `05-BACKEND_GUIDE.md` (Observability section)

## Updating docs

- **Decision changed?** Update the affected doc(s) in the same PR. Add an entry to `10-DECISIONS.md` if it's architectural.
- **New feature?** Add it to `09-SPRINTS.md` as `[ ]` first, then implement.
- **New glossary term?** Update the Glossary section in `02-DATA_MODEL.md`.
- Never let code and docs diverge silently.

## Conventions for this folder

- Documents are in **English** for portability.
- Use **sentence case** for headings.
- Use **fenced code blocks** with language hints.
- Use **tables** for matrix-style information (perms, env vars, decisions).
- Prefer **concrete examples** over abstract prose.
