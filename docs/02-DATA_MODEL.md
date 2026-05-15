# 03 — Data model

> **When to read:** Before any database work — creating entities, writing migrations, querying.
> **Prerequisites:** `01-ARCHITECTURE.md`, `01-ARCHITECTURE.md`
> **TL;DR:** Multi-tenant via `organization_id`. Hierarchy Organization → School → SchoolModality → Class. UUID v7 PKs. Money in cents. PII encrypted with AES-256-GCM. Soft delete on PII-bearing entities.

---

## Conventions

| Concern | Rule |
|---------|------|
| Primary keys | UUID v7 (`uuidv7` lib). Time-ordered, index-friendly. |
| Naming | Tables: `snake_case` plural. Columns: `snake_case`. Entities: PascalCase singular. |
| Timestamps | `created_at`, `updated_at`, `deleted_at` (timestamptz, UTC). |
| Money | `*_cents` columns, `integer` type. Format only at presentation. |
| Dates | `due_date` etc. as `date` type, no time component, no TZ. |
| Booleans | Default not null. Explicit defaults. |
| Enums | Postgres native enums OR check constraints. Mirrored in `@school/shared`. |
| FKs | `ON DELETE` chosen deliberately. Most are `RESTRICT` or `SET NULL`. Never `CASCADE` for financial/audit data. |
| Indexes | Composite `(organization_id, …)` on all multi-tenant tables. |
| Encrypted | Suffix `_encrypted`. Paired `_search` column with deterministic hash for equality lookups. |

## ERD overview

```
                       Organization
                            │
                ┌───────────┼────────────┬──────────────┐
                ▼           ▼            ▼              ▼
              School    Modality        User          Role
                │           │            │              │
                ▼           ▼            │              │
         SchoolModality ────┘            │              │
                │                        ▼              │
                ▼                     UserRole ◄────────┘
              Class                      │
                │                        ▼
                ▼                  StaffSchool / CoachClass
           Enrollment ────► Student ──── StudentGuardian ──── Guardian
                │              │
                │              ▼
                │         (linked User if guardian has login)
                │
        ┌───────┼───────────────┬──────────────┐
        ▼       ▼               ▼              ▼
     Invoice  Subscription  Attendance     Communication
        │                       Session     Recipient
        ▼                       │
      Payment                AttendanceRecord
```

## Tables

### Hierarchy

```sql
-- Organization: the tenant boundary.
organizations (
  id                    uuid PK              -- v7
  name                  text not null
  slug                  text not null unique
  document_encrypted    text                 -- CNPJ
  logo_url              text
  settings              jsonb default '{}'   -- includes settings.theme (06-FRONTEND_GUIDE.md) and settings.paymentGateway (see below)
  plan                  text default 'free'
  status                text not null check (status in ('ACTIVE','SUSPENDED'))
  created_at            timestamptz not null default now()
  updated_at            timestamptz not null default now()
  deleted_at            timestamptz
);

-- organizations.settings shape (JSONB; managed at application level, validated by Zod):
--   {
--     theme: { brandName, brandPrimary, brandAccent, logoUrl, logoSmallUrl, faviconUrl },
--     paymentGateway: {
--       provider:          'ASAAS',                       -- open enum for future adapters
--       apiKey_encrypted:  text,                          -- AES-256-GCM, never returned via API
--       webhookToken:      text (random, opaque, unique), -- maps incoming webhooks to this org
--       status:            'NOT_CONFIGURED' | 'PENDING_VALIDATION' | 'ACTIVE' | 'INVALID' | 'DISCONNECTED',
--       connectedAt:       timestamptz,
--       connectedBy:       uuid (user_id),
--       lastVerifiedAt:    timestamptz,
--       lastFour:           text  -- last 4 chars of API key, for UI display
--     }
--   }
-- A unique index on (settings->'paymentGateway'->>'webhookToken') WHERE token IS NOT NULL
-- supports fast tenant resolution on webhook ingestion.

-- School: physical unit / branch.
schools (
  id                    uuid PK
  organization_id       uuid not null FK -> organizations(id) RESTRICT
  name                  text not null
  slug                  text not null
  address               jsonb              -- {street, number, city, state, zip, country}
  phone                 text
  email                 text
  timezone              text default 'America/Sao_Paulo'
  status                text not null check (status in ('ACTIVE','INACTIVE'))
  created_at, updated_at, deleted_at
  UNIQUE (organization_id, slug)
  INDEX (organization_id)
);

-- Modality: org-level catalog (e.g. Football, Volleyball).
modalities (
  id                    uuid PK
  organization_id       uuid not null FK -> organizations(id) RESTRICT
  name                  text not null
  description           text
  color                 text                  -- hex
  active                boolean not null default true
  created_at, updated_at, deleted_at
  UNIQUE (organization_id, name)
);

-- SchoolModality: which modalities each School offers, with pricing.
school_modalities (
  id                              uuid PK
  organization_id                 uuid not null FK -> organizations(id)
  school_id                       uuid not null FK -> schools(id) RESTRICT
  modality_id                     uuid not null FK -> modalities(id) RESTRICT
  default_monthly_fee_cents       integer not null
  default_enrollment_fee_cents    integer not null default 0
  active                          boolean not null default true
  created_at, updated_at
  UNIQUE (school_id, modality_id)
  INDEX (organization_id, school_id)
);

-- Class: a concrete group with schedule.
classes (
  id                    uuid PK
  organization_id       uuid not null FK -> organizations(id)
  school_id             uuid not null FK -> schools(id) RESTRICT
  school_modality_id    uuid not null FK -> school_modalities(id) RESTRICT
  name                  text not null                -- "Sub-10 Manhã"
  age_group             text                         -- 'SUB_7','SUB_9',..., 'MIXED' (optional)
  schedule              jsonb not null               -- [{weekday: 1..7, start: '08:00', end: '09:30'}]
  location              text
  capacity              integer
  monthly_fee_cents     integer                      -- nullable; overrides SchoolModality default
  status                text not null check (status in ('ACTIVE','INACTIVE'))
  created_at, updated_at, deleted_at
  INDEX (organization_id, school_id, school_modality_id)
);
```

