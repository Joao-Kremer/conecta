# Plataforma de Gestão de Escolinhas Esportivas — Plano Mestre

> Documento único de referência para o desenvolvimento. Todas as decisões arquiteturais,
> de modelagem e de processo estão consolidadas aqui. Use este arquivo como contexto
> principal para o Claude Code.

---

## 1. Visão geral

Plataforma multi-tenant SaaS-ready para gestão de escolinhas esportivas. Permite que
uma **Organization** (ex: Centro Escola Riachuelo) administre **múltiplas Schools**
(unidades físicas), cada uma oferecendo **Modalities** (esportes) do catálogo da
organização, organizadas em **Classes** (turmas). Inclui gestão de alunos, responsáveis,
matrículas, presença, financeiro (Pix/boleto/assinaturas) e comunicação (e-mail, WhatsApp).

### Personas

- **ADMIN** — dono(a) da Organization. Acesso total.
- **ORG_STAFF** — operacional em todas as Schools da Organization.
- **SCHOOL_STAFF** — operacional apenas nas Schools às quais está vinculado(a).
- **COACH** — professor(a). Vê e age apenas nas Classes às quais está atribuído(a).
- **GUARDIAN** — responsável. Vê apenas dados dos seus dependentes (Students vinculados).

Aluno (Student) **não tem login no MVP** — simplifica permissões e LGPD de menores.

---

## 2. Stack e decisões fundamentais

| Camada | Escolha | Notas |
|--------|---------|-------|
| Linguagem | TypeScript estrito em tudo | `strict: true`, `noUncheckedIndexedAccess: true` |
| Monorepo | Turborepo + pnpm workspaces | |
| Backend | NestJS | Modular, decorators, DI nativa |
| ORM | **TypeORM** | DataSource separado para CLI de migrations |
| Banco | PostgreSQL 16+ | UUID v7 em todas as PKs |
| Cache/Filas | Redis (BullMQ) | Sessions cache, jobs assíncronos |
| Frontend | Next.js 14+ (App Router) | RSC + Route Handlers como proxy autenticado |
| UI | Tailwind + shadcn/ui | Acessível, customizável |
| Estado | TanStack Query + Zustand | server state / client state |
| Forms | React Hook Form + Zod | schemas compartilhados com back |
| Autenticação | Cookies HTTP-only + JWT access curto + refresh rotativo | Detalhes em §6 |
| Autorização | RBAC + escopo (ownership) por relacionamento | CASL no front |
| Validação | Zod (compartilhado) + class-validator (DTOs Nest) | |
| Pagamentos | **Asaas** | Pix automático, boleto, assinaturas, webhooks |
| E-mail | Resend (transacional) | trocável depois |
| WhatsApp | Z-API (provisório) → API oficial Meta no futuro | |
| Storage | Cloudflare R2 ou AWS S3 | URLs assinadas para fotos de alunos |
| Observabilidade | Sentry + Pino + Axiom/Better Stack | |
| Deploy back | Railway ou Fly.io | |
| Deploy front | Vercel | |
| Banco gerenciado | Neon ou Supabase | |
| Redis gerenciado | Upstash | |

### Decisões consolidadas

- ✅ **Multi-tenant** desde o dia 1 via `organizationId` em todas as tabelas de negócio
- ✅ **Hierarquia:** Organization → School → SchoolModality → Class
- ✅ **Modality global** (catálogo da Organization); School escolhe quais oferecer via SchoolModality (com preço próprio); Class pode sobrescrever preço
- ✅ **STAFF em dois níveis:** ORG_STAFF (vê tudo) e SCHOOL_STAFF (escopado por StaffSchool)
- ✅ **Login do Guardian:** convite automático por e-mail no cadastro
- ✅ **Auth:** cookies HTTP-only, refresh rotativo, sessions table para revogação real
- ✅ **MFA/2FA:** schema preparado (`mfaEnabled`, `mfaSecret`), implementação pós-MVP
- ✅ **Clean Architecture** por módulo: domain / application / infrastructure / presentation
- ✅ **LGPD completo no MVP:** criptografia de PII, consentimento, anonimização, exportação
- ✅ **AuditLog** captura todo create/update/delete
- ✅ **Importação CSV** no MVP (Students, Guardians, Enrollments)
- ✅ **Ambientes:** local + staging + production
- ✅ **Front ↔ back:** tipos compartilhados via `@school/shared` + fetch tipado + TanStack Query

---

## 3. Arquitetura do monorepo

```
school-platform/
├── apps/
│   ├── api/                          # NestJS
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── organizations/
│   │   │   │   ├── schools/
│   │   │   │   ├── modalities/
│   │   │   │   ├── school-modalities/
│   │   │   │   ├── classes/
│   │   │   │   ├── students/
│   │   │   │   ├── guardians/
│   │   │   │   ├── enrollments/
│   │   │   │   ├── attendance/
│   │   │   │   ├── invoices/
│   │   │   │   ├── payments/
│   │   │   │   ├── subscriptions/
│   │   │   │   ├── communications/
│   │   │   │   ├── audit/
│   │   │   │   └── imports/
│   │   │   ├── shared/               # cross-cutting: context, decorators, guards, filters
│   │   │   ├── infrastructure/       # config, database, queues, mail, payment-gateway
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── test/
│   │   ├── migrations/
│   │   └── data-source.ts
│   └── web/                          # Next.js (App Router)
│       ├── src/
│       │   ├── app/                  # rotas
│       │   ├── components/
│       │   ├── lib/                  # api client, auth helpers
│       │   └── hooks/
│       └── public/
├── packages/
│   ├── shared/                       # @school/shared — Zod schemas, types, constants
│   ├── ui/                           # @school/ui — componentes React reutilizáveis
│   ├── eslint-config/                # @school/eslint-config
│   └── tsconfig/                     # @school/tsconfig
├── docker-compose.yml
├── turbo.json
├── pnpm-workspace.yaml
└── PROJECT_PLAN.md
```

### Clean Architecture por módulo (estrutura padrão)

Todo módulo de negócio segue esse layout. Exemplo `students`:

