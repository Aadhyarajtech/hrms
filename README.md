# Aadhyaraj HRMS

An enterprise HR platform built for **Aadhyaraj Technologies** — a calm, connected workspace for employee
lifecycle management, attendance, leave, recruitment, performance, and payroll.

This is a real, fully working full-stack application: a React/TypeScript frontend talking to a genuine
Node.js/Express API backed by a relational SQLite database, with JWT auth, role-based access control,
and a 165-person organization of realistic seed data so every screen is populated from the moment you log in.

---

## 1. What's actually included

This was built as a deep, working core rather than a shallow pass at every conceivable HR feature. Everything
listed below is **fully functional** — real database writes, real validation, real permission checks. Nothing
is mocked or stubbed.

| Module | What you can do |
|---|---|
| **Auth & RBAC** | JWT login, 6 distinct roles (Super Admin, HR Admin, Manager, Recruiter, Finance, Employee), change password |
| **Dashboard** | Live KPIs, headcount/attendance/attrition trends, gender diversity, payroll cost trend, recruitment funnel, recent activity, birthdays/anniversaries/holidays |
| **Employees** | Searchable/filterable directory, 360° profile (personal info, attendance, leave, performance, payroll, documents, assets), add employee, edit profile, role-aware field permissions |
| **Org Chart** | Full interactive, collapsible reporting tree built from real manager relationships |
| **Attendance** | One-click check-in/out with computed work hours, personal history, team view by date, regularization requests |
| **Leave** | Leave types & balances, apply/cancel, manager approval queue, org-wide leave calendar |
| **Recruitment** | Job postings, candidate pipeline (Kanban-style stages), star ratings, interview scheduling & feedback |
| **Performance** | Review cycles, self-review → manager-review workflow, goal tracking with progress sliders |
| **Payroll** | Configurable salary structures, payroll run processing (with automatic unpaid-leave deductions), digital payslips, printable payslip view |
| **Announcements** | Company-wide announcements with pinning |
| **Documents & Assets** | Real file upload (PDF/Word/image, 8MB limit) to employee profiles, asset assignment tracking |
| **Settings** | Departments, designations, holiday calendar, performance cycles (admin only) |

### Deliberately out of scope for this pass
A handful of things a real enterprise rollout would eventually want, but which would have meant shipping
half-built placeholders instead of a deep, honest core: drag-and-drop on the recruitment board (stage changes
use a dropdown instead), email notifications (in-app only), a full payslip PDF generator (the payslip view is
print-to-PDF via the browser), and a true multi-tenant/SSO layer. The architecture has room for all of these —
see "Extending this further" below.

---

## 2. Tech stack & why

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Fast dev loop, broad ecosystem compatibility |
| Styling | Tailwind CSS v3 | Full design-token control without fighting a component library |
| Data fetching | TanStack Query | Caching, invalidation, and loading states without hand-rolled state |
| Charts | Recharts | Clean, composable charts that match the design system |
| Forms | React Hook Form + Zod | Type-safe validation shared in spirit with the backend |
| Backend | Node.js + Express + TypeScript | Simple, explicit, easy for any team to pick up |
| Database | SQLite via Node's built-in `node:sqlite` | **Zero native dependencies** — no Prisma engine downloads, no `node-gyp` build step, no Postgres install. Clone, `npm install`, run. Requires **Node.js 22.5+** |
| Auth | JWT + bcrypt | Stateless, standard, easy to reason about |

> **Scaling beyond SQLite:** the schema in `backend/src/db/schema.sql` is plain, normalized SQL with explicit
> foreign keys — it maps cleanly onto Postgres or MySQL. To move to Postgres for a real multi-instance
> deployment, swap `src/db/connection.ts` for a `pg` pool and adjust the handful of SQLite-specific functions
> (`date('now', ...)`, `strftime`) in the dashboard/attendance repositories to their Postgres equivalents.

---

## 3. Quick start

**Requirements:** Node.js **22.5 or later** (for `node:sqlite`). Check with `node -v`.

The database ships pre-seeded with a realistic 165-person organization, so you can skip straight to running it.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env        # defaults work out of the box for local dev
npm run dev                  # starts the API on http://localhost:4000

