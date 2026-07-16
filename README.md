# ThaibaHive

The unified staff management platform for Thaiba Garden Group of Institutions (23+ campuses, 800–1,000 staff).

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your secrets (AUTH_JWT_SECRET, etc.)

# Initialize database
pnpm db:push

# Seed sample data (optional)
pnpm db:seed

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Radix UI, Tailwind CSS |
| State | Zustand, TanStack Query |
| Forms | React Hook Form + Zod |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Drizzle ORM |
| Auth | JWT (jose) |
| Testing | Jest + Playwright |

## Project Structure

```
src/
├── app/
│   ├── (public)/              # Login, signup
│   ├── (shell)/               # Authenticated pages
│   │   ├── announcements/     # Announcements & targeting
│   │   ├── attendance/        # Check-in/out, reports
│   │   ├── tasks/             # Task management, Kanban
│   │   ├── leaves/            # Leave requests & approvals
│   │   ├── staff/             # Staff directory
│   │   └── ...                # Other modules
│   └── api/                   # API routes
│       ├── announcements/     # Announcements CRUD
│       ├── attendance/        # Attendance tracking
│       ├── auth/              # Login, signup, permissions
│       ├── tasks/             # Task CRUD
│       └── ...                # Other API modules
├── components/ui/             # Reusable UI components
├── lib/
│   ├── auth/                  # Auth utilities (re-exports from @thaiba/auth)
│   ├── validation/            # Zod schemas
│   ├── api/                   # Auth guard, pick utility
│   └── utils.ts               # cn, formatDate, timeAgo, ensureArray
├── db/
│   ├── schema.ts              # Drizzle schema
│   └── seed.ts                # Database seeder
└── types/                     # TypeScript types

packages/
├── auth/                      # Auth package (JWT, roles, permissions)
└── db/                        # Database package (schema, connection)
```

## Scripts

```bash
pnpm dev          # Start dev server
pnpm build        # Production build
pnpm typecheck    # TypeScript check
pnpm lint         # ESLint
pnpm test         # Unit tests
pnpm test:e2e     # E2E tests (Playwright)

pnpm db:generate  # Generate Drizzle migrations
pnpm db:push      # Push schema to database
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed database
```

## Environment Variables

```env
AUTH_JWT_SECRET=your-secret-key    # Required in production
DATABASE_URL=file:./dev.db         # SQLite file path
COOKIE_DOMAIN=localhost            # Optional
```

## Key Patterns

### Authentication & WebView Auth Handoff
- **Web Session**: JWT stored in HTTP-only cookie (`thaibahive_session`)
- **Session Payload**: `{ staffId, email, role, employeeId, name, tokenVersion }`
- **Auth Guard**: API routes are wrapped in `requireAuth(handler, "permission:string")`
- **Mobile WebView Auth Handoff**:
  1. The mobile app requests a secure, single-use handoff nonce via `POST /auth/mobile-handoff/nonce` from the mobile API.
  2. The mobile app posts to the web API `POST /api/auth/mobile-handoff?redirect={targetPath}` with the nonce as a Bearer token.
  3. The web server validates the nonce, marks the unique JTI token identifier as used in the database (preventing replay attacks), and sets the secure `thaibahive_session` cookie for the WebView.
  4. The web server redirects the WebView to the target authenticated path.

### Permissions (RBAC)
- `super_admin` — Full access (`*`)
- `admin` — Most management operations
- `principal` — Institution-level management
- `hod` — Department-level management
- `staff` — Read-only + own data operations

### API Routes
- All routes use `requireAuth()` wrapper
- GET returns list, POST creates, PATCH/PUT updates, DELETE removes
- Validation via Zod schemas in `src/lib/validation/schemas.ts`
- Error responses: `{ error: string }` with appropriate HTTP status

### UI Components
- All from `src/components/ui/` (Radix UI + Tailwind)
- Use `<Input>`, `<Select>`, `<Button>`, `<Badge>`, `<Dialog>`, `<Card>`, `<Alert>`, `<EmptyState>`, `<Skeleton>`
- Avoid raw HTML `<input>/<select>/<button>` — use UI components

### State Management
- `useState` for local component state
- TanStack Query for server state (when adopted)
- Zustand for global client state (when adopted)

### Error Handling
- Always add `.catch()` to `useEffect` fetch calls
- Show user-facing errors via `<Alert>` or `toast`
- Never leave loading spinners stuck on API failure

## Database

### Roles
`super_admin` | `admin` | `principal` | `hod` | `staff`

### Core Tables
- `staff` — User accounts
- `staffDepartments` — Staff ↔ Department (many-to-many)
- `staffInstitutions` — Staff ↔ Institution (many-to-many)
- `departments`, `institutions` — Organization structure
- `attendanceLogs` — Daily check-in/out records
- `leaveRequests`, `leaveBalances` — Leave management
- `tasks`, `taskComments` — Task tracking
- `announcements`, `announcementReads` — Targeted announcements with read receipts
- `events`, `eventRsvps` — Event management
- `circulars` — Official documents
- `polls`, `pollResponses` — Surveys
- `helpDeskTickets`, `helpDeskComments` — IT support
- `notifications` — System notifications

## Contributing

1. Create a feature branch
2. Make changes following existing patterns
3. Run `pnpm typecheck` and `pnpm lint`
4. Test manually in the browser
5. Submit a PR