```
modules/students/
├── domain/
│   ├── entities/
│   │   └── student.entity.ts         # TypeORM @Entity + regras invariantes
│   ├── value-objects/
│   │   └── document.vo.ts
│   ├── events/
│   │   └── student-created.event.ts
│   └── repositories/
│       └── students.repository.ts    # abstract class (interface)
├── application/
│   ├── use-cases/
│   │   ├── create-student.use-case.ts
│   │   ├── update-student.use-case.ts
│   │   └── ...
│   └── services/
│       └── student-anonymization.service.ts
├── infrastructure/
│   ├── repositories/
│   │   └── students.typeorm.repository.ts   # implementa StudentsRepository
│   └── persistence/
│       └── student.typeorm.entity.ts        # mapeamento, se separado do domain
└── presentation/
    ├── controllers/
    │   └── students.controller.ts
    ├── dtos/
    │   ├── create-student.dto.ts
    │   └── student-response.dto.ts
    └── presenters/
        └── student.presenter.ts
```

**Regra de dependência:** `presentation → application → domain ← infrastructure`.
Domain nunca importa de application/infrastructure/presentation. Application nunca importa
de infrastructure/presentation. Tudo via interfaces (abstract classes).

**Use cases são unidades atômicas** — uma classe por caso de uso, com método `execute()`.
Facilita teste, leitura, e mudança de implementação.

---

## 4. Modelo de dados completo

> Convenção: PKs UUID v7. Datas em UTC. Dinheiro em centavos (`integer`).
> Todas as tabelas de negócio têm `organizationId`. Todas têm `createdAt`/`updatedAt`.
> Entidades sensíveis têm `deletedAt` (soft delete).

### Hierarquia

```sql
Organization
  id, name, slug (UNIQUE), document_encrypted, logo_url,
  settings (jsonb), plan, status (ACTIVE|SUSPENDED),
  created_at, updated_at, deleted_at

School
  id, organization_id, name, slug,
  address (jsonb), phone, email, timezone,
  status (ACTIVE|INACTIVE),
  created_at, updated_at, deleted_at
  UNIQUE (organization_id, slug)
  INDEX (organization_id)

Modality                                   -- catálogo da Organization
  id, organization_id, name, description, color,
  active, created_at, updated_at, deleted_at
  UNIQUE (organization_id, name)

SchoolModality                              -- vínculo + preço por unidade
  id, organization_id, school_id, modality_id,
  default_monthly_fee_cents, default_enrollment_fee_cents,
  active, created_at, updated_at
  UNIQUE (school_id, modality_id)
  INDEX (organization_id, school_id)

Class
  id, organization_id, school_id, school_modality_id,
  name, schedule (jsonb [{weekday, start_time, end_time}]),
  location, capacity,
  monthly_fee_cents (nullable, sobrescreve SchoolModality.default_monthly_fee_cents),
  status (ACTIVE|INACTIVE),
  created_at, updated_at, deleted_at
  INDEX (organization_id, school_id, school_modality_id)
```

### Identidade & autorização

```sql
User
  id, organization_id, email, password_hash,
  name, phone_encrypted, avatar_url,
  status (PENDING|ACTIVE|DISABLED),
  email_verified_at, last_login_at,
  mfa_enabled (default false), mfa_secret_encrypted (nullable),
  created_at, updated_at, deleted_at
  UNIQUE (organization_id, email)

Role
  id, key (ADMIN|ORG_STAFF|SCHOOL_STAFF|COACH|GUARDIAN),
  name, description,
  organization_id (nullable — null = role do sistema)

Permission
  id, key (ex: 'student:read.own'),
  resource, action, scope

RolePermission                              role_id, permission_id (PK composta)
UserRole                                    user_id, role_id, assigned_at, assigned_by

StaffSchool                                 -- SCHOOL_STAFF ↔ School
  user_id, school_id, organization_id, assigned_at
  PK (user_id, school_id)

CoachClass                                  -- COACH ↔ Class
  user_id, class_id, organization_id, assigned_at
  PK (user_id, class_id)

Session                                     -- refresh tokens rotativos
  id, user_id, refresh_token_hash, family (uuid),
  user_agent, ip,
  expires_at, revoked_at, replaced_by_id,
  created_at
  INDEX (user_id, revoked_at)
  INDEX (family)

Invite
  id, organization_id, email, role_key,
  school_ids (jsonb array, nullable),
  token_hash, invited_by,
  expires_at, accepted_at, revoked_at,
  context (jsonb — ex: guardian_id),
  created_at

AuditLog
  id, organization_id, school_id (nullable),
  actor_user_id, action, resource, resource_id,
  before (jsonb), after (jsonb),
  ip, user_agent, request_id, created_at
  INDEX (organization_id, resource, created_at)
  INDEX (actor_user_id, created_at)
```

### Pessoas

```sql
Student
  id, organization_id, full_name_encrypted, full_name_search,
  birth_date, document_encrypted, photo_url,
  medical_notes_encrypted, allergies_encrypted, emergency_contact (jsonb),
  status (ACTIVE|INACTIVE),
  created_at, updated_at, deleted_at, anonymized_at
  INDEX (organization_id, full_name_search)

Guardian
  id, organization_id, full_name_encrypted, full_name_search,
  document_encrypted, phone_encrypted, email,
  address (jsonb), user_id (nullable),
  created_at, updated_at, deleted_at, anonymized_at
  INDEX (organization_id, email)
  INDEX (user_id)

StudentGuardian
  id, student_id, guardian_id, organization_id,
  relationship (FATHER|MOTHER|GRANDPARENT|OTHER),
  is_primary_payer, receives_communications, is_emergency_contact,
  created_at
  UNIQUE (student_id, guardian_id)

Consent                                      -- LGPD
  id, organization_id, guardian_id, student_id (nullable),
  terms_version, accepted_at, ip,
  granted_for (jsonb — ex: ['data_processing','photo_use','communications'])
```

> **Campos `_encrypted`** são strings armazenadas via TypeORM ColumnTransformer
> que aplica AES-256-GCM. Campos `_search` armazenam hash determinístico ou versão
> normalizada (lowercase, sem acentos) para busca por igualdade/prefixo — nunca o
> valor em claro. Para busca por texto livre de PII, usar índice trigram em coluna
> separada após decisão consciente.

### Matrícula & operação

