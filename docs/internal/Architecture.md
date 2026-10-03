# Architecture — ThaibaHive

## High-Level Flow

```
┌─────────────────────────────────────────────────┐
│                   BROWSER                        │
│  Next.js 16 App (React 19, App Router)          │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │ AuthCtx  │ │ QueryPvr │ │ ThemeCtx         │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│         │              │              │          │
│  ┌──────┴──────────────┴──────────────┴───────┐  │
│  │         Shell Layout (Header/Sidebar)      │  │
│  └──────────────────┬────────────────────────┘  │
│                     │                            │
│  ┌──────────────────┴────────────────────────┐  │
│  │           Page Components                  │  │
│  │  (Dashboard, Attendance, Tasks, etc.)      │  │
│  └──────────────────┬────────────────────────┘  │
│                     │                            │
│  ┌──────────────────┴────────────────────────┐  │
│  │         API Client (fetch wrapper)         │  │
│  └──────────────────┬────────────────────────┘  │
└─────────────────────┼───────────────────────────┘
                      │ HTTP (same-origin)
┌─────────────────────┼───────────────────────────┐
│                     ▼                            │
│  ┌──────────────────────────────────────────┐   │
│  │      Next.js API Routes (28 modules)     │   │
│  │  /api/auth/*  /api/staff  /api/tasks/*   │   │
│  │  /api/attendance/*  /api/leaves/*  ...    │   │
│  └──────────────────┬───────────────────────┘   │
│                     │                            │
│  ┌──────────────────┴───────────────────────┐   │
│  │     Auth Guard (JWT verify + RBAC)       │   │
│  └──────────────────┬───────────────────────┘   │
│                     │                            │
│  ┌──────────────────┴───────────────────────┐   │
│  │      Drizzle ORM (SQLite/PostgreSQL)     │   │
│  └──────────────────┬───────────────────────┘   │
│                     │                            │
│  ┌──────────────────┴───────────────────────┐   │
│  │         Database (SQLite dev / PG prod)  │   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.2.10 | App Router, SSR, API routes |
| UI Library | React | 19.2.4 | Component rendering |
| Language | TypeScript | ^5 | Type safety |
| Styling | Tailwind CSS | 3.4.19 | Utility-first CSS |
| Components | Radix UI | latest | Accessible primitives |
| State | Zustand | 5.0.14 | Client state management |
| Server State | TanStack Query | 5.101.2 | Data fetching, caching |
| Forms | React Hook Form + Zod | 7.80 / 4.4 | Form handling + validation |
| Database | SQLite (dev) / PostgreSQL (prod) | — | Data persistence |
| ORM | Drizzle ORM | 0.45.2 | Type-safe queries |
| Auth | jose (JWT) | 6.2.3 | Session tokens |
| Icons | Lucide React | 1.23.0 | Icon library |
| Animation | Framer Motion | 12.42.2 | Page transitions |
| Notifications | Sonner | 2.0.7 | Toast notifications |
| Drag & Drop | dnd-kit | 6.3.1 | Kanban board |
| Testing | Jest + Playwright | 30.4 / 1.61 | Unit + E2E |
| Package Manager | pnpm | — | Fast, disk-efficient |

## Folder Structure

```
D:\ThaibaHive\
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # Public routes (login, signup)
│   │   ├── (shell)/            # Authenticated shell layout
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── attendance/     # Attendance module
│   │   │   ├── tasks/          # Task management
│   │   │   ├── leaves/         # Leave management
│   │   │   ├── announcements/  # Announcements
│   │   │   ├── events/         # Events calendar
│   │   │   ├── staff/          # Staff directory
│   │   │   ├── help-desk/      # IT support tickets
│   │   │   ├── bookings/       # Resource bookings
│   │   │   ├── assets/         # Asset management
│   │   │   ├── reports/        # Daily reports
│   │   │   ├── approvals/      # Approval center
│   │   │   ├── polls/          # Polls & surveys
│   │   │   ├── circulars/      # Document repository
│   │   │   ├── expenses/       # Expense claims
│   │   │   ├── purchases/      # Purchase requests
│   │   │   ├── accounts/       # Financial overview
│   │   │   ├── vehicles/       # Vehicle management
│   │   │   ├── canteen/        # Meal management
│   │   │   ├── visitors/       # Visitor management
│   │   │   ├── grievances/     # Feedback/grievances
│   │   │   ├── recognition/    # Staff recognition
│   │   │   ├── availability/   # Staff availability
│   │   │   ├── timeline/       # Activity timeline
│   │   │   ├── settings/       # User settings
│   │   │   └── admin/          # Admin panel
│   │   │       ├── departments/
│   │   │       ├── sub-departments/
│   │   │       ├── institutions/
│   │   │       ├── shifts/
│   │   │       └── checklists/
│   │   ├── api/                # API routes (28 modules)
│   │   │   ├── auth/           # login, signup, logout, me
│   │   │   ├── staff/
│   │   │   ├── attendance/
│   │   │   ├── tasks/
│   │   │   ├── leaves/
│   │   │   ├── announcements/
│   │   │   ├── events/
│   │   │   ├── help-desk/
│   │   │   ├── bookings/
│   │   │   ├── assets/
│   │   │   ├── reports/
│   │   │   ├── approvals/
│   │   │   ├── polls/
│   │   │   ├── circulars/
│   │   │   ├── expense-claims/
│   │   │   ├── purchases/
│   │   │   ├── accounts/
│   │   │   ├── vehicles/
│   │   │   ├── canteen/
│   │   │   ├── visitors/
│   │   │   ├── grievances/
│   │   │   ├── recognition/
│   │   │   ├── notifications/
│   │   │   ├── availability/
│   │   │   ├── checklists/
│   │   │   ├── export/
│   │   │   ├── admin/
│   │   │   └── telemetry/
│   │   ├── auth/               # Login/signup pages
│   │   ├── layout.tsx          # Root layout (Geist font, Providers)
│   │   └── globals.css         # Design tokens, animations
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── layout/             # Shell, sidebar, bottom nav, command palette
│   │   ├── attendance/         # Attendance-specific components
│   │   ├── tasks/              # Task-specific components
│   │   ├── leaves/             # Leave-specific components
│   │   ├── announcements/      # Announcement components
│   │   ├── events/             # Event components
│   │   ├── staff/              # Staff directory components
│   │   ├── help-desk/          # Help desk components
│   │   ├── bookings/           # Booking components
│   │   ├── reports/            # Report components
│   │   ├── polls/              # Poll components
│   │   ├── admin/              # Admin panel components
│   │   └── auth/               # Auth form components
│   ├── config/
│   │   └── navigation.ts       # Navigation groups and items
│   ├── contexts/
│   │   ├── AuthContext.tsx      # Auth state provider
│   │   └── ThemeContext.tsx     # Dark/light theme provider
│   ├── db/
│   │   ├── index.ts            # Database connection
│   │   ├── schema.ts           # Drizzle schema (30+ tables)
│   │   ├── seed.ts             # Seed script
│   │   └── seeds/              # Seed data files
│   ├── hooks/
│   │   └── use-debounce.ts     # Debounce hook
│   ├── lib/
│   │   ├── api/                # API utilities (auth-guard, pick)
│   │   ├── auth/               # Auth system (roles, session, JWT)
│   │   ├── diagnostics/        # Telemetry and logging
│   │   ├── offline/            # Offline utilities
│   │   ├── supabase/           # Supabase client (unused)
│   │   ├── validation/         # Zod schemas
│   │   └── utils.ts            # cn() and helpers
│   ├── providers/
│   │   └── query-provider.tsx  # TanStack Query provider
│   ├── stores/                 # Zustand stores (empty)
│   ├── services/               # Service layer (empty)
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── drizzle/                    # Drizzle migrations
├── e2e/                        # Playwright E2E tests
├── public/                     # Static assets
├── scripts/                    # Build/utility scripts
├── dev.db                      # SQLite dev database
├── drizzle.config.ts           # Drizzle config (SQLite dev, PG prod)
├── tailwind.config.ts          # Tailwind config
├── tsconfig.json               # TypeScript config
├── next.config.ts              # Next.js config
├── jest.config.js              # Jest config
├── PRODUCT.md                  # Product requirements
├── PRD.md                      # This document
├── Architecture.md             # This document
├── Rulers.md                   # Code conventions
├── Phasis.md                   # Phase breakdown
├── Design.md                   # Design system
├── Memory.md                   # Build status tracker
├── MASTER_BLUEPRINT.md         # Unified coordinator
├── Security.md                 # RBAC & RLS matrix
└── Verification.md             # E2E test scenarios
```

## Data Flow Patterns

### 1. Client → API → Database
```
Browser → fetch("/api/xxx") → requireAuth() → Drizzle query → SQLite/PG → JSON response
```

### 2. Authentication Flow
```
Login form → POST /api/auth/login → bcrypt verify → createSession(jwt) → httpOnly cookie → redirect /
```

### 3. Page Data Loading
```
Page mount → useEffect → fetch multiple API endpoints → Promise.all → setState → render
```

### 4. Form Submission
```
React Hook Form → Zod validation → fetch POST/PUT → API route → Drizzle insert/update → toast success → router.refresh()
```

## Database Strategy

- **Development**: SQLite (`dev.db`) — zero config, fast iteration
- **Production**: PostgreSQL (Supabase or self-hosted) — RLS, concurrent access, JSON support
- **Drizzle handles both** via `dialect` switch in `drizzle.config.ts`
- **Migrations**: `drizzle-kit generate` → `drizzle-kit migrate`

## Key Architectural Decisions

1. **App Router over Pages Router** — Server Components, nested layouts, streaming
2. **Client Components in Shell** — Auth context, sidebar, and navigation are client-rendered
3. **API Routes over external backend** — Co-located, same TypeScript types, simpler deployment
4. **JWT over session DB** — Stateless auth, no session store needed
5. **Drizzle over Prisma** — Lighter, SQL-first, better SQLite support
6. **Zustand over Redux** — Simpler API, less boilerplate for client state
7. **Radix over Headless UI** — Better accessibility, more composable primitives
