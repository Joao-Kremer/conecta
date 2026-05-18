## What changed

<!-- One or two sentences. Link the sprint item from docs/09-SPRINTS.md. -->

## Why

<!-- The problem this solves or the decision behind it. Link an ADR if architectural. -->

## How to test

<!-- Exact steps / commands a reviewer runs to verify. -->

## Follow-ups

<!-- Anything intentionally deferred (with a tracking note). "None" if nothing. -->

## Definition of Done (see docs/07-TESTING.md)

- [ ] `pnpm lint && pnpm typecheck && pnpm test` green locally
- [ ] No `any` / `@ts-ignore` / `synchronize: true` introduced (or justified here)
- [ ] No secrets, no stray `console.log`, no commented-out code, no untracked TODOs
- [ ] Tests added/updated with the code (unit + integration/isolation where applicable)
- [ ] Migrations reviewed and reversible (if schema changed)
- [ ] Affected docs updated in this PR; `docs/09-SPRINTS.md` checkboxes ticked
- [ ] Self-reviewed the diff