```sql
Enrollment
  id, organization_id, student_id,
  school_id, class_id, modality_id,         -- denormalizado para queries rápidas
  start_date, end_date (nullable),
  monthly_fee_cents (snapshot),
  enrollment_fee_cents (snapshot),
  status (ACTIVE|PAUSED|CANCELLED), reason,
  created_at, updated_at
  INDEX (organization_id, school_id, status)
  INDEX (student_id)
  CHECK enrollment.school_id == class.school_id (validar via app hook)

AttendanceSession
  id, organization_id, school_id, class_id, date,
  status (PLANNED|HELD|CANCELLED), created_by,
  created_at
  UNIQUE (class_id, date)

AttendanceRecord
  id, session_id, student_id, organization_id, school_id,
  status (PRESENT|ABSENT|JUSTIFIED), note,
  created_at, updated_at
  UNIQUE (session_id, student_id)
```

### Financeiro

```sql
Invoice
  id, organization_id, school_id,
  enrollment_id (nullable, null = avulsa),
  payer_guardian_id,
  description, amount_cents, due_date,
  status (PENDING|PAID|OVERDUE|CANCELLED|REFUNDED),
  gateway_invoice_id, payment_link, pix_qr_code,
  created_at, updated_at
  INDEX (organization_id, school_id, status, due_date)
  INDEX (gateway_invoice_id)

Payment
  id, organization_id, school_id, invoice_id,
  amount_cents, method (PIX|BOLETO|CARD|MANUAL),
  paid_at, gateway_payment_id, gateway_payload (jsonb),
  created_at
  UNIQUE (gateway_payment_id) WHERE gateway_payment_id IS NOT NULL

Subscription
  id, organization_id, school_id, enrollment_id,
  gateway_subscription_id, status (ACTIVE|PAUSED|CANCELLED),
  next_due_date,
  created_at, updated_at
  UNIQUE (gateway_subscription_id)

WebhookEvent                                 -- idempotência
  id, provider (ASAAS), gateway_event_id (UNIQUE),
  event_type, payload (jsonb),
  status (RECEIVED|PROCESSED|FAILED),
  received_at, processed_at, failure_reason
```

### Comunicação

```sql
CommunicationTemplate
  id, organization_id, school_id (nullable — null = template global da org),
  name, channel (EMAIL|WHATSAPP|IN_APP),
  subject, body, variables (jsonb),
  created_at, updated_at, deleted_at

Communication
  id, organization_id, school_id (nullable),
  template_id (nullable), channels (text[]),
  subject, body,
  segment (jsonb — filtros: schoolId, classId, modalityId, status...),
  sent_by, scheduled_for, sent_at,
  status (DRAFT|SCHEDULED|SENDING|SENT|FAILED),
  created_at

CommunicationRecipient
  id, communication_id, organization_id,
  guardian_id, user_id (nullable),
  channel, address,
  status (PENDING|SENT|DELIVERED|READ|FAILED),
  provider_message_id, failure_reason,
  sent_at, delivered_at, read_at
  INDEX (communication_id, status)
```

### Importação

```sql
ImportJob
  id, organization_id, school_id (nullable),
  type (STUDENTS|GUARDIANS|ENROLLMENTS),
  status (PENDING|PROCESSING|COMPLETED|FAILED|PARTIAL),
  total_rows, processed_rows, success_rows, failed_rows,
  errors (jsonb), source_file_url,
  created_by, created_at, completed_at
```

---

## 5. Multi-tenancy — implementação

**Modelo:** shared database, shared schema, com `organizationId` em toda tabela de negócio.

**Isolamento em camadas (defesa em profundidade):**

1. **AuthGuard** decodifica o JWT do cookie, popula `RequestContext` (AsyncLocalStorage) com:
   - `userId`
   - `organizationId`
   - `roles` (array de role keys)
   - `permissions` (set computado e cacheado)
   - `scopedSchoolIds` (do StaffSchool, se SCHOOL_STAFF)
   - `coachedClassIds` (do CoachClass, se COACH)
   - `guardianIds` (Guardian.id onde Guardian.user_id = userId, se GUARDIAN)

2. **TenantSubscriber (TypeORM EntitySubscriber):**
   - `beforeInsert`: seta `organizationId` automaticamente do contexto
   - `loadRelationIdAndMap` / interceptors: adiciona `WHERE organizationId = :current` em SELECTs
   - Falha imediatamente (throw) se contexto não estiver disponível em escrita

3. **SchoolScopeInterceptor:** para SCHOOL_STAFF, adiciona `schoolId IN (...)` em
   queries de tabelas que possuem `schoolId`.

4. **TenantGuard:** valida que `:id` em rotas pertence à org atual antes do controller rodar.

5. **DB-level:** índices compostos `(organization_id, id)` e FKs corretas para impedir
   leak via JOIN.

**Tabelas sem `organizationId`:**
`Permission` (catálogo global), `Role` (com `organization_id` nullable para roles do sistema),
`WebhookEvent` (vinculado por gateway).

---

## 6. Autenticação

### Estratégia dual token

| Token | Tipo | Vida | Cookie |
|-------|------|------|--------|
| Access | JWT assinado (HS256 ou RS256) | 15 min | `__Host-access`, HttpOnly, Secure, SameSite=Strict, Path=/ |
| Refresh | Opaco (256 bits aleatórios), armazenado **hash** no banco | 7 dias | `__Host-refresh`, HttpOnly, Secure, SameSite=Strict, Path=/auth/refresh |

### Refresh rotativo + detecção de reuso

1. Login cria `Session` com `family = uuid()`, `refresh_token_hash`.
2. Cliente chama `POST /auth/refresh` → emite par novo, marca anterior como `replaced_by_id`.
3. Se um refresh **antigo** (já substituído) é apresentado → **token roubado**.
   Revoga toda a `family` (logout em todos os dispositivos dessa sessão).
4. Access tokens não são revogados individualmente (vida de 15min absorve).
5. "Logout em todos os dispositivos" = `UPDATE sessions SET revoked_at = NOW() WHERE user_id = :id`.

### CSRF

- `SameSite=Strict` cobre 99% dos casos modernos.
- Defesa em profundidade: header customizado `X-Requested-With: school-platform` exigido
  em mutations. Browsers não enviam esse header em requests cross-site simples.

### MFA/2FA (estrutura pronta, ativa pós-MVP)

- `User.mfa_enabled`, `User.mfa_secret_encrypted` (TOTP).
- Quando ativado, login retorna `{ requiresMfa: true, mfaChallenge: '...' }`,
  e o cliente faz `POST /auth/mfa/verify` com o código.

