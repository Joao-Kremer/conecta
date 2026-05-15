# 06 — Frontend guide

> **When to read:** Before writing any UI code, designing a screen, or modifying tenant theming.
> **Prerequisites:** `01-ARCHITECTURE.md`, `05-BACKEND_GUIDE.md` (API contracts section)
> **TL;DR:** Next.js App Router. RHF + Zod for forms. TanStack Query for server state. shadcn/ui + Tailwind. Cookies handled server-side via Route Handlers. CASL mirrors backend permissions for UX only. Visual identity is clean + warm; tenants customize primary/accent colors, logo, favicon, brand name via CSS variables — no rebuild.

---

## App Router structure

```
apps/web/src/app/
├── (public)/
│   ├── layout.tsx                 Marketing shell — no auth
│   ├── page.tsx                   Landing
│   ├── login/
│   ├── signup/
│   ├── invite/[token]/
│   ├── verify-email/[token]/
│   ├── forgot-password/
│   └── reset-password/[token]/
├── (auth)/
│   ├── layout.tsx                 Auth shell + sidebar + school selector
│   ├── dashboard/
│   ├── schools/
│   ├── students/
│   ├── guardians/
│   ├── classes/
│   ├── enrollments/
│   ├── attendance/
│   ├── invoices/
│   ├── payments/
│   ├── communications/
│   ├── reports/
│   ├── settings/
│   └── admin/
│       ├── users/
│       ├── audit/
│       └── imports/
├── (guardian)/
│   ├── layout.tsx                 Guardian portal shell (different UX)
│   ├── dependents/
│   ├── invoices/
│   ├── communications/
│   └── profile/
└── api/                           Route handlers (auth/cookies proxy to Nest)
    ├── auth/
    │   ├── login/route.ts
    │   ├── refresh/route.ts
    │   └── logout/route.ts
    └── [...proxy]/route.ts        Catch-all for forwarding to API with cookies
```

## Why a proxy on `/api/*`?

The NestJS API serves cookies on its own origin. Calling it directly from the browser would require either CORS with credentials (fragile) or running them on the same origin (deploy coupling). Solution: Next.js Route Handlers forward requests to the NestJS API and pass cookies through, so the browser only ever talks to the Next origin.

Pattern:
```ts
// apps/web/src/app/api/[...proxy]/route.ts
export async function GET(req: NextRequest, { params }: { params: { proxy: string[] } }) {
  return forwardToApi(req, params.proxy);
}
```

`forwardToApi`:
- Constructs `${env.API_URL}/${path}` with query string preserved.
- Forwards cookies via `Cookie` header.
- Forwards `X-Requested-With: school-platform` for CSRF defense.
- Forwards Authorization-like headers selectively.
- Streams response body back.
- Forwards `Set-Cookie` from API back to browser (the only place cookies enter/leave).

## Auth flow on the client

1. User logs in via `POST /api/auth/login` (handler).
2. Handler calls NestJS, gets `Set-Cookie` headers, sets them on the browser.
3. Subsequent requests through `/api/*` automatically include cookies.
4. On `401`, the API client tries `POST /api/auth/refresh` once; on success, retries the original; on failure, redirects to login.

```ts
// apps/web/src/lib/api/client.ts
async function request<T>(path: string, init: RequestInit, schema: ZodSchema<T>): Promise<T> {
  const res = await fetch(`/api${path}`, { ...init, headers: defaultHeaders(init.headers) });
  if (res.status === 401 && !init.skipRefresh) {
    const refreshed = await fetch('/api/auth/refresh', { method: 'POST' });
    if (refreshed.ok) return request(path, { ...init, skipRefresh: true }, schema);
    throw new UnauthorizedError();
  }
  if (!res.ok) throw await ApiError.from(res);
  return schema.parse(await res.json());
}
```

## Server Components and data fetching

App Router gives us Server Components by default. Use them generously:

- **Lists/details pages:** fetch on the server (RSC), pass to Client Component for interactivity.
- **Forms:** Client Component, but the initial data can come from a parent Server Component.
- **Mutations:** Client Component + TanStack Query mutations.

```tsx
// app/(auth)/students/page.tsx — Server Component
export default async function StudentsPage({ searchParams }: Props) {
  const students = await apiServer.students.list({ cursor: searchParams.cursor });
  return <StudentsTable initialData={students} />;
}
```

```tsx
// app/(auth)/students/students-table.tsx — 'use client'
'use client';
export function StudentsTable({ initialData }: { initialData: StudentsList }) {
  const { data } = useQuery({
    queryKey: ['students', cursor],
    queryFn: () => apiClient.students.list({ cursor }),
    initialData,
  });
  // ...
}
```

For mutations and anything interactive — Client Components + TanStack Query.

## State management

| State type | Tool |
|------------|------|
| Server cache (data fetched from API) | TanStack Query |
| URL state (filters, page, tab) | `useSearchParams` + `useRouter` |
| Form state | React Hook Form |
| Auth/session client snapshot | A Zustand store (`useAuthStore`) hydrated on layout mount |
| Selected school (for ADMIN/STAFF) | A Zustand store, persisted in `localStorage` |
| Component-local | `useState` |
| Cross-component but UI-only (modals, toasts) | A Zustand store or context, sparingly |

Avoid: Redux, MobX, custom global event buses.

### TanStack Query conventions

- **Query keys:** stable arrays — `['students', { cursor, q, schoolId }]`.
- **Query keys factory** per resource (`apps/web/src/lib/api/students/keys.ts`).
- **Default staleTime:** 30 seconds; tune per resource.
- **Mutations invalidate** affected query keys explicitly. Don't blanket-invalidate.

```ts
const updateStudent = useMutation({
  mutationFn: apiClient.students.update,
  onSuccess: (updated) => {
    queryClient.invalidateQueries({ queryKey: studentKeys.detail(updated.id) });
    queryClient.invalidateQueries({ queryKey: studentKeys.list() });
  },
});
```