### Identity & authorization

```sql
users (
  id                       uuid PK
  organization_id          uuid not null FK -> organizations(id)
  email                    text not null
  password_hash            text not null               -- argon2id
  name                     text not null
  phone_encrypted          text
  avatar_url               text
  status                   text not null check (status in ('PENDING','ACTIVE','DISABLED'))
  email_verified_at        timestamptz
  last_login_at            timestamptz
  mfa_enabled              boolean not null default false
  mfa_secret_encrypted     text                        -- TOTP secret, encrypted
  created_at, updated_at, deleted_at
  UNIQUE (organization_id, email)
);

roles (
  id                uuid PK
  key               text not null   -- 'ADMIN','ORG_STAFF','SCHOOL_STAFF','COACH','GUARDIAN'
  name              text not null
  description       text
  organization_id   uuid             -- null = system role
  UNIQUE (organization_id, key)      -- NULLS treated as distinct in Postgres for unique
);

permissions (
  id        uuid PK
  key       text not null unique     -- 'student:read.own-school'
  resource  text not null
  action    text not null
  scope     text                     -- 'own-school','own-class','own', null = global
);

role_permissions (
  role_id        uuid not null FK
  permission_id  uuid not null FK
  PRIMARY KEY (role_id, permission_id)
);

user_roles (
  user_id        uuid not null FK -> users(id) ON DELETE CASCADE
  role_id        uuid not null FK -> roles(id) RESTRICT
  assigned_at    timestamptz not null default now()
  assigned_by    uuid             FK -> users(id) SET NULL
  PRIMARY KEY (user_id, role_id)
);

staff_schools (                            -- SCHOOL_STAFF ↔ School
  user_id          uuid not null FK -> users(id) ON DELETE CASCADE
  school_id        uuid not null FK -> schools(id) ON DELETE CASCADE
  organization_id  uuid not null FK -> organizations(id)
  assigned_at      timestamptz not null default now()
  PRIMARY KEY (user_id, school_id)
);

coach_classes (                            -- COACH ↔ Class
  user_id          uuid not null FK -> users(id) ON DELETE CASCADE
  class_id         uuid not null FK -> classes(id) ON DELETE CASCADE
  organization_id  uuid not null FK -> organizations(id)
  assigned_at      timestamptz not null default now()
  PRIMARY KEY (user_id, class_id)
);

sessions (                                 -- refresh-token sessions
  id                   uuid PK
  user_id              uuid not null FK -> users(id) ON DELETE CASCADE
  refresh_token_hash   text not null                     -- argon2id of token
  family               uuid not null                     -- detect token reuse
  user_agent           text
  ip                   text
  expires_at           timestamptz not null
  revoked_at           timestamptz
  replaced_by_id       uuid FK -> sessions(id)
  created_at           timestamptz not null default now()
  INDEX (user_id, revoked_at)
  INDEX (family)
);

invites (
  id                uuid PK
  organization_id   uuid not null FK
  email             text not null
  role_key          text not null
  school_ids        jsonb                  -- optional, for SCHOOL_STAFF
  token_hash        text not null
  invited_by        uuid not null FK -> users(id)
  expires_at        timestamptz not null
  accepted_at       timestamptz
  revoked_at        timestamptz
  context           jsonb                  -- e.g. {guardian_id: '...'}
  created_at        timestamptz not null default now()
);

audit_logs (
  id                uuid PK
  organization_id   uuid not null
  school_id         uuid
  actor_user_id     uuid FK -> users(id) SET NULL
  action            text not null          -- 'student.updated', 'invoice.refunded'
  resource          text not null
  resource_id       uuid
  before            jsonb
  after             jsonb
  ip                text
  user_agent        text
  request_id        text
  created_at        timestamptz not null default now()
  INDEX (organization_id, resource, created_at DESC)
  INDEX (actor_user_id, created_at DESC)
);
```