### Senhas

- Hash com **argon2id** (memoryCost: 19456, timeCost: 2, parallelism: 1).
- Política mínima: 10 chars, mix de letras/números, blocklist de 10k senhas comuns.
- Reset por e-mail com token de uso único (24h).

---

## 7. Autorização

### Modelo: RBAC + checagem de escopo

**Roles** = capacidades amplas. **Permissions** com sufixo `.own*` indicam que requerem
checagem de relacionamento via `OwnershipResolver`.

### Catálogo de permissions

```
# Organization
organization:read, organization:update

# School
school:create, school:read, school:read.own-school, school:update, school:delete

# Modality (global da org)
modality:create, modality:read, modality:update, modality:delete

# SchoolModality (vínculo + preço por unidade)
school-modality:create, school-modality:create.own-school
school-modality:read, school-modality:read.own-school
school-modality:update, school-modality:update.own-school
school-modality:delete, school-modality:delete.own-school

# Class
class:create, class:create.own-school
class:read, class:read.own-school, class:read.own
class:update, class:update.own-school
class:delete, class:delete.own-school
class:assign-coach, class:assign-coach.own-school

# Identidade
user:create, user:read, user:read.own-school, user:update, user:delete
user:invite, user:impersonate
role:read, role:assign

# Pessoas
student:create, student:create.own-school
student:read, student:read.own-school, student:read.own
student:update, student:update.own-school, student:update.own
student:delete, student:delete.own-school
student:export, student:anonymize

guardian:create, guardian:create.own-school
guardian:read, guardian:read.own-school, guardian:read.own
guardian:update, guardian:update.own-school, guardian:update.own
guardian:delete

# Matrículas
enrollment:create, enrollment:create.own-school
enrollment:read, enrollment:read.own-school, enrollment:read.own
enrollment:update, enrollment:update.own-school
enrollment:cancel, enrollment:cancel.own-school

# Presença
attendance:create, attendance:create.own-school, attendance:create.own-class
attendance:read, attendance:read.own-school, attendance:read.own

# Financeiro
invoice:create, invoice:create.own-school
invoice:read, invoice:read.own-school, invoice:read.own
invoice:cancel, invoice:cancel.own-school
invoice:refund

payment:create, payment:create.own-school
payment:read, payment:read.own-school, payment:read.own
payment:refund

subscription:read, subscription:read.own-school
subscription:pause, subscription:pause.own-school
subscription:cancel, subscription:cancel.own-school

# Comunicação
communication-template:create, communication-template:create.own-school
communication-template:read, communication-template:read.own-school
communication-template:update, communication-template:update.own-school
communication-template:delete

communication:send, communication:send.own-school, communication:send.own-class
communication:read, communication:read.own-school, communication:read.own

# Importação
import:create, import:create.own-school, import:read, import:read.own-school

# Outros
report:read, report:read.own-school, report:export
audit:read, audit:read.own-school
settings:read, settings:update
```

### Matriz role → permissions (resumo)

| Categoria                       | ADMIN | ORG_STAFF | SCHOOL_STAFF (¹) | COACH (²) | GUARDIAN (³) |
|---------------------------------|:-----:|:---------:|:----------------:|:---------:|:------------:|
| organization:update             | ✅    | ❌        | ❌              | ❌        | ❌           |
| school CRUD                     | ✅    | ✅⁴       | ❌              | ❌        | ❌           |
| school:read.own-school          | -     | -         | ✅              | ✅        | ❌           |
| modality CRUD                   | ✅    | ✅        | ❌              | ❌        | ❌           |
| school-modality CRUD            | ✅    | ✅        | own-school      | ❌        | ❌           |
| class CRUD                      | ✅    | ✅        | own-school      | ❌        | ❌           |
| class:read.own                  | -     | -         | -               | ✅        | ❌           |
| user:invite                     | ✅    | ✅⁵       | own-school⁵     | ❌        | ❌           |
| user:impersonate                | ✅    | ❌        | ❌              | ❌        | ❌           |
| role:assign                     | ✅    | ✅⁶       | ❌              | ❌        | ❌           |
| student CRUD                    | ✅    | ✅        | own-school      | ❌        | ❌           |
| student:read.own / update.own   | -     | -         | -               | ✅⁷       | ✅           |
| student:anonymize               | ✅    | ❌        | ❌              | ❌        | ❌           |
| guardian CRUD                   | ✅    | ✅        | own-school      | ❌        | ❌           |
| guardian:*.own                  | -     | -         | -               | -         | ✅           |
| enrollment CRUD                 | ✅    | ✅        | own-school      | ❌        | ❌           |
| enrollment:read.own             | -     | -         | -               | -         | ✅           |
| attendance:create.own-class     | -     | -         | -               | ✅        | ❌           |
| attendance:read                 | ✅    | ✅        | own-school      | own-class | own          |
| invoice / payment (CUD)         | ✅    | ✅        | own-school      | ❌        | ❌           |
| invoice / payment refund        | ✅    | ❌        | ❌              | ❌        | ❌           |
| invoice / payment .own          | -     | -         | -               | -         | ✅           |
| communication-template          | ✅    | ✅        | own-school      | ❌        | ❌           |
| communication:send              | ✅    | ✅        | own-school      | own-class | ❌           |
| communication:read.own          | -     | -         | -               | -         | ✅           |
| import                          | ✅    | ✅        | own-school      | ❌        | ❌           |
| report:read                     | ✅    | ✅        | own-school      | ❌        | ❌           |
| audit:read                      | ✅    | ✅        | own-school      | ❌        | ❌           |
| settings:update                 | ✅    | ❌        | ❌              | ❌        | ❌           |

(¹) Restrito às schools vinculadas via `StaffSchool`
(²) Restrito às classes vinculadas via `CoachClass`
(³) Restrito aos students vinculados via `StudentGuardian` (atravessa schools naturalmente)
(⁴) ORG_STAFF não pode criar/deletar Schools, apenas atualizar
(⁵) ORG_STAFF e SCHOOL_STAFF não convidam ADMIN nem ORG_STAFF
(⁶) ORG_STAFF não atribui ADMIN
(⁷) COACH vê alunos das suas turmas

### Implementação no Nest