# 2. Frontend (in a second terminal)
cd frontend
npm install
npm run dev                  # starts the app on http://localhost:5173
```

Open **http://localhost:5173** — the Vite dev server proxies `/api` to the backend automatically, so there's
nothing else to configure.

### Demo accounts
Every seeded employee can log in with their `@aadhyaraj.com` email and the password **`Welcome@123`**. The
login screen has one-click buttons to autofill these:

| Role | Email |
|---|---|
| Super Admin | `admin@aadhyaraj.com` |
| HR Admin | `hr.admin@aadhyaraj.com` |
| Manager | `manager.demo@aadhyaraj.com` |
| Recruiter | `recruiter.demo@aadhyaraj.com` |
| Finance | `finance.demo@aadhyaraj.com` |
| Employee | `employee.demo@aadhyaraj.com` |

To reset all data back to this pristine demo state at any point, run `npm run seed` in `backend/` — it
regenerates the entire organization from scratch (deterministically random, so headcounts will vary slightly
between runs but the structure and demo accounts stay the same).

### Building for production
```bash
cd backend && npm run build && npm start
cd frontend && npm run build   # outputs static files to frontend/dist — serve with any static host/nginx
```
For a production deployment, set `frontend`'s `VITE_API_URL` to your API's public URL at build time, and
set a strong, random `JWT_SECRET` in `backend/.env`.

---

## 4. Project structure

```
aadhyaraj-hrms/
├── backend/
│   ├── src/
│   │   ├── config/        # env loading
│   │   ├── db/            # connection, schema.sql, seed script
│   │   ├── middleware/     # auth, RBAC, validation, error handling, uploads
│   │   ├── modules/        # one folder per domain: auth, employees, leave, payroll, ...
│   │   │   └── <name>/<name>.repository.ts + <name>.routes.ts
│   │   ├── utils/
│   │   ├── app.ts          # Express app wiring
│   │   └── index.ts        # entrypoint
│   └── prisma/ → not used (see note below)
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ui/         # Button, Card, Badge, Modal, ProgressRing, etc.
    │   │   └── layout/     # Sidebar, Topbar, AppShell, brand assets
    │   ├── context/        # Auth & Toast providers
    │   ├── lib/             # axios client, typed API endpoints, formatters
    │   ├── pages/            # one file/folder per route
    │   └── types/
    └── ...
```

Each backend module follows the same shape: a `*.repository.ts` with parameterized SQL queries, and a
`*.routes.ts` with Zod validation + RBAC middleware + the Express router. This is intentionally explicit
rather than hidden behind an ORM's generated client, so any engineer can read a route top-to-bottom and see
exactly what it does.

> **Note on Prisma:** the original plan used Prisma. It was swapped for raw SQL over `node:sqlite` once
> testing showed Prisma's engine binaries require a network fetch from `binaries.prisma.sh`, which isn't
> guaranteed to be reachable in every environment. The current approach has zero install-time network
> dependencies beyond the npm registry itself.

---

## 5. Design system

- **Typography:** Fraunces (display/headings) paired with Plus Jakarta Sans (UI/body) — a touch of editorial
  warmth without sacrificing legibility in dense data screens.
- **Color:** a warm off-white canvas, indigo-violet primary (`#5B4FE5`), and a muted gold accent reserved for
  premium/highlight moments (ratings, pinned announcements).
- **Signature motif:** the "Aura Ring" — a circular progress ring used consistently across KPI cards, leave
  balances, and attendance rates instead of generic bar/donut charts everywhere.
- All colors, spacing, and shadows are defined as design tokens in `frontend/tailwind.config.js`.

---

## 6. Security notes

- Passwords are hashed with bcrypt; JWTs are signed with a secret you control via `.env`.
- Every route is protected by `authenticate` middleware; mutating routes are further gated by role-based
  `requireRole(...)` checks.
- Employees can only edit their own contact details — structural fields (department, designation, status)
  require an HR Admin or Super Admin.
- File uploads are restricted by MIME type and size (8MB) and stored outside the web root with randomized
  filenames.
- Rate limiting is applied globally and more tightly on the login endpoint.
- The `.env` shipped here uses a placeholder `JWT_SECRET` for local development convenience — **generate a
  real secret before deploying anywhere reachable**.

---

## 7. Extending this further

The data model already includes `audit_logs`, full document/asset tracking, and a designation-level hierarchy
that supports deeper org modeling — these are wired into the schema and partially into the API, ready for a
full audit-trail UI or asset-lifecycle workflows to be layered on. If you want this pushed further — a true
drag-and-drop recruitment board, email notifications, a generated payslip PDF, multi-tenant support — that's
a natural next phase rather than a limitation of the architecture.
