# 10 — Architecture decisions

> **When to read:** Reviewing or revisiting an architectural choice; before making a new one that may contradict an existing record.
> **TL;DR:** Seven decisions captured below. Each follows the lightweight ADR format (status, context, decision, alternatives, consequences). New decisions append here as `## NNNN — Title` sections.

## Index

| # | Title | Status |
|---|-------|:------:|
| [0001](#0001--typeorm-over-prisma) | TypeORM over Prisma | Accepted |
| [0002](#0002--http-only-cookies-with-rotating-refresh) | HTTP-only cookies with rotating refresh | Accepted |
| [0003](#0003--modality-global-with-schoolmodality-offering) | Modality global with SchoolModality offering | Accepted |
| [0004](#0004--clean-architecture-per-module) | Clean Architecture per module | Accepted |
| [0005](#0005--multi-tenancy-via-discriminator--asynclocalstorage) | Multi-tenancy via discriminator + AsyncLocalStorage | Accepted |
| [0006](#0006--shared-zod-schemas-as-the-api-contract) | Shared Zod schemas as the API contract | Accepted |
| [0007](#0007--white-label-via-css-variables-with-tenant-derivation) | White-label via CSS variables with tenant derivation | Accepted |
| [0008](#0008--tenant-owned-asaas-accounts-with-abstract-gateway-port) | Tenant-owned Asaas accounts with abstract gateway port | Accepted |
| [0009](#0009--internal-notifications-instead-of-full-communications-system-in-mvp) | Internal notifications instead of full communications system in MVP | Accepted |
| [0010](#0010--mvp-focused-on-essential-operational-features-polish-and-growth-deferred-to-v11) | MVP focused on essential operational features, polish and growth deferred to v1.1 | Accepted |

## When to add a new decision

Add one when any of these is true:
- A decision changes how a class of problems is solved.
- The decision affects more than one module or area.
- A different person, six months from now, would benefit from knowing the rationale and rejected alternatives.
- We are reversing or amending an earlier decision.

Don't add one for bug fixes, refactors without architectural shape change, or single-feature implementation details.

## Updating a decision

Decisions are append-only. If a decision changes: add a new entry, mark the old one **Superseded by NNNN** with a link, and update the affected guideline doc(s).

---

## 0001 — TypeORM over Prisma

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

The backend needs an ORM/query layer for PostgreSQL. The realistic candidates in the Node/TypeScript ecosystem are **TypeORM**, **Prisma**, **Drizzle**, and **MikroORM**. The choice constrains the data layer, migrations, transactions, and how clean we can keep the domain layer.

Constraints and preferences:
- Strong TypeScript typing without giving up control of queries.
- Migrations as code, versioned in the repo, reviewable in PR, reversible.
- Comfortable transaction story (including nested / propagation).
- Repository pattern (Clean Architecture). The ORM must be hideable behind abstract repositories.
- No "magic" cross-process tooling that owns the schema externally.
- Owner has prior experience with TypeORM and is choosing it explicitly.

### Decision

We use **TypeORM** for all DB access.

Specifics:
- Entity-first modeling, migrations generated via `migration:generate` from entity diffs and reviewed manually.
- `synchronize: false` always — migrations are the only way schema changes.
- Entities are placed in `modules/<feature>/domain/entities/` despite carrying decorators (pragmatic coupling).
- Abstract repositories in `modules/<feature>/domain/repositories/`; concrete implementations in `infrastructure/repositories/`.
- Custom `EntitySubscriberInterface` (TenantSubscriber) enforces multi-tenant invariants at the ORM boundary.
- A custom encryption transformer handles encrypted columns transparently.

### Alternatives considered

1. **Prisma**
   - Pros: excellent DX, strongest end-to-end types, fast iteration.
   - Cons (in our context):
     - Schema lives in a separate DSL — duplicates source of truth.
     - Migrations work great but are less flexible for the expand-and-contract patterns we'll need.
     - Custom logic per column (e.g. our encryption transformer) is awkward; Prisma's middleware / extensions are improving but still less flexible than TypeORM subscribers for cross-cutting behavior.
     - Repository pattern is unconventional with Prisma; teams often skip abstraction and end up coupling everything to `prisma.client`.
   - Decision: rejected primarily for the source-of-truth duplication and the harder fit with our transformer/subscriber needs.

2. **Drizzle**
   - Pros: thin, fast, type-safe.
   - Cons: schema as TS literals (good), but less mature ecosystem, fewer integrations with NestJS, and less battle-tested in production at the scale we anticipate.
   - Decision: deferred — strong candidate for future projects; not the most predictable choice today.

3. **MikroORM**
   - Pros: similar entity-first model to TypeORM, identity map, unit of work.
   - Cons: smaller community; team familiarity is lower; differences from TypeORM aren't large enough to justify the switch.
   - Decision: rejected on familiarity grounds.

### Consequences

**Positive**
- One source of truth for schema (entities).
- Mature in Nest land — well-documented patterns for repos, transactions, subscribers, custom transformers.
- Owner familiarity reduces ramp time.
- Encryption transformer is a clean fit.

**Negative**
- TypeORM has historically had quirks (active record vs data mapper confusion, decorator parsing issues, occasional surprising behavior on cascading saves). We mitigate by sticking strictly to Data Mapper style and explicit query builders.
- Slightly more verbose than Prisma for simple queries.
- Generated migrations sometimes need manual cleanup.

**Neutral**
- We commit to **explicit `andWhere('organization_id = :orgId')`** in repositories rather than relying solely on the subscriber. This is more verbose but safer.

### References

- TypeORM docs: <https://typeorm.io>
- Prisma docs: <https://www.prisma.io/docs>
- `05-BACKEND_GUIDE.md` — TypeORM rules and patterns

---

## 0002 — HTTP-only cookies with rotating refresh

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

We need an auth strategy for a multi-tenant web app (Next.js frontend, NestJS backend) serving distinct personas (Admin, Staff, Coach, Guardian). The strategy must:

- Be safe by default against common web threats (XSS, CSRF, token theft).
- Support real revocation (logout, password reset, suspicious activity).
- Allow short-lived access tokens without forcing frequent logins.
- Work from a Next.js Server Component context (cookies are the natural transport).
- Be implementable without a third-party auth provider in the MVP.

### Decision

We use a **dual-token strategy on HTTP-only, Secure, SameSite=Strict cookies**, with **rotating refresh tokens** and **reuse detection**:

- **Access token**: short-lived (15 min) JWT signed HS256. Lives in `__Host-access` cookie.
- **Refresh token**: opaque random (256-bit), stored hashed (argon2id) in the `sessions` table. Lives in `__Host-refresh` cookie, `Path=/auth/refresh`.
- On each refresh, the current session is marked replaced and a new session is issued. Tokens are part of a **family** so that reuse of a revoked token revokes the entire family (defense against stolen-token replay).
- Mutating requests must include `X-Requested-With: school-platform` as defense in depth on top of `SameSite=Strict`.

The Next.js app uses Route Handlers (`/api/*`) to forward cookies between the browser and the NestJS API, keeping all cookies on a single origin.

### Alternatives considered

1. **Single long-lived JWT in localStorage / Authorization header**
   - Pros: simple; popular in tutorials.
   - Cons: vulnerable to XSS; no real revocation without an external blacklist; same-origin policy doesn't help if a script can read it.
   - Decision: rejected on security grounds.

2. **Access JWT + refresh JWT (both as JWTs)**
   - Pros: stateless on both.
   - Cons: refresh JWT cannot be revoked without a blacklist. Loses the very property that makes refresh tokens useful.
   - Decision: rejected.

3. **Opaque access + opaque refresh (DB lookup on every request)**
   - Pros: maximum revocation freshness.
   - Cons: extra DB hop per request; cache layer needed.
   - Decision: rejected as primary mechanism (we use opaque only for refresh to avoid the hot-path cost; permissions are cached in Redis instead).

4. **Third-party auth (Clerk, Auth0, Supabase Auth, Kinde)**
   - Pros: less code; built-in MFA, social, audit.
   - Cons: vendor coupling; multi-tenant role/permission model is custom enough that we'd still build most of the authorization layer ourselves; cost grows with users; potential issues exporting users if we ever switch.
   - Decision: deferred. We will revisit if MFA + social become urgent and our in-house implementation cost looks higher than vendor cost.

### Consequences

**Positive**
- Cookies are not readable by JS — strong XSS isolation.
- `SameSite=Strict` + `X-Requested-With` header neutralizes CSRF on modern browsers.
- Refresh rotation with reuse detection upgrades the security posture beyond typical implementations.
- Sessions table makes "log out everywhere" trivial.
- Works seamlessly with Server Components.

**Negative**
- Cross-origin scenarios (e.g. a future native mobile app) need adjustments — likely a different cookie strategy or a token-exchange flow.
- The Next.js Route Handler proxy adds a small latency hop. Acceptable.
- Anyone reverse-engineering the API must understand cookies, not just bearer tokens. Documentation must be clear.

**Neutral**
- We must own MFA implementation when it's activated (post-MVP).
- All clients must opt into the custom CSRF header. Documented in `05-BACKEND_GUIDE.md`.

### References

- OWASP: Session Management Cheat Sheet
- Auth0 blog: rotating refresh tokens
- `03-AUTH_AND_PERMISSIONS.md` for the operational details
- `04-SECURITY_AND_LGPD.md` for related threats and mitigations

---

## 0003 — Modality global with SchoolModality offering

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

An Organization may operate multiple physical Schools. Each School offers a subset of the Organization's sport modalities, potentially at different prices. Classes belong to a (School, Modality) pair. Reports need to:

- Compare the same Modality across Schools.
- Allow each School to set its own price for a Modality.
- Allow a Class to override the price further (e.g. promotional Class).

We need a data model that supports all three without duplication or ambiguity.

### Decision

A **two-level model**:

1. **Modality** at the Organization level: the catalog item ("Football", "Volleyball"). Lives in `modalities` keyed by `organization_id`. Unique by name within an Organization.

2. **SchoolModality**: the offering of a Modality by a specific School. Lives in `school_modalities` with `(school_id, modality_id)` unique. Carries:
   - `default_monthly_fee_cents`
   - `default_enrollment_fee_cents`
   - `active` flag

3. **Class** belongs to a SchoolModality and may optionally **override** `monthly_fee_cents`.

4. **Enrollment** stores a **snapshot** of `monthly_fee_cents` at the moment it's created, so retroactive price changes don't alter active contracts.

### Alternatives considered

1. **Modality per School (no global catalog)**
   - Pros: simplest table model.
   - Cons: same sport across Schools becomes different rows ("Football@SchoolA" ≠ "Football@SchoolB"). Cross-school reports require fuzzy matching or a hidden mapping table. Renaming requires touching all rows.
   - Decision: rejected.

2. **Global Modality with price on Modality**
   - Pros: simple.
   - Cons: cannot vary price per School. Cannot deactivate per School.
   - Decision: rejected.

3. **Global Modality + SchoolModality (chosen)**
   - Pros: each School can offer its own subset and set its own price.
   - Cons: one more table, slight cognitive overhead. Resolved by clear naming and docs.
   - Decision: **chosen**.

4. **Modality with category/tags only, all pricing on Class**
   - Pros: ultra-flexible.
   - Cons: no notion of "this School offers this Modality" without inferring from Class rows; reporting becomes a Class-aggregation gymnastics; deactivating an offering temporarily (no Classes for it for 2 months) loses its anchor.
   - Decision: rejected.

### Consequences

**Positive**
- Clean reports: "Revenue by Modality, by School."
- Price changes at SchoolModality level cascade to **new** Classes/Enrollments without retroactively affecting existing ones (snapshot on Enrollment).
- Easy to deactivate an offering (`school_modalities.active = false`) without losing data.
- Catalog stays consistent across Schools.

**Negative**
- One extra join on Class lookups when displaying offering details.
- Requires explicit communication when adding a new modality: it appears in the catalog but needs to be activated per School.

**Neutral**
- Migration overhead is a one-time concern (Sprint 1 / Sprint 3).
- UI must surface this clearly: "Modalities" (org-level catalog) vs "Modalities at this school" (the offering).

### References

- `02-DATA_MODEL.md` for the schema
- `01-ARCHITECTURE.md` for the domain hierarchy
- `02-DATA_MODEL.md` for the Modality vs SchoolModality distinction

---

## 0004 — Clean Architecture per module

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

The NestJS API will grow to ~20 modules covering identity, hierarchy, people, enrollments, attendance, finance, communications, reports, and more. Without an enforced internal structure, modules tend to mix concerns: HTTP code calling repositories directly, services that own domain rules, business logic in controllers, etc. This kills testability and makes the codebase brittle.

We want:
- Pure, fast-to-test domain logic.
- Clear places for HTTP concerns, persistence, and external systems.
- A predictable shape so contributors find any feature quickly.
- Defensible dependency direction.

### Decision

Every business module under `apps/api/src/modules/<feature>` follows a **Clean Architecture** layout with four layers:

```
modules/<feature>/
├── domain/               # entities, VOs, domain events, abstract repositories
├── application/          # use cases, ports, application DTOs
├── infrastructure/       # TypeORM repos, external adapters, persistence
└── presentation/         # controllers, HTTP DTOs, presenters, the Nest module
```

**Dependency direction (strict, lint-enforced):**

```
presentation → application → domain ← infrastructure
```

- `domain` imports nothing from other layers.
- `application` imports only from `domain`.
- `infrastructure` may import `domain` and `application` (to implement their interfaces).
- `presentation` imports from `application` and `domain`.

Pragmatic concessions:
- Entities carry TypeORM decorators. We accept this coupling for ergonomics; the rest of the domain layer remains framework-free.
- Use cases inject **abstract** repository classes from `domain/repositories/` — never the TypeORM-flavored implementation.

ESLint `import/no-restricted-paths` enforces the rules.

### Alternatives considered

1. **Conventional NestJS layout (controller → service → repository)**
   - Pros: most familiar to Nest developers; minimal ceremony.
   - Cons: "service" becomes a kitchen sink; business rules slip into HTTP and persistence layers; tests need the framework.
   - Decision: rejected.

2. **Hexagonal Architecture (ports & adapters), flat**
   - Pros: same dependency rules, simpler folder layout.
   - Cons: at our anticipated module count, a flat layout makes it hard to find things; Clean Architecture's per-module folder structure is more navigable.
   - Decision: rejected as the *primary* layout, but the concepts are absorbed (we still call external boundaries "ports" and "adapters").

3. **DDD-strict with aggregates and repositories**
   - Pros: very clear modeling for complex domains.
   - Cons: overkill at MVP scale; ceremony burden for simple CRUD-y modules.
   - Decision: rejected as a strict rule; we adopt DDD vocabulary (entity, value object, aggregate root, domain event) where it adds clarity.

4. **Functional core, imperative shell**
   - Pros: maximizes purity of business logic.
   - Cons: less idiomatic with TypeORM and Nest's DI; learning curve.
   - Decision: rejected for this team / this stack.

### Consequences

**Positive**
- Use cases are pure TypeScript classes — testable with in-memory fakes and tens of milliseconds per test.
- Infrastructure can be swapped without touching domain (we could move off TypeORM in the future without a full rewrite).
- New contributors learn one structure and apply it across modules.
- Easy to identify cross-cutting concerns (they don't fit in any module → they live in `shared/`).

**Negative**
- More files per feature than a "controller + service" approach.
- Junior developers may chafe at the structure initially.
- Boilerplate for repository abstractions when the use case is trivial.

**Neutral**
- ESLint rules must be respected. Bypassing them is a code review blocker.
- We accept some pragmatic coupling (TypeORM decorators on entities) to avoid mapper layers between domain and persistence.

### References

- "Clean Architecture" — Robert C. Martin
- "Hexagonal Architecture" — Alistair Cockburn
- `01-ARCHITECTURE.md` for the module skeleton
- `05-BACKEND_GUIDE.md` for layer-specific rules

---

## 0005 — Multi-tenancy via discriminator + AsyncLocalStorage

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

The platform is multi-tenant by design — one codebase serves many Organizations. Tenant isolation is a security-critical requirement: a bug or a missed `WHERE` clause must not cause cross-tenant data leakage.

Decisions required:
1. How is tenant data physically separated (one DB, schema-per-tenant, DB-per-tenant)?
2. How is the current tenant propagated through request handling?
3. How do we enforce isolation defensively at multiple layers?

### Decision

### Physical layout: shared database, shared schema, `organization_id` discriminator

Every business table has an `organization_id` column. Composite indexes lead with `organization_id`. No PostgreSQL schemas or separate DBs per tenant.

### Tenant context propagation: AsyncLocalStorage

A `RequestContext` is established by the `AuthGuard` after decoding the access token. It contains:
- `userId`, `organizationId`, `roles`, `permissions`, `scopedSchoolIds`, `coachedClassIds`, `guardianIds`, `requestId`.

It is stored in Node's `AsyncLocalStorage`. Any code path running under the request (sync or async) can read it via a `RequestContext.get()` helper. This avoids threading `orgId` through every method signature.

### Defense in depth: five layers

1. **Application code** — repositories include `andWhere('organization_id = :orgId')` explicitly.
2. **TypeORM subscriber** — `TenantSubscriber` enforces `organizationId` on inserts (block cross-tenant writes) and adds the predicate to reads if missing (safety net + warn log).
3. **School scope** — `SchoolScopeInterceptor` adds `school_id IN (…)` for SCHOOL_STAFF users.
4. **DB constraints** — composite FKs and triggers enforce that joined rows share `organization_id`.
5. **Tests** — dedicated `test/isolation/` suite verifies every mutating endpoint cannot leak across tenants.

### Alternatives considered

1. **Schema per tenant**
   - Pros: hard isolation at the DB level.
   - Cons: schema migrations multiplied by tenant count; harder cross-tenant analytics; significantly more operational complexity for our anticipated tenant count (hundreds, not tens of thousands).
   - Decision: rejected for MVP. Reconsider if scale or compliance demands change.

2. **Database per tenant**
   - Pros: maximum isolation.
   - Cons: vastly higher operational cost, slow onboarding, hard reporting.
   - Decision: rejected.

3. **Row-Level Security (RLS) in Postgres as the primary enforcement**
   - Pros: enforcement at the DB regardless of app bugs.
   - Cons: requires every connection to set `org_id` per query; intrusive in a TypeORM-based stack; harder to debug and test; transparent to TypeORM tooling but adds friction (migrations, seeds need to be careful).
   - Decision: considered as an addition; **deferred**. We may turn on RLS as an additional defense layer post-MVP without changing application code, since application already filters explicitly.

4. **No explicit filtering — rely on a Nest interceptor that rewrites every query**
   - Pros: invisible.
   - Cons: easy to defeat; opaque; hard to audit.
   - Decision: rejected. Magic without explicit code is a security smell.

5. **Threading `orgId` through every method signature**
   - Pros: explicit, no hidden state.
   - Cons: noisy; impractical for deep call stacks; easy to forget one parameter.
   - Decision: rejected — AsyncLocalStorage gives us implicit context without losing testability (tests use `runWithContext(...)`).

### Consequences

**Positive**
- Simple operational model: one DB, one schema, standard migrations.
- Easy cross-tenant analytics for the platform owner.
- AsyncLocalStorage makes the tenant available everywhere without function-signature pollution.
- Five layers of defense reduce the chance that a single bug leaks data.

**Negative**
- We must remember to include the `organization_id` filter in every read. Mitigated by the subscriber safety net and isolation tests.
- Composite indexes get longer; storage cost slightly higher.
- AsyncLocalStorage is a Node-specific feature; if we ever cross runtimes (e.g. workers in Cloudflare Workers), we'd need an alternative.

**Neutral**
- Background jobs must reconstitute `RequestContext` from job data. We accept this and codify the pattern in `infrastructure/queues/`.
- We will revisit Postgres RLS post-MVP for an extra defense layer.

### References

- `03-AUTH_AND_PERMISSIONS.md` — multi-tenancy enforcement layers
- `05-BACKEND_GUIDE.md` — repository conventions
- `07-TESTING.md` — isolation test suite
- Node `AsyncLocalStorage` docs

---

## 0006 — Shared Zod schemas as the API contract

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

Backend and frontend exchange JSON over HTTP. Without a shared contract, the two sides drift: backend validates with one set of rules, frontend with another, and types diverge over time. Common solutions include:

- Auto-generating an SDK from OpenAPI / Swagger.
- Generating types from Prisma/Drizzle schemas.
- Sharing source types through a workspace package.
- tRPC (function-call style, sharing types directly).

We need a solution that:
- Keeps validation rules **identical** on both sides.
- Provides solid types without code-generation friction.
- Works with REST (we're not adopting tRPC for reasons unrelated to this ADR — we want a versioned REST surface).
- Lives in the monorepo without adding heavy tooling.

### Decision

We use **Zod schemas in `packages/shared`** as the single source of truth for everything crossing the API boundary.

- Each resource has a `*.schema.ts` file exporting input, output, and query schemas.
- Inferred TypeScript types are exported alongside (`type CreateStudentInput = z.infer<typeof createStudentInputSchema>`).
- **Backend** consumes the schemas via a `ZodValidationPipe` and exposes Swagger generated from them (via `nestjs-zod` or a similar bridge).
- **Frontend** consumes the schemas for React Hook Form (`zodResolver`) and for parsing API responses (defense against drift).
- The shared package also exports the error code catalog and the CASL ability factory, since they belong to the contract.

We **do not** auto-generate an SDK. We hand-write a typed API client per resource in `apps/web/src/lib/api/<resource>/`. This keeps client code reviewable and avoids regeneration steps in CI.

### Alternatives considered

1. **Auto-generated SDK from OpenAPI**
   - Pros: lots of tooling; canonical industry approach.
   - Cons: extra build step; generated code can be ugly; types are weaker than what we get from a hand-curated client + Zod parse on responses; subtle bugs around nullable handling, oneOf, enums.
   - Decision: rejected. We keep OpenAPI for documentation, not for code-gen.

2. **tRPC**
   - Pros: best DX for sharing types; no schema duplication.
   - Cons: ties us to a custom protocol; harder for non-JS clients; we want a stable REST surface for future integrations.
   - Decision: rejected.

3. **Types-only sharing (no runtime validation on the frontend)**
   - Pros: simple.
   - Cons: API drift sneaks in; runtime mismatches crash users instead of being caught.
   - Decision: rejected.

4. **class-validator DTOs shared across packages**
   - Pros: native Nest experience.
   - Cons: decorators don't translate cleanly to frontend; React Hook Form integration is awkward; would still need types-only for the FE.
   - Decision: rejected as the *primary* mechanism. We retain it as an option for module-local DTOs when it ergonomically beats Zod for a specific case.

### Consequences

**Positive**
- One schema defines validation, types, and (via a bridge) Swagger.
- Forms feel solid — same validation rules client + server.
- Refactors propagate naturally via TypeScript.
- No code-gen step in CI.

**Negative**
- Zod schemas are richer than OpenAPI on some constraints; mapping to Swagger may lose nuance. We accept this.
- Frontends in other languages can't easily consume Zod — we expose OpenAPI for them.
- Hand-written API client must be kept up to date; we mitigate by colocating client + schema usage tests.

**Neutral**
- For Swagger to remain useful, every controller must declare its Zod schema explicitly. We bake this into the controller scaffold template.
- Discoverability of "where is the schema for X" needs a clear convention — addressed in `01-ARCHITECTURE.md`.

### References

- Zod: <https://zod.dev>
- `05-BACKEND_GUIDE.md` — REST conventions
- `06-FRONTEND_GUIDE.md` — forms with Zod
- `05-BACKEND_GUIDE.md` — backend validation with Zod

---

## 0007 — White-label via CSS variables with tenant derivation

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

The product is sold to multiple sports schools (Organizations) that want to present **their** brand to staff, coaches, and especially parents. Without white-label, the platform looks like the same generic SaaS regardless of who's running it. White-label is a real commercial differentiator for B2B SaaS in this space.

We need a theming strategy that:
- Lets each Organization configure brand colors, logo, favicon, name.
- Applies in real-time across the app — no rebuild per tenant.
- Doesn't compromise accessibility or semantic UX (e.g. red is still "danger" even if a tenant's brand is red).
- Is cheap to implement in the MVP and extensible to fuller white-label (custom domain, custom emails) later.

### Decision

### Tenant-controlled tokens (MVP scope)

The tenant configures **exactly two colors** (`brandPrimary` and `brandAccent`), plus logo, favicon, and brand name. All other tokens are **derived deterministically** from those two colors using a small OKLCH-based algorithm (`culori`).

Specifically derived:
- `brand-primary-strong` (darker for hover, for text on `primary-soft`)
- `brand-primary-soft` (very light for backgrounds, tints)
- `brand-primary-on` (white or `primary-strong` depending on luminance)
- Equivalent trio for `accent`

### Runtime application via CSS variables

Theme is applied as a `<style>` block injected into `<head>` on every server render by the Next.js root layout. Tailwind tokens (`bg-primary`, `text-primary-strong`, etc.) reference these CSS variables in `tailwind.config.ts`.

This means **changing a tenant's theme has zero rebuild cost** — only the injected `<style>` differs per request.

### Fixed tokens

Semantic colors (success, warning, danger, info), neutrals (grays), spacing, radii, typography, and all elevation tokens are **fixed across all tenants** and live in `tailwind.config.ts` directly (not as CSS variables to override). This protects UX integrity and accessibility regardless of what color a tenant picks.

### Validation

Server-side Zod schema + runtime contrast check: any brand color must achieve WCAG AA contrast (≥ 4.5:1) against white. Frontend uses the same shared module for inline validation while the admin types.

### Logo and assets

Stored in Cloudflare R2 under per-tenant prefixes (`orgs/<orgId>/brand/`). Server validates MIME, size, and dimensions on upload. SVGs are sanitized server-side.

### Surfaces covered in MVP

- Web app (sidebar, header, buttons, active states, avatars)
- Login page (per-subdomain or `?org=<slug>` resolution)
- Transactional emails (inline-styled with `@react-email/components`)
- PDFs (receipts, certificates)
- Favicon

### Surfaces explicitly NOT in MVP

- Custom domain (`app.escolinha.com.br`) — requires per-tenant TLS, multi-tenant routing, DNS automation
- Email "From" with tenant domain — requires DKIM per tenant
- "Powered by SchoolHub" remains visible

These are added as roadmap items in `06-FRONTEND_GUIDE.md`.

### Alternatives considered

1. **Light white-label only (primary color + logo)**
   - Pros: smallest possible implementation.
   - Cons: insufficient personality. A single color barely registers without a paired accent. Logo without coordinated colors looks pasted-on.
   - Decision: rejected as too minimal for a real differentiator.

2. **Full preset palettes (no free color choice)**
   - Pros: zero risk of bad contrast or clashing colors.
   - Cons: tenants want **their** brand, not "the closest of 7 presets". Loses the most valuable property of white-label.
   - Decision: rejected. We may still offer presets as starting points in the UI (one-click "Soccer green", "Pool blue", etc.) but free choice is the model.

3. **Full free configuration (tenant sets every token)**
   - Pros: maximum flexibility.
   - Cons: enormous surface area for bad UX — tenants would set "danger" to brand-pink, semantic meaning collapses; accessibility burden becomes the tenant's; configuration UI becomes a small Figma.
   - Decision: rejected. Constrained choice is a feature, not a limitation.

4. **Build-per-tenant (Tailwind compiled with tenant tokens, served from a tenant subdomain)**
   - Pros: smallest CSS payload per tenant; static generation.
   - Cons: an extra build pipeline per tenant; cache invalidation nightmare; instant theme changes become slow.
   - Decision: rejected. Runtime CSS variables solve this elegantly.

5. **CSS-in-JS theming (Emotion, styled-components) instead of Tailwind tokens**
   - Pros: native JS variables, type-safe theme prop.
   - Cons: we already chose Tailwind + shadcn (`01-ARCHITECTURE.md`). CSS-in-JS adds runtime cost in React Server Components context.
   - Decision: rejected — Tailwind + CSS variables achieves the same with less complexity.

6. **OKLCH vs HSL for derivation**
   - HSL derivation is intuitive but perceptually uneven (the same lightness in HSL looks very different across hues). OKLCH preserves perceived lightness across hues, so `lightness = 0.95` looks similarly light for blue, red, green.
   - Decision: **OKLCH chosen** for derivation, via `culori`.

### Consequences

**Positive**
- Real white-label feel for tenants.
- Zero rebuild cost when tenants change theme.
- Tenant configuration is genuinely simple — they pick **two** colors.
- Accessibility protected by automatic validation.
- Semantic UX integrity preserved (semantic colors are fixed).
- The same shared module validates both sides; no drift.

**Negative**
- Derivation may occasionally produce a `*-soft` that the tenant finds "off" if they have a very specific shade in mind. Mitigation: include a preview that shows the derived tokens visually, and let them override via support if it ever becomes a real complaint.
- Server-rendered `<style>` block adds a few hundred bytes per page load. Acceptable.
- Some clients (especially email clients) ignore CSS variables, so emails inline the resolved hex values at render time. Slightly more work but already standard practice.

**Neutral**
- We commit to maintaining the derivation algorithm and contrast validation as a shared package (`@school/shared/theming`).
- We commit to making the configuration UI excellent — a poorly designed brand editor undermines the whole feature.

### References

- `06-FRONTEND_GUIDE.md` — visual language
- `06-FRONTEND_GUIDE.md` — full implementation details
- `01-ARCHITECTURE.md` — Tailwind + shadcn choice
- culori: <https://culorijs.org>
- OKLCH primer: <https://oklch.com>
- WCAG AA: <https://www.w3.org/WAI/WCAG2AA-Conformance>

---

## 0008 — Tenant-owned Asaas accounts with abstract gateway port

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

The platform needs to handle recurring monthly tuition, enrollment fees, ad-hoc invoices, and refunds for sports schools. Payment requirements in Brazil are dominated by Pix (instant), boleto (slip), and recurring subscriptions. We must decide:

1. Which payment gateway(s) to support.
2. Whether the platform holds a master account (acts as intermediary), or each tenant holds their own gateway account.
3. How to keep the architecture from getting locked into a single vendor.

This decision has heavy implications: financial intermediation in Brazil is regulated (BACEN), KYC obligations cascade, tax responsibility shifts, and the operational risk profile changes drastically depending on who holds the money.

### Decision

We adopt **three combined choices**:

**1. Asaas as the default (and, for the MVP, only) payment gateway.**
- Native support for Pix, boleto, and credit-card subscriptions — covers >95% of Brazilian sports-school billing needs.
- Low fixed Pix fee (R$ 0.99/transaction during promo, R$ 1.99 thereafter) suits typical tuition values.
- Explicit product positioning for recurring services like academies and schools.
- Comprehensive ecosystem (digital account, NF emission, antecipação) reduces tenants' need for external tools.
- Solid Portuguese-language API documentation and support.

**2. Each tenant owns their own Asaas account.**
- Tenants connect their existing or newly-created Asaas account via API key in onboarding.
- Money flows directly from payer to the tenant's Asaas account — never touching the platform.
- The platform never becomes a payment intermediary or PSP.
- Tenants remain responsible for KYC with Asaas, tax invoices (NF), and fiscal compliance.

**3. The codebase is gateway-agnostic via an abstract `PaymentGatewayPort`.**
- All payment use cases depend on the abstract port, never on Asaas concretely.
- `AsaasAdapter` is the single MVP implementation living in `infrastructure/adapters/`.
- Future adapters (Stripe, Pagar.me, Mercado Pago) can be added by writing a new implementation — zero changes elsewhere.
- Per-tenant gateway choice is stored in `organizations.settings.paymentGateway.provider`. The use cases resolve the adapter via a factory keyed by provider.

### Alternatives considered

1. **Platform holds a master account, splits to tenants (Modelo B)**
   - Pros: simpler tenant onboarding; platform can charge transaction fees as revenue.
   - Cons: platform becomes a financial intermediary — heavy BACEN regulation, KYC of every tenant, fraud-prevention duties, capital requirements; Asaas charges extra fees for split; payments flow through the platform's books, creating tax surface.
   - Decision: rejected. The regulatory burden is disproportionate to MVP value. Reconsider only if we want to monetize transactions directly.

2. **Lock in to a single gateway with no abstraction**
   - Pros: less code; faster initial implementation.
   - Cons: future migrations become rewrites; cannot support tenants who already use Pagar.me or want Stripe.
   - Decision: rejected. The port abstraction costs almost nothing at this scale and pays off the first time we add a second adapter.

3. **Stripe as primary**
   - Pros: best-in-class DX, excellent documentation, mature subscription primitives.
   - Cons: weaker Pix and boleto support in Brazil; Portuguese support limited; not the market default for the use case; pricing less competitive for typical tuition amounts.
   - Decision: rejected as primary. Will be added as a secondary adapter post-MVP if customer demand appears (international schools, premium tier).

4. **Mercado Pago as primary**
   - Pros: zero onboarding friction; ubiquitous in Brazil.
   - Cons: subscription primitives weaker than Asaas; e-commerce-oriented; boleto fees higher; transferring out to the tenant's bank costs.
   - Decision: rejected. Better suited to e-commerce than recurring-services SaaS.

5. **Pagar.me as primary**
   - Pros: very strong API, marketplace features.
   - Cons: boleto unit fee (R$ 3.49) is high for tuition; marketplace features (split) are wasted in a Modelo A flow; subscription product less polished than Asaas.
   - Decision: rejected as primary; viable future secondary adapter.

### Consequences

**Positive**
- Zero financial-intermediation risk for the platform.
- No PSP/IP regulatory obligations.
- Tenants keep full control over their money and fiscal flow.
- Architecture is portable — a second gateway can be added in a sprint, not a rewrite.
- Onboarding still simple: paste an API key, validate, done.

**Negative**
- Each tenant must have (or create) an Asaas account before they can bill.
- Tenants without an account cannot generate invoices until they connect — onboarding has a hard step that depends on a third party.
- Customer support has to know enough about Asaas to help tenants troubleshoot their own account.
- The platform cannot directly monetize transactions (no take-rate on payments); revenue must come from subscription/tier fees.

**Neutral**
- We commit to keeping the `PaymentGatewayPort` interface small and idiomatic — vendor-specific concepts (Asaas's `customerId`, Stripe's `customerId`, etc.) are not leaked above the adapter.
- We commit to documenting tenant onboarding for Asaas clearly, including how to create an account, how to get the API key, and what permissions it needs.

### Implementation notes

- **Tenant configuration** lives at `organizations.settings.paymentGateway`:
  - `provider`: `'ASAAS'` (open enum for future)
  - `apiKey_encrypted`: AES-256-GCM, same scheme as other PII
  - `webhookToken`: a platform-generated opaque token, used to route incoming webhooks to the right tenant
  - `status`: `'NOT_CONFIGURED' | 'PENDING_VALIDATION' | 'ACTIVE' | 'INVALID' | 'DISCONNECTED'`
  - `connectedAt`, `connectedBy`, `lastVerifiedAt`
- **Webhook routing**: each tenant's Asaas account is configured to send webhooks to `https://api.school-platform.app/webhooks/asaas/{webhookToken}`. The token resolves to an `organizationId`. HMAC verification uses the tenant-specific signing key stored in Asaas.
- **Adapter resolution**: `PaymentGatewayFactory` reads `RequestContext.organizationId`, loads the tenant's settings, and returns a configured `PaymentGatewayPort` instance. Decryption is cached in Redis for 60s to avoid per-request decryption overhead.
- **No-gateway-yet behavior**: endpoints that require billing (create invoice, enroll-with-subscription) return `422 PAYMENT_GATEWAY_NOT_CONNECTED` with a friendly message. The rest of the platform (roster, attendance, communications) works without a gateway connection.
- **Connection flow**: in onboarding and in Settings → Payments, the admin pastes their Asaas API key. The platform validates by calling Asaas's `/myAccount` endpoint, stores the encrypted key, and shows last 4 chars masked.

### References

- `02-DATA_MODEL.md` — `organizations.settings.paymentGateway` shape
- `03-AUTH_AND_PERMISSIONS.md` — `payment-gateway:*` permissions
- `04-SECURITY_AND_LGPD.md` — credential encryption
- `05-BACKEND_GUIDE.md` — adapter pattern, webhook routing
- `09-SPRINTS.md` — Sprint 5 tasks
- Asaas API: <https://docs.asaas.com>

---

## 0009 — Internal notifications instead of full communications system in MVP

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

The original Sprint 6 scoped a full marketing-grade communications system: editable templates with placeholders, multi-channel sending (email via Resend, WhatsApp via Z-API), segmentation builder (filter by school, class, status, defaulter, age group), delivery tracking via provider webhooks, scheduling, recipient ledger, consent enforcement, and per-channel rate limits.

In a solo-developer MVP with a first customer of 50 students:

- The full surface area is roughly 3-4 weeks of focused work — comparable to an entire sprint of roster or finance work.
- It pays back only when there are multiple paying tenants asking to broadcast to segmented audiences.
- Z-API (WhatsApp) introduces real operational risk: number bans, template pre-approval, support burden on a vendor the platform cannot fully control.
- A template editor + segmentation builder + scheduling + delivery dashboards is a small product in itself, competing for build time with more urgent roster / attendance / finance flows.

The immediate need is much smaller: admin / staff should be able to post a notice that reaches the right guardians inside the platform, and should be able to follow up individually via WhatsApp without typing the phone number manually.

### Decision

For the MVP, guardian communication is delivered by **two minimal features**:

**1. Internal pull-only notifications.**

- Admin / staff / coach posts a notification targeted at the whole organization, a specific school, a specific class, or an individual guardian.
- Audience type is one of `ALL_ORG`, `SCHOOL`, `CLASS`, `INDIVIDUAL_GUARDIAN` — no custom saved groups yet.
- Guardians see notifications inside their portal: bell icon with unread count, dropdown of recent items, dedicated `/avisos` page.
- Read/unread is tracked per (notification, guardian) pair; admins see `read / total` counts and can drill into who hasn't read.
- No email, WhatsApp, or push delivery. Notifications live only inside the platform.

**2. Click-to-WhatsApp helper.**

- Anywhere a guardian phone is displayed (guardian list, student detail, defaulters list, notification read-status drill-down), a `WhatsAppButton` opens `https://wa.me/<E.164>?text=<optional>` in a new tab.
- Pure frontend URL helper. Zero backend cost. No message tracking, no automation, no Z-API account.
- Closes the loop on notifications: admin sees "12 of 30 read", clicks unread guardians one-by-one to follow up manually on their own WhatsApp.

The full marketing-campaign system (templates, segmentation, multi-channel delivery, scheduling, recipient ledger, custom saved groups, delivery webhooks) is moved to the post-MVP backlog. Email push for notifications and web push (PWA) are also deferred.

Transactional emails triggered by the platform (verify-email, invite, password reset, invoice issued, invoice overdue, payment received) are **not** part of this scope reduction — they remain prerequisites of Sprints 1, 3, and 5 and need a Resend adapter wherever those features land.

### Alternatives considered

1. **Build the original Sprint 6 in full.**
   - Pros: complete commercial-grade communications from day one.
   - Cons: 3-4 weeks of solo work for marginal MVP value at 50 students; Z-API operational risk; template editor + segmentation UI is a small product on its own.
   - Decision: rejected for MVP. Backlogged.

2. **Email broadcast only (no in-app notifications).**
   - Pros: reuses the Resend adapter the transactional emails need anyway.
   - Cons: Brazilian parents have low email open rates for school communications; nothing to look at inside the platform; no read tracking; no obvious follow-up loop.
   - Decision: rejected.

3. **In-app notifications + automatic email "you have a new notice".**
   - Pros: pull channel is durable, email push pulls the parent in to read; mirrors how Slack / Discord work.
   - Cons: still depends on email open rates; adds template + delivery wiring the in-app path doesn't need.
   - Decision: deferred. Lives in the backlog as a small additive ("Notification delivery beyond in-app pull"). Will be promoted if the in-app read rate proves too low in production.

4. **In-app notifications with WhatsApp automation (Z-API).**
   - Pros: WhatsApp is the dominant channel in Brazil.
   - Cons: Z-API requires a dedicated WhatsApp number; ban risk if business-account rules slip; template pre-approval friction; support burden on a vendor the platform doesn't control. None of this is justified for 50 students.
   - Decision: rejected for MVP. The click-to-WhatsApp helper covers the use case manually with zero risk.

5. **Custom saved groups in v1** (named segments of guardians).
   - Pros: more flexibility for ad-hoc audiences ("voluntary parents for the end-of-year event").
   - Cons: requires group CRUD, membership UI, new permissions, tests; org / school / class / individual already covers ~95% of real cases.
   - Decision: rejected for MVP. Will be added if a real demand surfaces.

### Consequences

**Positive**

- Sprint 6 shrinks from a full broadcast system to a focused in-app feature — fits in a fraction of the original scope.
- Zero external-vendor dependency for the notification feature itself (no Z-API, no Resend coupling).
- The click-to-WhatsApp follow-up loop creates a useful workflow without any compliance surface (no automated messaging, no LGPD marketing-consent requirement for the notification itself — it's an internal app message).
- The architecture leaves room: the `notifications` module can later grow an email push channel as an additive feature without redesign.

**Negative**

- Guardians who do not log in regularly may miss notifications. The read-status drill-down + click-to-WhatsApp helper is the mitigation, but it is manual.
- No delivery guarantee like SMS or push. If a notice is urgent, admin must follow up by WhatsApp.
- We will eventually have to build the deferred marketing system if the product moves upmarket — the deferred scope does not disappear, it just waits.

**Neutral**

- The `notifications` module replaces the planned `communications` module in the MVP module catalog (`01-ARCHITECTURE.md`). When the marketing-campaign work is picked up post-MVP, it will live as a separate `communications` module alongside `notifications`, not as a rename.
- Transactional email plumbing (Resend adapter + base auth templates) lands explicitly in Sprint 1 as a prerequisite of the auth flow; invoice / payment templates land in Sprint 5 reusing the same adapter. This Sprint 6 itself adds no email plumbing.

### References

- `09-SPRINTS.md` — Sprint 6 (Internal notifications) and the backlog entry for the deferred marketing system
- `01-ARCHITECTURE.md` — module catalog (`notifications`)
- `03-AUTH_AND_PERMISSIONS.md` — `notification:*` permissions (to be added in Sprint 1 seed)
- `04-SECURITY_AND_LGPD.md` — consent rules (marketing consent not required for internal notifications)

---

## 0010 — MVP focused on essential operational features, polish and growth deferred to v1.1

- **Status:** Accepted
- **Date:** 2026-05
- **Deciders:** owner

### Context

The original roadmap (Sprints 0-7) packaged a fully featured commercial product at MVP: end-to-end roster, attendance, finance with Asaas subscriptions, communications, full white-label configuration, public pre-enrollment funnel, CSV import, comprehensive reports, LGPD operational endpoints (data export, daily anonymization), audit log UI, queue dashboard, onboarding wizard, and Lighthouse hardening — plus the polished growth surface around it.

The platform's first customer is the owner's own sports school (~50 students). The product is built by an AI-assisted solo development effort, with Opus 4.7 producing code and the owner reviewing. Even with AI acceleration, the original scope is estimated at 10-12 weeks of focused full-time work, with debugging, third-party integration surprises, and review bandwidth as real bottlenecks.

The product owner asked for a leaner MVP that delivers the operational core required to actually run a school day-to-day — student management, guardian visibility, recurring payments, defaulter tracking, internal communications, admin control — and defers polish, growth, and "nice to have" features to v1.1.

### Decision

For the MVP, the platform delivers **only the operational core**:

**Stays in MVP (Sprints 0-7):**

- Foundation, monorepo, CI, observability (Sprint 0).
- Auth (login, signup, invites, password reset), full RBAC with all roles separated (ADMIN, ORG_STAFF, SCHOOL_STAFF, COACH, GUARDIAN), tenancy, encryption, audit log writes, transactional email infra (Sprint 1).
- Frontend base, auth screens, role-aware layouts (Sprint 2).
- Students, guardians, consents, links, modalities, classes (Sprint 3).
- Enrollments + attendance, including coach mobile UI for taking attendance (Sprint 4).
- Asaas connection, invoices, **recurring subscriptions**, dunning, guardian payment portal with Pix (Sprint 5).
- Internal notifications with audience scoping + click-to-WhatsApp helper (Sprint 6 — see ADR 0009).
- Home dashboards (admin: 4 KPI cards / guardian: notifications + next class + open invoices), legal pages, critical error states, perf + security smoke, production deploy (new Sprint 7).

**Moved to backlog (post-MVP / v1.1):**

- Full reports dashboard and "students at risk" rule.
- CSV import for students, guardians, enrollments.
- Public pre-enrollment form + admin approval queue.
- LGPD operational endpoints (`me/data-export`, daily anonymization job, cookie banner).
- White-label configuration UI (logo + organization name remain fixed in MVP).
- Audit log admin UI (writes happen in MVP; UI is deferred).
- Queue dashboard UI (BullMQ default UI can be enabled ad-hoc if needed).
- Onboarding wizard.
- Email templates final design pass.
- Lighthouse perf / a11y hardening.
- Anonymize student admin UI (use case exists; UI deferred).
- Invoice refund admin UI (admin processes refunds via the Asaas dashboard in MVP).
- Attendance offline support for coach mobile.

### Alternatives considered

1. **Ship the full original Sprint 7.**
   - Pros: feature-complete v1 from day one; nothing to come back to.
   - Cons: 3-5 weeks of additional work for features that no real user has asked for yet. White-label has zero commercial value at 50 students. CSV import is unused when admin manually enters the first cohort. Pre-enrollment funnel is unused without a marketing site. Risk of "feature complete, customer absent" — building things in anticipation of needs that may not materialize the way the spec imagines.
   - Decision: rejected.

2. **Cut even more (skip subscriptions, attendance, notifications).**
   - Pros: ship in ~4 weeks.
   - Cons: cuts into the operational core. Without subscriptions, monthly billing is manual — useful for the first month but unsustainable. Without attendance, parents don't see what they pay for. Without notifications, admin loses a daily communication tool. These are not polish; they are part of the product's value proposition.
   - Decision: rejected.

3. **Build the MVP and v1.1 in parallel from day one.**
   - Pros: nothing waits.
   - Cons: AI-assisted solo development still has a serial bottleneck on review and decisions. Parallel work multiplies context-switching cost and architectural drift risk.
   - Decision: rejected.

4. **Defer coach role + mobile attendance UI to reduce Sprint 4.**
   - Pros: simpler permission matrix and one less UI surface.
   - Cons: owner explicitly wants roles cleanly separated (admin / coach / staff / guardian) and coaches taking attendance on their phones is the realistic operational mode. Conflating coach work with staff work loses information and dirties the audit trail.
   - Decision: rejected. Coach role + mobile attendance UI stays in MVP. Only offline sync is deferred.

5. **Keep invoice refund flow in admin UI.**
   - Pros: end-to-end self-service for billing operations.
   - Cons: refunds are rare and high-stakes; the Asaas dashboard already handles them well; building a refund UI in the platform adds an attack/error surface for an action that benefits from being out-of-band.
   - Decision: rejected for MVP. Refund admin UI moved to backlog. Cancel invoice UI stays.

### Consequences

**Positive**

- MVP timeline: ~7-8 weeks of focused AI-assisted work versus ~10-12 weeks for the full original scope.
- Smaller surface area to test, debug, and operate in the first weeks of production.
- Customer feedback from real use will shape v1.1 — defers building features in anticipation of imagined needs.
- Encryption, soft-delete, RBAC, tenant isolation, audit-log writes — all still in MVP — leave LGPD posture defensible even with operational UIs deferred.

**Negative**

- LGPD `me/data-export` is not exposed in MVP. If a guardian formally requests their data in month 1, the operator must respond manually via DB query within the legal window. Documented as known operational risk.
- White-label deferred means the platform looks the same for every customer of the MVP. Acceptable for the first ~3 customers; revisit before the 4th sale.
- Some Sprint 7 deferrals (audit log UI, queue dashboard) mean the operator must use DB queries / BullMQ defaults for visibility in early production.

**Neutral**

- All deferred features have a backlog entry with rationale, so v1.1 planning starts from a clear list rather than rediscovery.
- The new Sprint 7 ("MVP polish and launch") replaces the original kitchen-sink Sprint 7 entirely. Numbering preserved.
- Coach role, full RBAC with five separated personas, and recurring subscriptions all remain in MVP — those are part of the operational core, not polish.

### References

- `09-SPRINTS.md` — current sprint scope and the backlog with deferred features
- ADR 0009 — internal notifications scope (related cut)
- Owner conversation 2026-05-14 — scope decision