```ts
@Controller('students')
@UseGuards(AuthGuard, PermissionsGuard, OwnershipGuard)
export class StudentsController {
  @Get(':id')
  @RequirePermissions('student:read', 'student:read.own-school', 'student:read.own')
  @CheckOwnership({ resource: 'student', paramName: 'id' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) { ... }
}
```

- `@RequirePermissions(...keys)` → OR lógico. Se o user tem **qualquer uma**, prossegue,
  e a permissão usada determina o escopo aplicado pelo `OwnershipGuard`.
- `@CheckOwnership` → registra um resolver para esse recurso. O guard chama
  `OwnershipResolverRegistry.get(resource).resolve(scope, resourceId, ctx)`.

### Ownership resolvers (registry)

```ts
interface OwnershipResolver {
  canAccess(scope: 'own-school' | 'own-class' | 'own', resourceId: string, ctx: RequestContext): Promise<boolean>;
}
```

Cada recurso de negócio registra seu resolver. Resolvedores usam `schoolId` denormalizado
(O(1)) e cacheiam resultado no Redis com TTL 60s (chave: `ownership:{userId}:{resource}:{resourceId}`).

### Cache de permissions

No login, materializa o set de permissions do user:
```
SET perms:user:{userId} = JSON.stringify([...permissionKeys])
EXPIRE perms:user:{userId} 300
```
Invalidação: ao mudar UserRole → `DEL perms:user:{userId}`.

### Front (CASL)

`@school/shared` exporta uma função `defineAbilityFor(user)` consumida tanto pelo back
(referência) quanto pelo front (UX). Front esconde botões com `<Can I="update" a="Student">`.
**Segurança real é no back.**

---

## 8. Convenções de código

### Geral

- **Nomes:** entidades em PascalCase, tabelas em snake_case plural, colunas snake_case.
- **IDs:** UUID v7 em tudo (lib `uuidv7`).
- **Datas:** UTC no banco. Conversão para timezone da School no front. `date` para dias
  (ex: `due_date`), `timestamp with time zone` para momentos.