### People

```sql
students (
  id                          uuid PK
  organization_id             uuid not null FK
  full_name_encrypted         text not null
  full_name_search            text not null            -- normalized: lowercase, no accents
  birth_date                  date not null
  document_encrypted          text                     -- CPF
  document_search             text                     -- hash for equality
  photo_url                   text
  medical_notes_encrypted     text
  allergies_encrypted         text
  medications_encrypted       text
  uniform_size                text                     -- enum: 'PP','P','M','G','GG','XG'
  emergency_contact           jsonb                    -- {name, phone, relationship}
  status                      text not null check (status in ('ACTIVE','INACTIVE'))
  created_at, updated_at, deleted_at
  anonymized_at               timestamptz
  INDEX (organization_id, full_name_search)
  INDEX (organization_id, document_search)
);

guardians (
  id                       uuid PK
  organization_id          uuid not null FK
  full_name_encrypted      text not null
  full_name_search         text not null
  document_encrypted       text                       -- CPF
  document_search          text
  phone_encrypted          text not null
  phone_search             text                       -- normalized E.164 hash
  email                    text not null              -- not encrypted: used for login + comms
  address                  jsonb
  user_id                  uuid FK -> users(id) SET NULL  -- if they have login
  created_at, updated_at, deleted_at, anonymized_at
  INDEX (organization_id, email)
  INDEX (organization_id, user_id)
);

student_guardians (
  id                          uuid PK
  student_id                  uuid not null FK -> students(id) ON DELETE RESTRICT
  guardian_id                 uuid not null FK -> guardians(id) ON DELETE RESTRICT
  organization_id             uuid not null
  relationship                text not null check (relationship in ('FATHER','MOTHER','GRANDPARENT','OTHER'))
  is_primary_payer            boolean not null default false
  receives_communications     boolean not null default true
  is_emergency_contact        boolean not null default false
  created_at                  timestamptz not null default now()
  UNIQUE (student_id, guardian_id)
);

consents (                                 -- LGPD
  id                uuid PK
  organization_id   uuid not null
  guardian_id       uuid not null FK -> guardians(id) ON DELETE RESTRICT
  student_id        uuid FK -> students(id) SET NULL
  terms_version     text not null
  accepted_at       timestamptz not null default now()
  revoked_at        timestamptz
  ip                text not null
  user_agent        text
  granted_for       jsonb not null         -- ['data_processing','photo_use','communications','marketing']
);
```

### Enrollments & operations