## Forms

**React Hook Form + Zod** is the standard. The schema comes from `@school/shared`.

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStudentInputSchema, type CreateStudentInput } from '@school/shared';

export function CreateStudentForm() {
  const form = useForm<CreateStudentInput>({
    resolver: zodResolver(createStudentInputSchema),
    defaultValues: { /* … */ },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    await apiClient.students.create(values);
    toast.success('Aluno cadastrado.');
  });

  return (
    <Form {...form}>
      <FormField name="fullName" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>Nome completo</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
      {/* … */}
      <Button type="submit" disabled={form.formState.isSubmitting}>Salvar</Button>
    </Form>
  );
}
```

**Rules:**
- Server errors with `details` from `ApiError` are mapped to form errors via `form.setError`.
- Never trust client validation alone — backend re-validates with the same schema.
- Display field errors inline, not in a banner.
- Disable submit while submitting.

## UI components

> **The visual design system is defined in `06-FRONTEND_GUIDE.md`.** That doc is the authority on typography, spacing, radii, components, tone, and the do's & don'ts. Tenant theming (brand tokens, logo, derivation, validation) is in `06-FRONTEND_GUIDE.md`. This section covers only the implementation patterns specific to the frontend stack.

### shadcn/ui

- Primitive components in `apps/web/src/components/ui/` are generated by the shadcn CLI.
- **Don't edit them directly** — regenerate or extend via composition.
- For project-specific variations, create a wrapper in `apps/web/src/components/`.

### Tailwind

- Use design tokens defined in `tailwind.config.ts`, not arbitrary values.
- **Brand tokens** (`primary`, `primary-strong`, `primary-soft`, `primary-on`, plus the same for `accent`) resolve to CSS variables that the `ThemeProvider` injects per tenant. Just write `bg-primary text-primary-on` — no per-tenant logic in component code.
- **Semantic tokens** (`success`, `warning`, `danger`, `info`, each with `-strong` and `-soft`) are **fixed** across all tenants. Never override them with brand colors — see `06-FRONTEND_GUIDE.md`.
- Spacing scale: stick to Tailwind defaults (`p-4`, `gap-2`, etc).
- Responsive: mobile-first. Coach attendance UI must work on phones.

Example using brand tokens correctly:

```tsx
// Primary CTA — themed per tenant
<button className="bg-primary text-primary-on hover:bg-primary-strong">
  Salvar
</button>

// Status pill — semantic, NEVER per tenant
<span className="bg-success-soft text-success-strong">
  Ativo
</span>

// Active nav item — themed per tenant
<a className="bg-primary-soft text-primary-strong">
  Dashboard
</a>
```

### Theme provider

The root layout (`app/layout.tsx`) resolves the tenant theme server-side and injects a `<style>` block defining the `--brand-*` variables before any client CSS paints. Implementation lives in `apps/web/src/lib/theme/`. See `06-FRONTEND_GUIDE.md` for the full resolution chain and `BrandLogo` fallback rendering.

### Tables

Standard pattern:

```tsx
<DataTable
  columns={studentColumns}
  data={students}
  pagination={{ cursor, nextCursor, onLoadMore }}
  loading={isLoading}
  empty={<EmptyState />}
/>
```

`DataTable` is a project component on top of TanStack Table.

### Loading and empty states

- Every list view has an explicit empty state with an action ("No students yet — [Add one]").
- Skeletons for loading lists (not spinners).
- Spinners only for in-place actions (button loading).

### Toasts and modals

- Toasts: success / error. Brief.
- Modals: confirmation for destructive actions (cancel enrollment, refund).
- Destructive actions require typing the resource name (like GitHub repo delete).

## Permissions on the client (CASL)

```ts
// apps/web/src/lib/permissions/use-ability.ts
import { useAuth } from '@/hooks/use-auth';
import { defineAbilityFor } from '@school/shared/permissions';