- **Dinheiro:** sempre **centavos como `integer`** (ou `bigint` se > R$ 21M, improvável).
  Formatação só na UI com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`.
- **Telefones:** formato E.164 no banco (`+5521999998888`). Lib `libphonenumber-js`.
- **DTOs:** nunca expor `@Entity` diretamente. Sempre via DTO/Presenter.
- **Soft delete:** entidades com PII e/ou histórico crítico (User, Student, Guardian,
  CommunicationTemplate). Status enum onde basta (Enrollment).

### Erros — formato padrão

```ts
{
  "code": "ENROLLMENT_ALREADY_CANCELLED",
  "message": "Esta matrícula já foi cancelada.",
  "details": { "enrollmentId": "..." },
  "requestId": "..."
}
```

- Exception filter global que serializa todas as `DomainException` nesse formato.
- Códigos em SCREAMING_SNAKE_CASE, prefixados pelo recurso.
- HTTP status apropriado (400 para validation, 404 not found, 409 conflito de estado, 422 regra de negócio).
- Front trata por `code`, **nunca por parse de message**.

### Idempotência

Endpoints de mutação críticos (criar Invoice, registrar Payment manual, enviar Communication)
aceitam header `Idempotency-Key`. Tabela `idempotency_keys`:
```sql
id, key (UNIQUE), user_id, response (jsonb), status, created_at, expires_at
```
TTL 24h. Mesma key + mesmo body = devolve cached response. Key diferente + mesma operação =
aceita (responsabilidade do cliente).

### Commits e PRs

- **Conventional Commits** obrigatório (commitlint + Husky).
- Branch model: `main` (deploy production), `develop` (deploy staging), feature branches.
- PR template com checklist de qualidade.
- Code review obrigatório (mesmo solo: aprovar 24h depois do push, com fresh eyes).

### Tooling

- **ESLint** com `@typescript-eslint`, `eslint-plugin-import` (boundaries entre camadas
  da Clean Arch), `eslint-plugin-unicorn`.
- **Prettier** com config compartilhada em `packages/eslint-config`.
- **Husky** pre-commit: `lint-staged` (prettier + eslint --fix) + `tsc --noEmit`.
- **Commitlint** pre-commit-msg.

---

## 9. Segurança e LGPD

### Camadas de defesa

- **HTTPS** obrigatório, HSTS, certificado válido.
- **Helmet** com CSP restritivo.
- **CORS** com whitelist explícita.
- **Rate limiting** (nestjs-throttler ou bibliotecas equivalentes):
  - `/auth/login`: 5/min por IP
  - `/auth/refresh`: 10/min por IP
  - Webhooks: sem limite (mas com verificação HMAC)
  - Geral: 100/min por user autenticado
- **Validação rigorosa de input** via Zod (front) + class-validator (back). Nunca confiar no cliente.
- **Webhooks** com verificação de assinatura HMAC.
- **Logs sem PII:** Pino com `redact` configurado:
  ```ts
  redact: ['*.password', '*.token', '*.document', '*.cpf', '*.phone', '*.email',
           'req.headers.authorization', 'req.headers.cookie']
  ```
- **Backups automáticos** do banco (diário, retenção 30 dias, teste de restore mensal).
- **Secrets** gerenciados via Doppler ou Infisical (não commit).

### Criptografia de PII

**Algoritmo:** AES-256-GCM com chave mestre em secret manager.

**TypeORM ColumnTransformer:**
```ts
@Column({ type: 'text', transformer: new EncryptedColumnTransformer() })
documentEncrypted: string;
```

**Campos criptografados:**
- `User.phone_encrypted`, `User.mfa_secret_encrypted`
- `Organization.document_encrypted`
- `Student.full_name_encrypted`, `Student.document_encrypted`, `Student.medical_notes_encrypted`, `Student.allergies_encrypted`
- `Guardian.full_name_encrypted`, `Guardian.document_encrypted`, `Guardian.phone_encrypted`

**Busca em campos criptografados:** coluna paralela `_search` com hash determinístico
(HMAC-SHA256 com chave separada) para igualdade/prefixo. Ex: busca por CPF exata funciona,
busca por "rua tal" no documento não.

**Key rotation:** estrutura preparada (versão da chave armazenada com o ciphertext),
implementação operacional pode ficar para depois.

### Consentimento (LGPD art. 7º, 8º)

Entidade `Consent` registra:
- Versão do termo (versionado em código + arquivo PDF imutável)
- Timestamp + IP
- Granularidade: `data_processing`, `photo_use`, `communications`, `marketing` (separados)
- Vinculado ao Guardian que aceita; quando aluno é menor, o Guardian aceita em nome dele

**Sem consentimento ativo, não cria Student.** Telas de cadastro forçam aceite.

### Direitos do titular (LGPD art. 18)

- **Acesso:** `GET /me/data-export` retorna JSON com tudo do titular (próprios dados se
  User, dados do dependente se Guardian). Processado em background, link de download por e-mail.
- **Correção:** já coberto por update.
- **Anonimização:** `POST /students/:id/anonymize` (permissão `student:anonymize`).
  Substitui PII por placeholders (`'***ANONIMIZADO***'`, document NULL, etc), mantém
  estrutura para integridade de Invoice/AuditLog. Marca `anonymized_at`. **Não deleta**.
- **Portabilidade:** mesmo endpoint de exportação.
- **Revogação de consentimento:** marca `Consent.revoked_at`. Aciona anonimização se for
  o consentimento de tratamento.

### Retenção

- Enrollment cancelada + 24 meses → anonimização automática agendada via job diário.
- AuditLog: retenção 5 anos.
- Logs de aplicação: retenção 90 dias.
- Backups: retenção 30 dias.

---

## 10. Auditoria e observabilidade

### AuditLog

**Captura todo create/update/delete** via interceptor global `AuditInterceptor`.
- Antes do handler: snapshot do estado atual (para update/delete).
- Depois do handler: snapshot do novo estado (para create/update).
- Diff calculado e armazenado.
- Action keys padronizados: `student.created`, `student.updated`, `invoice.refunded`, etc.

### Tela de auditoria

`/admin/audit`:
- Filtro por usuário, recurso, ação, período, school.
- Visualização do diff `before`/`after` em colunas.
- Export CSV para auditoria externa.

### Observabilidade

- **Sentry** (free tier): erros e performance no back e front.
- **Pino** com pretty-print em dev, JSON em prod.
- **Axiom** ou **Better Stack** para agregação de logs.
- **Request ID:** middleware injeta `x-request-id` no header (gera se cliente não enviou),
  propaga em todos os logs daquela request, retorna no response. Mostra na UI em erros
  para o usuário copiar e reportar.
- **Health checks:**
  - `GET /health` (público, sem deps) — confirma que o processo está vivo
  - `GET /health/ready` (interno) — checa DB, Redis, gateway. Retorna 503 se algum falha
- **Métricas:** pular Prometheus no MVP. Adicionar quando aparecer dor real.

---

## 11. Testes

### Pirâmide

- **Unit** (domain + application): cobertura mínima 90%. Sem deps externas.
  Use cases instanciados com fakes/stubs. Jest.
- **Integration** (infrastructure): repositórios TypeORM contra Postgres real
  via **Testcontainers**. Cobertura mínima 70%.
- **E2E** (presentation + fluxos): Supertest no back, Playwright no front.
  Cobre os fluxos críticos:
  - Signup org + onboarding admin
  - Login + refresh + logout
  - Convite → aceite → login
  - Criar Class → matricular Student → gerar Invoice → simular webhook de pagamento
  - Enviar Communication segmentada
  - Importar CSV de students

### Convenções

- **Test naming:** `[unidade].spec.ts` ao lado do código (unit), `[feature].e2e-spec.ts`
  em `test/`.
- **Factories:** lib `@faker-js/faker` + factory typesafe por entidade
  (`makeStudent({ overrides })`).
- **Banco de teste:** Testcontainers Postgres ephemeral; transação por teste com rollback.
- **CI exige:** lint OK, typecheck OK, todos os testes passando, cobertura mínima global 70%.

---

## 12. API e contratos

### Versionamento

- URL: `/api/v1/...`. Mudanças breaking em `/api/v2/...`.
- OpenAPI/Swagger automático via `@nestjs/swagger`. Publicado em `/api/docs` em dev e staging.

### Contratos front ↔ back

Pacote `@school/shared`:
```
packages/shared/
├── src/
│   ├── schemas/         # Zod schemas (única fonte de verdade)
│   │   ├── student.schema.ts
│   │   └── ...
│   ├── types/           # types inferidos dos schemas + tipos auxiliares
│   ├── constants/       # enums (RoleKey, EnrollmentStatus, etc)
│   └── permissions/     # catálogo de permissions + definição de ability (CASL)
```

**Back:** controllers usam `class-validator` para entrada de HTTP, mas as DTOs são derivadas
dos schemas Zod via `z.infer` + helpers de conversão. Use cases recebem objetos já validados.

**Front:** TanStack Query + cliente fetch tipado:
```ts
// apps/web/src/lib/api/students.ts
import { studentResponseSchema, type CreateStudentInput } from '@school/shared';

export async function createStudent(input: CreateStudentInput) {
  return apiClient.post('/api/v1/students', input, studentResponseSchema);
}
```

`apiClient` é um wrapper que:
- Envia cookies automaticamente
- Trata refresh transparente em 401 (chama `/auth/refresh`, retenta)
- Parseia response pelo Zod schema fornecido (segurança em runtime)
- Lança erros tipados (`ApiError extends Error { code, status, details }`)
- Adiciona `Idempotency-Key` quando aplicável

---

## 13. Filas e jobs assíncronos (BullMQ + Redis)

| Fila | Propósito | Retry | Notas |
|------|-----------|-------|-------|
| `email-queue` | E-mails transacionais e em massa | exponential, 5 tentativas | Resend |
| `whatsapp-queue` | Mensagens WhatsApp | exponential, 5 tentativas | Z-API |
| `invoice-generation` | Cria Invoice mensal das Enrollments ativas | uma vez/mês | Cron job |
| `payment-reminder` | Régua de cobrança (D-3, D+1, D+7) | diário | Cron job |
| `webhook-processor` | Processa webhooks de gateway com idempotência | exponential, 10 tentativas | DLQ obrigatória |
| `audit-writer` | Persiste AuditLog (desacoplado do handler) | exponential, 5 tentativas | Reduz latência |
| `anonymization` | LGPD: anonimiza Enrollments expiradas | diário | Cron job |
| `csv-import` | Processa importação CSV | sem retry automático | Reportar erros granulares |
| `data-export` | Gera ZIP de dados do titular (LGPD) | sem retry automático | E-mail com link de download |

**Dashboard:** `@bull-board/express` montado em `/admin/queues` (acesso restrito a ADMIN).
**DLQ:** filas críticas (webhook-processor, payment-reminder) usam `failed-jobs` queue;
admin pode re-enfileirar manualmente.

---

## 14. Webhooks (Asaas)

### Endpoint

`POST /api/v1/webhooks/asaas`

### Fluxo

1. **Verificação HMAC** do header `asaas-access-token` (constante secret).
2. **Idempotência:** insere em `webhook_events` com `gateway_event_id`. Se conflito
   UNIQUE → já recebido, retorna 200 sem reprocessar.
3. **Enfileira** evento na `webhook-processor` queue.
4. **Responde 200** imediatamente (Asaas espera < 5s).
5. Worker consome:
   - Match event type → handler específico (`PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, etc).
   - Atualiza Invoice/Payment/Subscription correspondente.
   - Emite eventos de domínio (`InvoicePaid`, etc) — outros handlers reagem (envia recibo, atualiza dashboards).
   - Marca `webhook_events.status = PROCESSED`.