```sql
enrollments (
  id                       uuid PK
  organization_id          uuid not null FK
  student_id               uuid not null FK -> students(id) ON DELETE RESTRICT
  school_id                uuid not null FK -> schools(id) ON DELETE RESTRICT     -- denormalized
  class_id                 uuid not null FK -> classes(id) ON DELETE RESTRICT
  modality_id              uuid not null FK -> modalities(id) ON DELETE RESTRICT  -- denormalized
  start_date               date not null
  end_date                 date
  monthly_fee_cents        integer not null   -- snapshot at creation
  enrollment_fee_cents     integer not null default 0
  status                   text not null check (status in ('ACTIVE','PAUSED','CANCELLED'))
  reason                   text               -- for pause/cancel
  created_at, updated_at
  INDEX (organization_id, school_id, status)
  INDEX (student_id, status)
  -- App-level invariant: enrollments.school_id = classes.school_id (validated in repo / use case)
);

attendance_sessions (
  id                uuid PK
  organization_id   uuid not null
  school_id         uuid not null
  class_id          uuid not null FK -> classes(id) ON DELETE RESTRICT
  date              date not null
  status            text not null check (status in ('PLANNED','HELD','CANCELLED'))
  created_by        uuid FK -> users(id) SET NULL
  created_at        timestamptz not null default now()
  UNIQUE (class_id, date)
);

attendance_records (
  id                uuid PK
  session_id        uuid not null FK -> attendance_sessions(id) ON DELETE CASCADE
  student_id        uuid not null FK -> students(id) ON DELETE RESTRICT
  organization_id   uuid not null
  school_id         uuid not null
  status            text not null check (status in ('PRESENT','ABSENT','JUSTIFIED'))
  note              text
  created_at, updated_at
  UNIQUE (session_id, student_id)
);
```

### Finance

```sql
invoices (
  id                       uuid PK
  organization_id          uuid not null FK
  school_id                uuid not null FK -> schools(id) ON DELETE RESTRICT
  enrollment_id            uuid FK -> enrollments(id) SET NULL    -- null for ad-hoc
  payer_guardian_id        uuid not null FK -> guardians(id) ON DELETE RESTRICT
  description              text not null
  amount_cents             integer not null
  due_date                 date not null
  status                   text not null check (status in ('PENDING','PAID','OVERDUE','CANCELLED','REFUNDED'))
  gateway_invoice_id       text
  payment_link             text
  pix_qr_code              text
  created_at, updated_at
  INDEX (organization_id, school_id, status, due_date)
  INDEX (gateway_invoice_id) WHERE gateway_invoice_id IS NOT NULL
);

payments (
  id                       uuid PK
  organization_id          uuid not null FK
  school_id                uuid not null
  invoice_id               uuid not null FK -> invoices(id) ON DELETE RESTRICT
  amount_cents             integer not null
  method                   text not null check (method in ('PIX','BOLETO','CARD','MANUAL'))
  paid_at                  timestamptz not null
  gateway_payment_id       text
  gateway_payload          jsonb
  created_at               timestamptz not null default now()
  UNIQUE (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL
);

subscriptions (
  id                       uuid PK
  organization_id          uuid not null FK
  school_id                uuid not null
  enrollment_id            uuid not null FK -> enrollments(id) ON DELETE RESTRICT
  gateway_subscription_id  text not null unique
  status                   text not null check (status in ('ACTIVE','PAUSED','CANCELLED'))
  next_due_date            date
  created_at, updated_at
);

webhook_events (
  id                  uuid PK
  provider            text not null            -- 'ASAAS'
  gateway_event_id    text not null
  event_type          text not null
  payload             jsonb not null
  status              text not null check (status in ('RECEIVED','PROCESSED','FAILED'))
  received_at         timestamptz not null default now()
  processed_at        timestamptz
  failure_reason      text
  UNIQUE (provider, gateway_event_id)
);

idempotency_keys (
  key            text PK
  user_id        uuid FK -> users(id) ON DELETE CASCADE
  request_hash   text not null
  response       jsonb not null
  status_code    integer not null
  created_at     timestamptz not null default now()
  expires_at     timestamptz not null
  INDEX (expires_at)
);
```

### Communications