export function useAbility() {
  const { user } = useAuth();
  return useMemo(() => defineAbilityFor(user), [user]);
}
```

```tsx
const ability = useAbility();
{ability.can('update', 'Student', student) && (
  <Button onClick={openEdit}>Edit</Button>
)}
```

**Rules:**
- Use for **hiding/disabling UI**.
- **Never rely on it for security.** Backend always re-checks.
- Don't cache abilities aggressively — recompute on login or role change.

## Routing patterns

- **Authenticated routes** under `(auth)` group rely on a layout that:
  1. Reads cookies on the server.
  2. Validates session via `/auth/me`.
  3. If invalid → redirect to `/login`.
  4. Provides user data via `AuthProvider` (Zustand hydration).

- **Guardian routes** under `(guardian)` have a stripped-down layout — no school selector, simpler nav.

- **Public routes** under `(public)` have no auth check.

- **Role gating** at the route level: a `requireRoles(['ADMIN','ORG_STAFF'])` helper used in the layout's middleware-style check.

## Internationalization

- `next-intl` configured at app root.
- Default locale `pt-BR`. English ready to add later.
- All user-facing strings via `t('namespace.key')`.
- Date/time: `Intl.DateTimeFormat` with locale + School timezone.
- Currency: `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })` helper in `lib/utils/currency.ts`.

## Performance

- Code-split large dashboards via `dynamic(() => import(...), { ssr: false })` only when really client-only.
- Prefer Server Components for content; Client Components for interactivity.
- Avoid heavy libs in shared layouts.
- Image optimization via `next/image` for student photos (with signed URL props).

## Accessibility

- Every interactive element has a visible focus state (shadcn defaults are good).
- Labels for every form field; error messages associated via `aria-describedby`.
- Color contrast at WCAG AA.
- Keyboard nav works on tables, modals, and forms.
- ESLint plugin `eslint-plugin-jsx-a11y` enabled.

## What "good UI code" looks like

✅ Forms feel instant (optimistic where safe), errors are inline, defaults make sense.
✅ Tables paginate cleanly, filters are in the URL, refresh restores state.
✅ Empty states guide the next action.
✅ Mobile-first; coach attendance works on a phone in poor light.
✅ The portal is uncluttered — guardians find what they need in 1–2 taps.

## Anti-patterns

❌ Fetching in `useEffect` instead of TanStack Query.
❌ Putting business logic in components (move to use cases on the API).
❌ One giant `app/page.tsx` with everything.
❌ `useEffect` dependency arrays as a footgun for sync.
❌ Tailwind utilities → inline styles → CSS modules → all mixed.
❌ Conditional `'use client'` everywhere "just in case."
❌ Direct DOM manipulation outside controlled wrappers.
❌ Ignoring loading/empty/error states.

---

## Design system (style guide)

Visual language for everything we build. Clean + warm: serious neutral base because staff use it daily, with subtle warmth because it's about kids and families. The tenant's brand carries the personality; the platform is the canvas.


---

## Design principles

These principles override case-by-case preferences. When in doubt, return to them.

1. **The tenant owns the personality.** The platform's own visual identity is restrained on purpose. Primary and accent are tenant-controlled; everything else stays consistent so the UX is predictable across all tenants.
2. **Form follows the job.** Coach attendance is one-handed on a phone. Admin reports are dense on desktop. Guardian portal is for someone holding a baby. We design each surface for its real context.
3. **Calm by default, loud when it matters.** Errors, defaulters, and irreversible actions get strong visual emphasis. Everything else stays quiet.
4. **One way to do each thing.** A button is a button. A confirmation is a confirmation. No five variations of the same component scattered across the app.
5. **Accessible isn't optional.** WCAG AA contrast everywhere, keyboard nav on every interaction, visible focus states, semantic HTML.
6. **Empty, loading, and error states are first-class.** A list view without an empty state is not done.
7. **Mobile-first for operational surfaces.** Coach attendance, guardian portal. Desktop-first for admin reports and configuration.

---

## Typography

### Font families

| Use | Family | Where to load |
|-----|--------|---------------|
| UI body and labels | **Inter** | `next/font/google` |
| Display (page titles, hero, KPI numbers) | **Geist Sans** | `next/font/google` |
| Monospace (code, IDs, copy-to-clipboard) | **Geist Mono** | `next/font/google` |

Both Inter and Geist are open-source, free, and rendering-tested in production at scale. Inter for legibility at small sizes; Geist for clarity in large display contexts (a numerals-tuned font matters for KPI dashboards).

Setup in `apps/web/src/app/layout.tsx`:

```tsx
import { Inter, Geist, Geist_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const geist = Geist({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });
```

### Scale

| Token | Size | Line height | Weight | Use for |
|-------|------|-------------|--------|---------|
| `text-display-2xl` | 36px | 1.15 | 600 | Marketing hero |
| `text-display-xl` | 30px | 1.2 | 600 | Page hero / signup |
| `text-display-lg` | 24px | 1.25 | 600 | KPI values, page titles |
| `text-display-md` | 20px | 1.3 | 600 | Section titles |
| `text-base` | 16px | 1.5 | 400 | Body |
| `text-sm` | 14px | 1.5 | 400 | Secondary body, table cells, form labels |
| `text-xs` | 12px | 1.4 | 500 | Pills, badges, tiny labels |
| `text-overline` | 11px | 1.2 | 500 | (Used sparingly) section eyebrows |

Weight rules:
- **400** regular for prose, body, descriptions.
- **500** medium for labels, buttons, table headers, KPI labels.
- **600** semibold reserved for **display** (page titles, KPI values, hero).
- **No 700 bold.** Heavy weights fight the calm baseline.

### Hierarchy guidelines

- One **display** title per screen, top-left.
- Section titles in `text-display-md` (20px) with `mb-3` (12px) before content.
- Body copy default at `text-sm` (14px) for app surfaces — denser than marketing.
- Pair size **and** color to create hierarchy: 16px primary, 14px secondary, 12px tertiary.
- Avoid italics; reserve for emphasis or citations.

---

## Spacing

Tailwind defaults. Use the scale; don't invent values.

| Token | Value | Common use |
|-------|-------|------------|
| `1` | 4px | Icon-to-text inline gap |
| `2` | 8px | Compact list rows, badge padding |
| `3` | 12px | Form field gap, card inner gap |
| `4` | 16px | **Default content padding** |
| `6` | 24px | Section vertical rhythm |
| `8` | 32px | Page vertical rhythm |
| `12` | 48px | Hero / empty state breathing room |

Density mode: app surfaces use **comfortable** density (`p-4` containers, `gap-3` inside). Tables can drop to `py-2` rows.

---

## Radius

Modern but not infantile. Slightly rounded.

| Token | Value | Use |
|-------|-------|-----|
| `rounded-sm` | 4px | Pills, badges, tiny chips |
| `rounded-md` | 8px | **Default** — inputs, buttons, small cards |
| `rounded-lg` | 12px | Cards, modals, sections |
| `rounded-xl` | 16px | Marketing hero cards (sparingly) |
| `rounded-full` | 9999px | Avatars, circular icon buttons |

Never mix radii on a single component. A button group has consistent corners. A card with rounded outside and squared inner elements feels broken.

---

## Color system

> See `06-FRONTEND_GUIDE.md` for the tenant-controlled tokens (`primary`, `accent`). Everything below is **fixed** across all tenants — protecting UX, accessibility, and semantic meaning.

### Fixed tokens

| Token | Light value | Use |
|-------|-------------|-----|
| `--color-bg` | `#ffffff` | Default page background |
| `--color-bg-muted` | `#fafaf9` | Subtle surface (sidebar, KPI cards) |
| `--color-bg-elevated` | `#ffffff` | Modals, popovers |
| `--color-border` | `#e4e4e7` | Default border |
| `--color-border-strong` | `#d4d4d8` | Emphasized border, hover |
| `--color-text` | `#18181b` | Primary text |
| `--color-text-muted` | `#52525b` | Secondary text |
| `--color-text-subtle` | `#71717a` | Tertiary text, captions |
| `--color-text-on-primary` | `#ffffff` | Text on the brand primary fill |

### Semantic tokens (also fixed)

These never change per tenant — they convey universal meaning.

| Token | Fill | Strong | Soft | Use |
|-------|------|--------|------|-----|
| `success` | `#16a34a` | `#14532d` | `#dcfce7` | Confirmation, "Active", paid |
| `warning` | `#d97706` | `#7c2d12` | `#fef3c7` | Caution, due soon, attention |
| `danger` | `#dc2626` | `#7f1d1d` | `#fee2e2` | Errors, overdue, destructive |
| `info` | `#0284c7` | `#0c4a6e` | `#e0f2fe` | Informational notices |

Even if the tenant's brand is red (martial arts) or green (soccer), `danger` is **always** red and `success` is **always** green in the UI. The brand red doesn't take over the error state — error states are red.

### Brand tokens (tenant-controlled)

| Token | Source | Use |
|-------|--------|-----|
| `--brand-primary` | Tenant config | Primary CTAs, active nav, logo accent |
| `--brand-primary-strong` | Derived (darker) | Hover, pressed, text on `primary-soft` |
| `--brand-primary-soft` | Derived (much lighter) | Active nav background, badges |
| `--brand-accent` | Tenant config | Secondary highlights, avatars, links |
| `--brand-accent-strong` | Derived | Hover, text on `accent-soft` |
| `--brand-accent-soft` | Derived | Subtle highlights, info pills |

See `06-FRONTEND_GUIDE.md` for the derivation algorithm and contrast validation.

### Where to use each color family

| Surface | Token |
|---------|-------|
| Primary button background | `brand-primary` |
| Primary button hover | `brand-primary-strong` |
| Active nav item background | `brand-primary-soft` |
| Active nav item text | `brand-primary-strong` |
| Form submit, "Save", "Create" | `brand-primary` |
| "Cancel" / secondary button | Outline + `text` token |
| Destructive button ("Delete", "Anonymize") | `danger` |
| "Paid" status pill | `success` |
| "Overdue" status pill | `danger` |
| "Pending" / "Pause" status pill | `warning` |
| Link / external action | `brand-accent` |
| Avatar background | `brand-accent-soft` |
| Avatar initials | `brand-accent-strong` |

---

## Elevation

Flat by default. Shadows only where elevation has functional meaning.

| Token | Use |
|-------|-----|
| (none) | Almost everything — borders separate, not shadows |
| `shadow-sm` | Cards on hover (subtle lift) |
| `shadow-md` | Popovers, dropdowns |
| `shadow-lg` | Modals |
| `shadow-xl` | Toast notifications |

No glow effects, no neumorphism, no glassmorphism. Anything that screams "design template" is wrong.

---

## Iconography

- **Library:** Lucide React (`lucide-react`). Free, MIT, comprehensive, weights consistent.
- **Stroke width:** default (2). Don't override.
- **Sizes:** 14, 16, 20, 24 only. Inline icons in body text: 16. Inline in `text-sm`: 14. Standalone in buttons: 16. Section headers: 20. Hero icons: 24.
- **Color:** inherits from parent text color by default. Override only for semantic icons (danger icon = red).
- **No mixing icon sets.** Lucide everywhere. If a tenant uploads a custom icon for a sport, it lives separately as branded imagery, not in the icon system.

---

## Components — the reference set

We use shadcn/ui primitives as the foundation. The following are the components we standardize across the app. New components must compose from these, not introduce parallel implementations.

### Buttons

| Variant | When |
|---------|------|
| **Primary** | The main affirmative action on a surface. Max one per view. |
| **Secondary** (outline) | Alternative affirmative or "Cancel" in two-button dialogs |
| **Ghost** | Tertiary actions in toolbars, list rows |
| **Destructive** | Delete, cancel enrollment, refund. Always paired with confirmation. |
| **Link** | Inline navigation, "Forgot password" |

Sizes: `sm` (32px), `md` (36px — default), `lg` (40px for hero CTAs).

Rules:
- Verb-noun labels: "Save changes", "Add student", "Cancel enrollment". Not "Submit", not "OK".
- Loading state: spinner + label stays visible ("Saving…"). Don't replace label with spinner alone — looks broken.
- Disabled state: visibly disabled (50% opacity) + cursor `not-allowed`.
- Icon-left for affirmative ("+ Add"), icon-right for navigation (">").

### Inputs

- 36px height default.
- Always paired with `<Label>`.
- Error state: red border + small red helper text below.
- Helper text in `text-xs text-muted` below the field.
- Required marker: `*` after the label, in `text-danger`.
- Placeholder is for **example** content, not labels. Never use placeholder as the only label.

### Forms

- Single column on mobile, two columns max on desktop (only when fields are short and related, e.g. "City | State").
- `gap-4` between fields.
- Submit button: bottom-right of the form on desktop; full-width on mobile.
- Cancel: bottom-left, outline variant; or omit if the user can navigate back.
- Inline validation on blur, not on every keystroke.

### Cards

- Padding `p-4` or `p-6` depending on density.
- Border `border` + `rounded-lg`.
- Title row: `text-display-md` title + optional action button on the right.
- No shadow by default. `shadow-sm` on hover **only** if the card is interactive.

### Data tables

Built on `@tanstack/react-table` with a wrapper component.

- Row height: 40px default, 32px in dense mode.
- Header row: `bg-muted`, `text-xs font-medium text-muted` uppercase optional (we keep it sentence case for consistency).
- Zebra striping: **off**. Borders only.
- Hover: row gets `bg-muted` background.
- First column: identifier (avatar + name).
- Last column: row actions (dropdown menu trigger).
- Empty state inside the table area, not as a separate screen.

### Status pills

- Padding `px-2 py-0.5`, `text-xs font-medium`, `rounded-sm`.
- Background = soft variant of the semantic token, text = strong variant.
- Examples: `bg-success-soft text-success-strong` for "Ativa", `bg-warning-soft text-warning-strong` for "Pausada", `bg-danger-soft text-danger-strong` for "Cancelada".

### Avatars

- Sizes: `sm` (24px), `md` (32px — default), `lg` (40px), `xl` (64px for profile).
- Photo or initials. Initials from first + last name, max 2 chars.
- Background: `brand-accent-soft`. Text: `brand-accent-strong`.
- Circular always.

### Modals & dialogs

- Max width: 480px (small), 640px (medium), 800px (large).
- Trap focus, ESC closes, click outside closes (except destructive confirmations).
- Destructive confirmations require typing the resource name (GitHub-style) for irreversible actions: delete student, anonymize, refund > R$ 1000.
- Title `text-display-md`, body `text-sm`, actions bottom-right.

### Toasts

- Top-right (desktop), top-center (mobile).
- Auto-dismiss after 4s (success), 8s (error).
- Include the resource and the action ("Aluno Ana Silva criado") — not just "Sucesso!".
- Stacking: max 3 visible, FIFO.

### Empty states

Every list view has one. Structure:

```
[Icon, 48px, muted color]
[Title — text-display-md]
[Description — text-sm text-muted]
[Primary action button]
```

Examples:
- Students empty: "Nenhum aluno ainda" → "Comece cadastrando seu primeiro aluno" → [+ Novo aluno]
- Invoices empty: "Nenhuma fatura no período" → adjust filters CTA

### Loading states

- Lists / tables: skeleton rows matching the eventual layout. Never spinners centered on empty space.
- Page transitions: thin progress bar at the top (Next.js default works fine via `next/router`).
- Buttons: in-place spinner + label.
- Cards loading data: skeleton blocks.
- **Never** a full-screen loading overlay except for the initial app boot.

### Error states

- Field-level: inline red helper text.
- Section-level: red banner at the top of the section with a clear action ("Tente novamente" / "Recarregar").
- Page-level: friendly illustration + error code + "Voltar para o início" link.
- Network error: distinct messaging — "Sem conexão. Verificando…"
- Catastrophic crash: ErrorBoundary with a copy-to-clipboard `requestId` for support.

---

## Mobile-first surfaces

### Coach attendance (the most demanding surface)

- **One column**, large tap targets (min 44px tall).
- Status toggle (Present / Absent / Justified) as three big buttons per row.
- "Mark all present" sticky action at the top.
- Optimistic updates with offline queue (basic).
- Bottom safe-area respected (iOS notch).
- High contrast for outdoor / sunlight readability.

### Guardian portal

- Heavy use of **cards** — easier to tap than table rows on mobile.
- The single most important action ("Pagar") always visible without scrolling.
- Pix QR code: large, with copy button next to the long Pix key.
- Confirmation success: full-screen, large checkmark, plain language.

---

## Photography & illustrations

For the MVP, photography is **the tenant's responsibility** (their students, their facilities). The platform itself uses:

- **Illustrations:** subtle line-art, monochrome in the brand-accent color. Use sparingly — empty states, onboarding, success screens. Source: `unDraw` or commission a small set.
- **Icons:** Lucide only.
- **No stock photos** in our own UI — they age badly and look generic.

---

## Tone of voice

UI copy is the silent partner of design. Bad copy ruins good design.

| Quality | Example |
|---------|---------|
| **Direct** | "Cancelar matrícula" (not "Deseja cancelar?") |
| **Warm but not chatty** | "Tudo certo, Ana criada." (not "Oba! 🎉") |
| **Specific** | "7 alunos inadimplentes" (not "Alguns alunos") |
| **Action-oriented** | "Pagar com Pix" (not "Ir para pagamento") |
| **Plain Portuguese** | Avoid jargon. "Matrícula" not "Enrollment ID". |
| **Respectful** | Address users using "você" by default. No nicknames. |

### Error messages

Format: **What happened + Why + What to do next.**

- ❌ "Erro."
- ❌ "ENROLLMENT_ALREADY_CANCELLED"
- ✅ "Esta matrícula já foi cancelada em 10/05. Tente atualizar a página."

### Empty states

Format: **State + Reason (if useful) + Action.**

- ❌ "Sem dados"
- ✅ "Nenhum aluno ainda. Comece cadastrando seu primeiro aluno." [+ Novo aluno]

### Confirmations

Format: **Verb + Object + Consequence (if destructive).**

- ❌ "Tem certeza?"
- ✅ "Cancelar a matrícula de Ana Silva? Isso interrompe a cobrança da mensalidade."

---

## Accessibility minimums

- **Contrast:** WCAG AA on all text (≥ 4.5:1 for normal, ≥ 3:1 for large/bold). Brand tokens are validated server-side before save (see `06-FRONTEND_GUIDE.md`).
- **Focus:** visible on every interactive element. Default Tailwind ring works.
- **Keyboard:** every action reachable. Modals trap focus.
- **Screen readers:** semantic HTML (`<button>` not `<div onClick>`), `aria-label` for icon-only buttons, `aria-live` on toasts.
- **Motion:** respect `prefers-reduced-motion`. No autoplay animations.
- **Color is not the only signal:** status pills have text + color, not just color.

---

## Do's and don'ts

**Do**
- ✅ Use the design tokens defined here — don't reach for arbitrary Tailwind values.
- ✅ Compose from the standard components — Button, Input, Card, DataTable, etc.
- ✅ Write empty / loading / error states with the same care as the happy path.
- ✅ Validate any color the tenant picks for contrast before saving.
- ✅ Keep mobile coach attendance one-handed and one-tap.
- ✅ Test in the worst real condition: dim screen, sunlight, gloves, baby in the other arm.

**Don't**
- ❌ Add a sixth font weight. Stick to 400/500/600.
- ❌ Invent a custom border-radius for one component.
- ❌ Use the brand primary for danger states. Semantic colors are sacred.
- ❌ Center spinners on empty space — use skeletons.
- ❌ Hide important actions behind hovers on mobile.
- ❌ Use emoji as decoration. (System emoji in user-generated content is fine.)
- ❌ Override Lucide icons inline with random colors.
- ❌ Ship a list view without an empty state.

---

## References

- shadcn/ui — <https://ui.shadcn.com>
- Tailwind v3 — <https://tailwindcss.com>
- Geist + Inter — Vercel and Rasmus Andersson respectively
- Lucide — <https://lucide.dev>
- WCAG AA — <https://www.w3.org/WAI/WCAG2AA-Conformance>
- `06-FRONTEND_GUIDE.md` — implementation patterns
- `06-FRONTEND_GUIDE.md` — tenant theming

---

## White-label theming

Each Organization configures `primary` + `accent` colors, logo, favicon, and brand name. Soft and strong tones are derived automatically. WCAG AA contrast validated server-side. CSS variables injected per-tenant at request time — no rebuild. Custom domain and branded email are post-MVP.


---

## Scope

### What the tenant configures

| Field | Type | Constraints |
|-------|------|-------------|
| `brandName` | string | 2–60 chars. Defaults to `organization.name`. |
| `brandPrimary` | hex `#RRGGBB` | Must pass WCAG AA contrast vs white (≥ 4.5:1 for text). |
| `brandAccent` | hex `#RRGGBB` | Must pass WCAG AA contrast vs white (≥ 4.5:1). |
| `logoUrl` | URL (R2) | PNG or SVG. Max 2 MB. Min 256×256. Transparent background recommended. |
| `logoSmallUrl` | URL (R2) | Optional. PNG or SVG for collapsed sidebar / favicon source. |
| `faviconUrl` | URL (R2) | Optional. If missing, generated from `logoSmallUrl` or first letter of `brandName`. |

Anything **not** in this list is fixed across all tenants for MVP — see `06-FRONTEND_GUIDE.md`.

### Where the theming applies

| Surface | Applies? | How |
|---------|----------|-----|
| Web app — sidebar, header, buttons, active states | ✅ | CSS variables injected at request |
| Web app — semantic colors (success/danger/warning) | ❌ | Fixed |
| Login page (per-tenant URL) | ✅ | Same CSS variable injection |
| Transactional emails (welcome, invite, invoice, reset) | ✅ | Inline styles + logo URL |
| PDFs (receipts, enrollment certificates) | ✅ | Header bar in primary color, logo top-left |
| WhatsApp messages | ⚠️ Partial | Text only. Prefix messages with `[BrandName]`. |
| Custom domain (`app.escolinha.com.br`) | ❌ MVP | Post-MVP roadmap |
| Email "From" with tenant domain | ❌ MVP | Post-MVP. MVP uses `Reply-To` with tenant email. |
| Hide "Powered by SchoolHub" | ❌ MVP | Always shown small in footer |

---

## Data model

Extension to the `organizations.settings` JSONB column. The schema lives in `@school/shared/schemas/organization-theme.schema.ts`:

```ts
import { z } from 'zod';

export const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida');

export const organizationThemeSchema = z.object({
  brandName: z.string().min(2).max(60),
  brandPrimary: hexColorSchema,
  brandAccent: hexColorSchema,
  logoUrl: z.string().url().nullable(),
  logoSmallUrl: z.string().url().nullable(),
  faviconUrl: z.string().url().nullable(),
});

export type OrganizationTheme = z.infer<typeof organizationThemeSchema>;
```

Stored at `organizations.settings.theme`. Default for new orgs:

```ts
{
  brandName: organization.name,
  brandPrimary: '#16a34a',  // platform default (calm green)
  brandAccent:  '#0ea5e9',  // platform default (clear blue)
  logoUrl: null,
  logoSmallUrl: null,
  faviconUrl: null,
}
```

---

## Token derivation

The tenant chooses **2 colors**. The platform derives **6 more** (`*-strong` and `*-soft` for both primary and accent, plus on-color text). This keeps configuration simple and the result consistent.

### Algorithm

Implemented with `culori` (small, treeshakable, OKLCH-aware).

```ts
import { converter, formatHex, parse } from 'culori';
const toOklch = converter('oklch');
const toHex   = formatHex;

/**
 * Derive strong (darker, for text on soft/hover) and soft (much lighter, for backgrounds).
 * We work in OKLCH so perceived lightness is consistent across hues.
 *  - strong: same hue/chroma, lightness clamped low (text-safe contrast on white).
 *  - soft:   same hue, low chroma, very high lightness (background tint).
 */
export function deriveTones(hex: string): { strong: string; soft: string } {
  const c = toOklch(parse(hex));
  if (!c) throw new Error('Invalid color');

  const strong = toHex({ ...c, l: Math.min(c.l, 0.30) });             // L ≤ 0.30 → reliable contrast
  const soft   = toHex({ ...c, l: 0.95, c: Math.min(c.c, 0.04) });    // very light, low chroma tint

  return { strong, soft };
}
```

For text **on** the brand-primary fill (e.g. button label):
- If `relativeLuminance(primary) < 0.5` → white text.
- Else → `brand-primary-strong`.

A `computeBrandTokens(theme)` helper returns the full token bag:

```ts
{
  primary: '#15803d',
  primaryStrong: '#0b3f1f',
  primarySoft: '#eaf5ee',
  primaryOn: '#ffffff',
  accent: '#dc2626',
  accentStrong: '#6b1313',
  accentSoft: '#fbe6e6',
  accentOn: '#ffffff',
}
```

Pure function, deterministic, easy to unit-test.

---

## Contrast validation

Run on every save (backend) **and** while typing in the configuration UI (frontend, same shared module).

```ts
// @school/shared/theming/contrast.ts
export function contrastRatio(hexA: string, hexB: string): number { /* WCAG formula */ }

export function validateBrandColor(hex: string): { ok: true } | { ok: false; reason: string } {
  if (contrastRatio(hex, '#ffffff') < 4.5) {
    return { ok: false, reason: 'Cor clara demais. Use um tom mais escuro para garantir legibilidade.' };
  }
  return { ok: true };
}
```

If contrast fails:
- Backend: return `422 BRAND_COLOR_CONTRAST_INSUFFICIENT` with `details.field` and `details.minimumLuminanceDifference`.
- Frontend: show inline warning **before** the user submits, with a suggested darker shade.

Additional checks:
- `primary` and `accent` shouldn't be visually indistinguishable: compute ΔE2000 between them; require ≥ 10. If they're too close, warn.
- `primary` ≠ `danger` red and ≠ `warning` orange to a confusing degree (loose check; warn rather than block).

---

## Runtime injection (Next.js)

The web app reads `organization.settings.theme` on each request (server) and injects a small `<style>` block into the document `<head>`, **before** any client CSS paints.

### How

```tsx
// apps/web/src/app/layout.tsx
import { headers } from 'next/headers';
import { getOrganizationTheme } from '@/lib/theme/server';
import { renderThemeStyle } from '@/lib/theme/render';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await getOrganizationTheme();    // resolves from cookie / subdomain / null
  const themeCss = renderThemeStyle(theme);      // returns a <style> string, escaped

  return (
    <html lang="pt-BR">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        {theme?.faviconUrl && <link rel="icon" href={theme.faviconUrl} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

`renderThemeStyle(theme)` produces:

```css
:root {
  --brand-primary: #15803d;
  --brand-primary-strong: #0b3f1f;
  --brand-primary-soft: #eaf5ee;
  --brand-primary-on: #ffffff;
  --brand-accent: #dc2626;
  --brand-accent-strong: #6b1313;
  --brand-accent-soft: #fbe6e6;
  --brand-accent-on: #ffffff;
}
```

The values are escaped (only `#` + 6 hex chars allowed by regex) — no XSS surface despite `dangerouslySetInnerHTML`.

### Tailwind consumes the variables

`apps/web/tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

export default {
  // ...
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--brand-primary)',
          strong:  'var(--brand-primary-strong)',
          soft:    'var(--brand-primary-soft)',
          on:      'var(--brand-primary-on)',
        },
        accent: {
          DEFAULT: 'var(--brand-accent)',
          strong:  'var(--brand-accent-strong)',
          soft:    'var(--brand-accent-soft)',
          on:      'var(--brand-accent-on)',
        },
        // Fixed semantic + neutral tokens defined here too…
      },
    },
  },
} satisfies Config;
```

Then components just write:

```tsx
<button className="bg-primary text-primary-on hover:bg-primary-strong">Salvar</button>
<span className="bg-primary-soft text-primary-strong">Ativo</span>
```

**No rebuild required when a tenant changes their colors** — only the injected `<style>` block changes per request.

---

## Theme resolution — how the server picks a theme

`getOrganizationTheme()` precedence:

1. **Authenticated user** → use `req.organization.settings.theme`.
2. **Subdomain** (`escola-x.app.school-platform.app`) → look up org by `slug`.
3. **Query param** (`?org=<slug>` on the login URL) → look up.
4. **Cookie** (`org_slug=<slug>` set after first visit) → look up.
5. **Default** → platform defaults.

Resolution is cached per-request via `React.cache`. No DB hits on subsequent calls in the same render tree.

---

## Logo and favicon

### Upload

- Admin uploads via **Settings → Brand**.
- Frontend posts `multipart/form-data` to `POST /api/v1/organizations/:id/brand-assets`.
- Backend:
  - Validates MIME (`image/png`, `image/svg+xml`, `image/webp`).
  - Validates size (≤ 2 MB).
  - For raster: validates minimum dimensions (≥ 256×256).
  - For SVG: sanitizes with `dompurify` (server-side variant) to strip `<script>`, event handlers, external refs.
  - Uploads to R2 under `orgs/<orgId>/brand/<uuid>.<ext>`.
  - Returns signed CDN URL (long-lived for assets — these are public per their nature; we still serve via CDN for cache + bandwidth).
  - Updates `organizations.settings.theme.logoUrl`.

### Rendering

```tsx
function BrandLogo({ size = 32 }: { size?: number }) {
  const { theme } = useTheme();
  if (theme.logoUrl) {
    return <img src={theme.logoUrl} alt={theme.brandName} height={size} className="object-contain" />;
  }
  return <BrandLetterFallback letter={theme.brandName[0]} size={size} />;
}
```

`BrandLetterFallback` renders a rounded square filled with `--brand-primary` and the first letter in `--brand-primary-on` — the visual we used in the mockup.

### Favicon

- If `faviconUrl` exists, use it.
- Else if `logoSmallUrl` exists, generate at request-time via a Next.js icon route handler that resizes to 32×32.
- Else generate an SVG favicon with the letter fallback. Cached.

---

## Application surfaces

### Login

Three URL forms supported:
- `app.school-platform.app/login` — generic, no theme until cookie is read.
- `app.school-platform.app/login?org=<slug>` — themed via query param, server-resolved.
- `<slug>.app.school-platform.app/login` — themed via subdomain. The default approach we'll promote in user-facing comms.

On login, set the `org_slug` cookie so subsequent visits to the bare domain auto-theme.

### Sidebar / header

Theme applied via the CSS variables. Logo at top-left of sidebar. Brand name in `text-display-md` next to logo. Active nav item uses `bg-primary-soft text-primary-strong`.

### Buttons & CTAs

Primary CTA = `bg-primary text-primary-on`. Hover = `bg-primary-strong`. Active = scale 0.98 + slightly darker. Tenant gets all this for free by using the `primary` Tailwind token.

### Status badges

Status badges use **semantic** soft + strong tokens, **not** brand colors. "Ativo" is always green. The brand color does not override semantic status.

### Avatars

Default avatar background = `bg-accent-soft`. Initials = `text-accent-strong`. This makes the accent color visible all over the roster pages.

### Transactional emails

Email templates live in `apps/api/src/modules/communications/infrastructure/templates/` and are rendered with React Email (`@react-email/components`).

Template inputs include the resolved theme. Inline styles only (email clients).

```tsx
<Section style={{ backgroundColor: theme.primary, padding: 24 }}>
  <Img src={theme.logoUrl ?? defaultLogo} alt={theme.brandName} height={32} />
</Section>
<Section style={{ padding: 24 }}>
  <Text>Olá, {recipientName}.</Text>
  {/* … */}
  <Button href={ctaUrl} style={{ backgroundColor: theme.primary, color: theme.primaryOn }}>
    {ctaLabel}
  </Button>
</Section>
<Section style={{ padding: 16, fontSize: 12, color: '#71717a' }}>
  {theme.brandName} · Powered by SchoolHub
</Section>
```

### PDFs

Generated server-side with `react-pdf` (`@react-pdf/renderer`) or `Puppeteer` (TBD per use case). Receipts and enrollment certificates use a header bar in `theme.primary` with the logo, body in the fixed text color, and a small footer with "Powered by SchoolHub" + tenant name.

### WhatsApp

Plain text. Prepend `*[BrandName]*` (WhatsApp bold) to every outbound message. No richer theming available without WhatsApp Business Platform — out of scope for MVP.

---

## Validation rules (single source of truth)

When the admin saves theme settings, **server is authoritative** (the same Zod schema validates frontend and backend). The full check:

1. Schema parses.
2. `brandPrimary` and `brandAccent` are valid hex.
3. Each color passes `contrastRatio(color, '#ffffff') ≥ 4.5`.
4. ΔE2000 between primary and accent ≥ 10 (warning, not blocker — flag in UI).
5. Logo URL belongs to this tenant's R2 prefix (no hot-linking).
6. Logo MIME and size verified before persistence.
7. On success, write to `organizations.settings.theme`, write audit log entry `organization.theme_updated`.

---

## Caching

| Surface | Strategy |
|---------|----------|
| Server render | `React.cache` per request — one DB read |
| Browser | Theme is part of HTML — fresh per navigation |
| Logo asset | Cached on Cloudflare edge with long max-age; cache-busted by filename UUID |
| Favicon | Cached with 1-day max-age (rarely changes) |

When a tenant updates their theme:
- New page loads pick it up immediately (no rebuild).
- Open tabs: a small SWR poll on `/auth/me` refreshes user + theme every 5 min. After save, we also broadcast via a lightweight `BroadcastChannel('theme')` to other tabs of the same browser.

---

## Edge cases & gotchas

- **Tenant picks the same color for primary and accent** → frontend warns "Use cores diferentes para destacar ações secundárias", but allowed. Derivations still work.
- **Tenant uploads an enormous logo** → server downscales to max 1024px on the longest side using `sharp`, preserving aspect ratio.
- **SVG logo with embedded fonts** → kept as-is after sanitization. We don't try to render SVG fonts in emails — fallback to PNG for those surfaces (generated at upload time).
- **Color is technically valid hex but very dark** (e.g. `#000000`) → contrast vs white passes; we still warn that buttons may look "harsh" and suggest a hint of color.
- **Tenant deletes the logo** → falls back to the letter avatar across all surfaces.

---

## Post-MVP roadmap

These are intentionally **out of MVP** but designed-for:

- **Custom domain** (`app.escolinha.com.br`)
  - Requires: Cloudflare for SaaS or equivalent multi-tenant TLS, CNAME verification, DNS-01 challenge automation.
  - Adds a `organizations.custom_domain` column + a `verified_at` timestamp.
- **Email with tenant domain** (`contato@escolinha.com.br` as From)
  - Requires: DKIM/SPF setup per tenant via Resend's domain verification API.
  - For MVP: messages come from `noreply@school-platform.app` with `Reply-To: contato@escolinha.com.br`.
- **Hide "Powered by SchoolHub"** on a paid tier.
- **Dark mode** as a tenant-level toggle (deriving dark equivalents from primary/accent is straightforward in OKLCH).
- **Custom font upload** per tenant (capped to a small whitelist of vetted hosting strategies).
- **Per-school branding** (currently brand is per-Organization; future could support per-School overrides).

---

## Testing

- Unit tests for `deriveTones`, `computeBrandTokens`, `contrastRatio`, `validateBrandColor` — all pure functions.
- Snapshot test for `renderThemeStyle` output across a few real-world brand colors.
- Integration test: save → reload → verify CSS variables present in HTML, classes resolve correctly.
- Visual regression for at least 3 themes (default + a dark brand + a vivid brand) via Playwright screenshot of dashboard.
- Email rendering test: render the invoice template with two themes, snapshot HTML.

---

## References

- `02-DATA_MODEL.md` — schema location
- `06-FRONTEND_GUIDE.md` — visual rules
- `06-FRONTEND_GUIDE.md` — implementation patterns
- `10-DECISIONS.md#0007--white-label-via-css-variables-with-tenant-derivation` — decision record
- culori — <https://culorijs.org>
- React Email — <https://react.email>
- OKLCH primer — <https://oklch.com>