6. Falha do worker → exponential retry; após N falhas, vai pra DLQ e notifica admin.

### Sandbox

Ambiente staging usa Asaas sandbox. Eventos identificados por flag em config — nunca
processa pagamento real em staging.

---

## 15. Configuração e segredos

### Validação na inicialização

```ts
// apps/api/src/infrastructure/config/env.schema.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(64),
  JWT_REFRESH_SECRET: z.string().min(64),
  ENCRYPTION_KEY: z.string().length(64),       // hex, 32 bytes
  ENCRYPTION_KEY_VERSION: z.coerce.number().default(1),
  SEARCH_HASH_KEY: z.string().length(64),
  ASAAS_API_KEY: z.string(),
  ASAAS_WEBHOOK_TOKEN: z.string(),
  RESEND_API_KEY: z.string(),
  ZAPI_INSTANCE_ID: z.string(),
  ZAPI_TOKEN: z.string(),
  R2_ACCOUNT_ID: z.string(),
  R2_ACCESS_KEY_ID: z.string(),
  R2_SECRET_ACCESS_KEY: z.string(),
  R2_BUCKET: z.string(),
  SENTRY_DSN: z.string().url().optional(),
  FRONTEND_URL: z.string().url(),
});
```

App **não sobe** se validação falhar.

### Camadas de config

- `.env.local` — dev pessoal, gitignored
- `.env.example` — template commitado, sem valores reais
- **Staging/Production:** Doppler ou variáveis nativas do provedor (Railway/Fly).

### Feature flags

MVP: env vars booleanas (`FEATURE_WHATSAPP_ENABLED=true`).
Se virar dor: PostHog ou Unleash.

---

## 16. i18n

Estrutura preparada desde o início, mesmo que MVP só em pt-BR:

- **Back:** `nestjs-i18n`. Mensagens com chaves (`errors.enrollment.already_cancelled`).
  Locale resolvido por header `Accept-Language` ou query param `?lang=pt-BR`.
- **Front:** `next-i18next` ou `next-intl`. Arquivos `pt-BR.json` em `apps/web/src/locales/`.
- **Zod:** mensagens custom localizadas.
- **Datas/números/moeda:** `Intl.*` API com locale dinâmico.

Adicionar `en-US` ou `es-ES` no futuro = só traduzir os arquivos.

---

## 17. Importação CSV (MVP)

### Tipos suportados

- `STUDENTS`: dados básicos do aluno + responsáveis (inline ou referência)
- `GUARDIANS`: cadastro em massa
- `ENROLLMENTS`: matricula aluno existente em class existente

### Fluxo

1. ADMIN/STAFF acessa `/admin/imports/new`, escolhe tipo, baixa template CSV.
2. Preenche, faz upload.
3. Upload vai pro R2; cria `ImportJob` status `PENDING`.
4. Job enfileirado em `csv-import` queue.
5. Worker:
   - Lê CSV linha por linha (streaming, suporta arquivos grandes).
   - Valida cada linha contra schema Zod específico do tipo.
   - Tenta inserir em transação por lote (100 linhas).
   - Em erro de linha: marca linha com erro detalhado, segue adiante.
   - Atualiza `ImportJob` progressivamente (`processed_rows`, `success_rows`, `failed_rows`).
6. Ao final, status `COMPLETED` ou `PARTIAL` (com lista de erros).
7. UI mostra resultado com link para baixar CSV de erros (linhas que falharam + razão).

### Validações específicas

- Idempotência: re-importar mesmo CSV não duplica (chave: hash do conteúdo da linha).
- Consentimento LGPD: para Students/Guardians, exige flag `consent_granted=true` na linha
  ou aceite em massa explícito antes do upload.

---

## 18. Deploy e ambientes

### Ambientes

| Ambiente | URL | Banco | Gateway |
|----------|-----|-------|---------|
| Local | localhost | Postgres em Docker | Asaas sandbox |
| Staging | staging.app.com | Neon (db separado) | Asaas sandbox |
| Production | app.com | Neon (production) | Asaas produção |

### CI/CD (GitHub Actions)

- **PR aberto:** lint + typecheck + test (unit + integration). Bloqueia merge se falha.
- **Push em `develop`:** roda tudo + e2e + deploy automático em **staging**. Job separado roda migrations.
- **Tag `vX.Y.Z` em `main`:** roda tudo + deploy em **production**. Job manual aprovado roda migrations.
- **Rollback:** redeployar versão anterior. Migrations: ter sempre migration de rollback testada (TypeORM gera `up`/`down`).

### Migrations em deploy

- Job **separado** do deploy da app (não na inicialização do processo).
- Ordem: migrations rodam **antes** de subir nova versão da app (compatibilidade backward por 1 deploy).
- Em prod: revisão manual da migration + aprovação antes de rodar.

---

## 19. Sprints — plano de execução

### Sprint 0 — Fundação

**Objetivo:** repo funcional, DX excelente, CI verde.