```sql
communication_templates (
  id                uuid PK
  organization_id   uuid not null FK
  school_id         uuid FK -> schools(id) SET NULL          -- null = org-wide template
  name              text not null
  channel           text not null check (channel in ('EMAIL','WHATSAPP','IN_APP'))
  subject           text
  body              text not null
  variables         jsonb                                    -- declared placeholders
  created_at, updated_at, deleted_at
);

communications (
  id                uuid PK
  organization_id   uuid not null FK
  school_id         uuid FK
  template_id       uuid FK -> communication_templates(id) SET NULL
  channels          text[] not null
  subject           text
  body              text not null
  segment           jsonb not null                            -- filter snapshot
  sent_by           uuid FK -> users(id) SET NULL
  scheduled_for     timestamptz
  sent_at           timestamptz
  status            text not null check (status in ('DRAFT','SCHEDULED','SENDING','SENT','FAILED'))
  created_at        timestamptz not null default now()
);

communication_recipients (
  id                     uuid PK
  communication_id       uuid not null FK -> communications(id) ON DELETE CASCADE
  organization_id        uuid not null
  guardian_id            uuid FK -> guardians(id) ON DELETE RESTRICT
  user_id                uuid FK -> users(id) ON DELETE RESTRICT
  channel                text not null
  address                text not null                       -- masked email/phone for audit
  status                 text not null check (status in ('PENDING','SENT','DELIVERED','READ','FAILED'))
  provider_message_id    text
  failure_reason         text
  sent_at, delivered_at, read_at  timestamptz
  INDEX (communication_id, status)
);
```

### Imports & pre-enrollment

```sql
import_jobs (
  id                uuid PK
  organization_id   uuid not null FK
  school_id         uuid FK
  type              text not null check (type in ('STUDENTS','GUARDIANS','ENROLLMENTS'))
  status            text not null check (status in ('PENDING','PROCESSING','COMPLETED','FAILED','PARTIAL'))
  total_rows        integer not null default 0
  processed_rows    integer not null default 0
  success_rows      integer not null default 0
  failed_rows       integer not null default 0
  errors            jsonb default '[]'
  source_file_url   text not null
  created_by        uuid FK -> users(id) SET NULL
  created_at        timestamptz not null default now()
  completed_at      timestamptz
);

enrollment_requests (
  id                       uuid PK
  organization_id          uuid not null FK
  school_id                uuid not null FK
  student_draft            jsonb not null                  -- raw form data, not validated yet
  guardian_draft           jsonb not null
  class_of_interest_id     uuid FK -> classes(id) SET NULL
  notes                    text
  source                   text                            -- 'website', 'referral', etc
  status                   text not null check (status in ('PENDING','APPROVED','REJECTED'))
  reviewed_by              uuid FK -> users(id) SET NULL
  reviewed_at              timestamptz
  resulting_student_id     uuid FK -> students(id) SET NULL
  created_at               timestamptz not null default now()
  INDEX (organization_id, school_id, status, created_at DESC)
);
```

## Soft delete policy

| Entity | Soft delete | Reason |
|--------|-------------|--------|
| Organization, School, Modality | Yes | Audit + restore |
| User, Student, Guardian | Yes | LGPD: anonymize don't delete |
| Class | Yes | Historical attendance/enrollments |
| CommunicationTemplate | Yes | Sent communications reference it |
| Enrollment | No — use `status='CANCELLED'` | Always part of history |
| Invoice, Payment, Subscription | No | Financial integrity. Use `status='CANCELLED'` or `REFUNDED` |
| AuditLog | No | Append-only |

## Encrypted fields catalog

| Entity | Field | Search column |
|--------|-------|---------------|
| Organization | `document_encrypted` | — |
| Organization | `settings.paymentGateway.apiKey_encrypted` (in JSONB) | — |
| User | `phone_encrypted`, `mfa_secret_encrypted` | — |
| Student | `full_name_encrypted` | `full_name_search` (normalized) |
| Student | `document_encrypted` | `document_search` (HMAC) |
| Student | `medical_notes_encrypted`, `allergies_encrypted`, `medications_encrypted` | — |
| Guardian | `full_name_encrypted` | `full_name_search` |
| Guardian | `document_encrypted` | `document_search` |
| Guardian | `phone_encrypted` | `phone_search` |

Algorithm and key management in `04-SECURITY_AND_LGPD.md`.

## Critical invariants

These must hold at all times. Enforced by entity validation, transaction boundaries, or DB constraints.

1. `enrollment.school_id == class.school_id`
2. `enrollment.modality_id == class.school_modality.modality_id`
3. `payment.invoice.organization_id == payment.organization_id`
4. A user can hold multiple roles, but exactly **one** of (ADMIN, ORG_STAFF, SCHOOL_STAFF) at any time, plus optional COACH and/or GUARDIAN.
5. A guardian with `is_primary_payer=true` exists for any Student that has Invoices.
6. `consent` must exist (not revoked) before `student` is created.
7. `audit_logs` rows are immutable. No update or delete from app code.
8. `webhook_events.gateway_event_id` is unique per provider (idempotency).
9. `invoices.amount_cents` and `payments.amount_cents` are positive integers.
10. `settings.paymentGateway.webhookToken` is globally unique across all organizations (enforced by partial unique index).

## Indexing strategy (cheat-sheet)

- Every `(organization_id, …)` composite for primary scope queries.
- `(organization_id, school_id, status)` for SCHOOL_STAFF-scoped lists.
- `(due_date, status)` on `invoices` for the dunning job.
- `created_at DESC` indexes on `audit_logs` for time-ordered reads.
- Trigram (`pg_trgm`) indexes only where text search is actually needed (post-MVP).

---

# Glossary

> Domain terms (English ↔ Portuguese), role keys, scope suffixes, acronyms. Reference when a term in code or docs is unclear.

---

## Domain terms

| English (code) | Portuguese (UI) | Definition |
|----------------|-----------------|------------|
| Organization | Organização / Rede / Marca | The tenant. A business that owns one or more physical schools. |
| School | Unidade / Escolinha | A physical sports school location belonging to an Organization. |
| Modality | Modalidade | A sport offered (Football, Volleyball, etc). Lives at the Organization level. |
| SchoolModality | Modalidade da unidade | The offering of a Modality by a specific School, with that unit's pricing. |
| Class | Turma | A specific group within a SchoolModality, with schedule, capacity, coach. |
| Student | Aluno | A person enrolled (or to be enrolled) in classes. PII heavy; never has a login (in MVP). |
| Guardian | Responsável | An adult legally responsible for one or more Students. Has a login. |
| Coach | Professor / Treinador | Staff member who teaches Classes. |
| Enrollment | Matrícula | Link between Student and Class with start date, price snapshot, status. |
| Attendance Session | Sessão / Aula | A scheduled (or held) instance of a Class on a specific date. |
| Attendance Record | Presença / Falta | A Student's status (present, absent, justified) for an AttendanceSession. |
| Invoice | Fatura / Cobrança | A bill issued to a Guardian for an amount due by a date. |
| Payment | Pagamento | A successful (or registered manual) payment against an Invoice. |
| Subscription | Assinatura / Mensalidade | A recurring billing relationship at the gateway, tied to an Enrollment. |
| Consent | Consentimento | LGPD record of a Guardian's agreement to data processing / photos / marketing. |
| Audit Log | Log de auditoria | Append-only history of who did what to which data. |
| Communication | Comunicação / Aviso | A message sent (email/WhatsApp/in-app) to a segmented audience. |
| Communication Template | Modelo de comunicação | A reusable message body with placeholders. |
| Communication Recipient | Destinatário | A single delivery record (who, channel, status, message id). |
| Pre-enrollment Request | Pré-matrícula | A lead submitted via public form, awaiting admin review. |
| Import Job | Importação | A bulk CSV import in progress or finished. |
| Defaulter | Inadimplente | A Guardian with one or more overdue Invoices. |
| Student at risk | Aluno em risco | Heuristic flag: ≥3 absences in 30 days OR overdue ≥30 days. |
| Anonymization | Anonimização | LGPD-driven replacement of PII with placeholders. Data is not deleted, IDs are preserved. |
| Soft delete | Exclusão lógica | Marked `deleted_at` and excluded from queries; reversible. |
| White-label | White-label / Marca branca | Each tenant configures their own brand identity (colors, logo, name) which propagates across the app, login, emails, and PDFs. |
| Brand tokens | Tokens de marca | The `--brand-primary` / `--brand-accent` and their derived `-strong` / `-soft` variants — the only colors a tenant configures. |
| Derived tokens | Tokens derivados | Tones (`-strong`, `-soft`, `-on`) computed automatically from the tenant's chosen primary and accent in OKLCH space. |
| Semantic tokens | Tokens semânticos | Fixed colors with universal meaning: success (green), warning (orange), danger (red), info (blue). Never overridden per tenant. |

## Role keys

| Key | Portuguese | Scope |
|-----|------------|-------|
| `ADMIN` | Administrador | Whole organization, all permissions |
| `ORG_STAFF` | Operacional (rede) | Whole organization, day-to-day ops, no destructive perms |
| `SCHOOL_STAFF` | Operacional (unidade) | Only assigned Schools via `staff_schools` |
| `COACH` | Professor | Only assigned Classes via `coach_classes` |
| `GUARDIAN` | Responsável | Only own dependents via `guardians.user_id` |