- [ ] Inicializar monorepo: Turborepo + pnpm workspaces
- [ ] Configs compartilhados: `@school/tsconfig`, `@school/eslint-config`
- [ ] `apps/api` (NestJS) bootstrap: config module com Zod, validation pipe global, Helmet, CORS, rate limiter, Pino, Swagger
- [ ] `apps/web` (Next.js App Router) bootstrap: Tailwind, shadcn/ui, layout base
- [ ] `packages/shared` com Zod, exports tipados
- [ ] TypeORM DataSource + migration vazia + scripts npm (`migration:generate`, `migration:run`, `migration:revert`)
- [ ] Docker Compose: Postgres, Redis, MailHog, Adminer
- [ ] Husky + commitlint + lint-staged
- [ ] GitHub Actions: lint + typecheck + test + build
- [ ] README com instruções de setup

### Sprint 1 — Identidade, Hierarquia & Auth

**Objetivo:** multi-tenant funcional com auth completo.

- [ ] Entidades: Organization, School, User, Role, Permission, UserRole, RolePermission, StaffSchool, CoachClass, Session, Invite, AuditLog
- [ ] Migration inicial + seed de Permissions e Roles default
- [ ] `RequestContext` (AsyncLocalStorage) + `TenantSubscriber`
- [ ] AuthModule: signup org, login, refresh, logout, logout-all, esqueci-senha, verificação de e-mail
- [ ] Cookies HTTP-only + refresh rotativo + detecção de reuso
- [ ] InviteModule: criar, enviar e-mail, aceitar
- [ ] Decorators: `@RequirePermissions`, `@CheckOwnership`, `@CurrentUser`, `@Public`
- [ ] Guards: `AuthGuard`, `PermissionsGuard`, `OwnershipGuard`, `TenantGuard`
- [ ] `SchoolScopeInterceptor` para SCHOOL_STAFF
- [ ] `AuditInterceptor` global
- [ ] Exception filter global com formato padronizado
- [ ] Tests unitários do AuthModule (>90% cobertura) + e2e dos fluxos críticos

### Sprint 2 — Front base + auth

- [ ] Páginas: signup org, login, aceitar convite, esqueci senha
- [ ] Layout autenticado com seletor de School
- [ ] CASL no front + `<Can>` component
- [ ] Tela de gerenciar usuários (listar, convidar, atribuir roles, desativar)
- [ ] Tela de sessões ativas (do próprio user) — revogar
- [ ] Cliente API (`apiClient`) com refresh transparente

### Sprint 3 — Núcleo da escolinha

- [ ] CRUD School (ADMIN, ORG_STAFF)
- [ ] CRUD Modality (catálogo da org)
- [ ] CRUD SchoolModality (vínculo + preço por unidade)
- [ ] CRUD Class
- [ ] Atribuir/remover Coach a Class
- [ ] CRUD Student + criptografia de PII
- [ ] CRUD Guardian + criptografia de PII
- [ ] CRUD StudentGuardian (vincular pais a filhos)
- [ ] Consent management
- [ ] Convite automático do Guardian no cadastro
- [ ] Portal inicial do Guardian (lista dependentes)

### Sprint 4 — Matrículas & Presença

- [ ] Enrollment: criar (com snapshot de fee), pausar, cancelar, retomar
- [ ] Tela de matrícula (admin/staff)
- [ ] AttendanceSession + AttendanceRecord
- [ ] Tela do COACH para registrar presença (mobile-first)
- [ ] Visão Guardian: histórico de presença do filho

### Sprint 5 — Financeiro

- [ ] Integração Asaas: cliente, cobrança Pix+Boleto, assinatura
- [ ] Geração automática de Invoice ao criar Enrollment
- [ ] Endpoint webhook + idempotência + worker
- [ ] Régua de cobrança (jobs: D-3, D+1, D+7)
- [ ] Dashboard financeiro admin
- [ ] Portal Guardian: faturas em aberto, histórico, pagar via Pix

### Sprint 6 — Comunicação

- [ ] CRUD CommunicationTemplate (variáveis)
- [ ] Composer de Communication com segmentação (filtros: school, class, modality, status)
- [ ] Integração Resend (e-mail) com tracking de delivered/opened
- [ ] Integração Z-API (WhatsApp)
- [ ] Histórico de envios + status por destinatário

### Sprint 7 — Polimento, LGPD operacional e Importação

- [ ] Importação CSV (Students, Guardians, Enrollments)
- [ ] Exportação de dados do titular (LGPD)
- [ ] Tela de anonimização
- [ ] Job diário de anonimização automática
- [ ] Dashboard admin com métricas (alunos ativos, MRR, churn, inadimplência)
- [ ] Relatórios (financeiro, presença, ocupação) com export CSV/PDF
- [ ] Tela de auditoria
- [ ] Página pública de política de privacidade + termos
- [ ] Sentry configurado em prod
- [ ] Backup automático ativo + teste de restore documentado

---

## 20. Definições visuais (opcional, para discussão depois)

- Paleta de marca, tipografia e tom visual ficam para sprint de UX dedicada.
- shadcn/ui defaults são suficientes para o MVP funcional.

---

## 21. Não-objetivos do MVP

Para evitar scope creep, **estão explicitamente fora**:

- App mobile nativo (PWA cobre)
- MFA/2FA ativo (estrutura preparada)
- Roles customizadas pelo painel (seed versionada cobre)
- Múltiplos gateways de pagamento (só Asaas)
- Aluno com login próprio
- Métricas Prometheus/Grafana
- Marketplace de modalidades / catálogo público
- Integrações com sistemas escolares externos

---

## 22. Como usar este documento com o Claude Code

1. Colocar este arquivo em `PROJECT_PLAN.md` na raiz do repo.
2. Em cada nova sessão do Claude Code, instruir: *"leia PROJECT_PLAN.md como contexto
   antes de qualquer ação"*.
3. Para trabalhar em uma sprint específica: *"vamos executar Sprint 1. Os critérios estão
   no PROJECT_PLAN.md §19. Comece pela primeira tarefa e prossiga sequencialmente,
   pedindo confirmação antes de tarefas com risco alto (migrations, novos pacotes)."*
4. Quando uma decisão arquitetural for tomada/alterada durante o desenvolvimento,
   **atualizar este documento** antes de codar a mudança.
5. Para módulos novos: copiar a estrutura padrão de Clean Architecture do §3.