## Permission scope suffixes

| Suffix | Meaning |
|--------|---------|
| (no suffix) | Org-wide. The user can act on any resource in their Organization. |
| `.own-school` | The resource must belong to a School the user is assigned to (`staff_schools`). |
| `.own-class` | The resource must belong to a Class the user coaches (`coach_classes`). |
| `.own` | The resource must be linked to the user as a guardian (`student_guardians` → `guardians.user_id`). |

Examples:
- `student:read` — any student in the org.
- `student:read.own-school` — students enrolled in a school I'm staff of.
- `student:read.own` — students I'm guardian of.

## Acronyms

| Acronym | Expansion / meaning |
|---------|---------------------|
| API | Application Programming Interface — here, the NestJS backend |
| ADR | Architecture Decision Record (see `adr/`) |
| BE / FE | Backend / Frontend |
| CASL | The TS authorization library used for UI gating |
| CI / CD | Continuous Integration / Continuous Delivery |
| CPF / CNPJ | Brazilian individual / company tax IDs |
| CSRF | Cross-Site Request Forgery |
| DLQ | Dead Letter Queue — failed jobs after exhausting retries |
| DTO | Data Transfer Object |
| ERD | Entity-Relationship Diagram |
| ICP-Brasil | Brazilian Public Key Infrastructure for digital signatures |
| JWT | JSON Web Token |
| LGPD | Lei Geral de Proteção de Dados — Brazilian data protection law |
| MFA / 2FA | Multi-Factor / Two-Factor Authentication |
| MoM / YoY | Month-over-Month / Year-over-Year |
| ORM | Object-Relational Mapper (here, TypeORM) |
| PII | Personally Identifiable Information |
| Pix | Brazilian instant payment system |
| PR | Pull Request |
| PWA | Progressive Web App |
| RBAC | Role-Based Access Control |
| RPO / RTO | Recovery Point Objective / Recovery Time Objective |
| RSC | React Server Component |
| RTL | React Testing Library |
| SDK | Software Development Kit |
| SSE / SaaS | Sports School Enterprise (no, joke) / Software as a Service |
| TLS | Transport Layer Security |
| TOTP | Time-based One-Time Password (MFA standard) |
| VO | Value Object |
| WCAG | Web Content Accessibility Guidelines |

## Operational shorthand

| Term | Meaning |
|------|---------|
| The owner | The project owner (sole developer / business owner). |
| The agent | An AI coding assistant working on the codebase (Claude Code primarily). |
| The platform | This product as a whole. |
| The portal | The Guardian-facing area of the web app. |
| The dashboard | The Admin/Staff landing area after login. |
| Tenant | An Organization. "Cross-tenant" means across Organizations. |
| The catalog | The org-level list of Modalities. |
| The seed | The dev/test data setup, including roles + permissions + a sample org. |
| The wizard | A multi-step UI flow (e.g. onboarding, student creation). |

## Things commonly confused

| Sounds similar | Means different things |
|----------------|------------------------|
| **Modality** vs **SchoolModality** | Modality = catalog item at the Organization level. SchoolModality = a Modality offered by a specific School with that unit's price. |
| **School** vs **Class** | School is a physical location (unit). Class is a group within a SchoolModality with a schedule. |
| **Guardian** vs **User** | A Guardian is a domain entity (with PII). A User is an auth identity. A Guardian *may* be linked to a User (`guardians.user_id`) once they accept the invite. |
| **Soft delete** vs **Anonymization** | Soft delete sets `deleted_at`; data still recoverable. Anonymization replaces PII with placeholders permanently (LGPD-grade right to be forgotten). |
| **Invoice cancel** vs **Invoice refund** | Cancel = not yet paid, won't be charged. Refund = was paid, money returned to payer. |
| **Permission** vs **Role** | A permission is a single capability (`student:read.own-school`). A role is a named bundle of permissions (`SCHOOL_STAFF`). |
| **Subscription** vs **Enrollment** | An Enrollment is the domain link (Student ↔ Class). A Subscription is the recurring billing relationship at Asaas. One Enrollment typically has one Subscription. |
| **Pre-enrollment Request** vs **Enrollment** | A Pre-enrollment Request is a public lead awaiting admin approval. An Enrollment is what's created once approved. |
