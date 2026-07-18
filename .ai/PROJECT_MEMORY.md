# ThaibaHive Project Memory

This is the permanent brain of the ThaibaHive ecosystem.

## 1. Vision & Strategy
ThaibaHive is an institutional ecosystem built for scaling administrative operations, learning management, and media production. It features:
- A high-performance web dashboard (Next.js 16 + React 19).
- A companion mobile application (Flutter 3.x with Riverpod & GoRouter).
- A unified data layout supporting local-first caching, offline sync capabilities, and seamless role-based permission controls.

## 2. Platform Tracks
1. **Track A (Core Web)**: Dashboard interface, REST API services, administration endpoints, leave & shift planning, and system audits.
2. **Track B (Mobile Platform)**: Flutter companion application, biometrics, secure storage, and Android Glance home screen widgets.
3. **Track C (Media Platform)**: Asset ingestion pipeline, metadata extractors (EXIF/XMP), FFmpeg transcoding, and NAS server storage integration.

## 3. Directory Conventions
```
d:/ThaibaHive/
├── src/
│   ├── app/                 # Next.js App Router (pages and API routes)
│   ├── components/ui/       # shadcn/ui components (radix wrappers)
│   ├── contexts/            # React Auth/Theme context providers
│   ├── db/                  # Drizzle index connection & seed scripts
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Auth, api guards, validation, diagnostics
│   ├── providers/           # TanStack Query & other app providers
│   └── types/               # TypeScript index typings
├── packages/
│   ├── auth/                # Monorepo JWT auth validation (roles, jose)
│   └── db/                  # Shared database schema declarations
├── thaibahive_mobile_app/   # Flutter application workspace
└── drizzle/                 # Drizzle migration files
```

## 4. Role & Permissions Matrix
ThaibaHive operates a 5-tier role-based access control system (RBAC):
- **super_admin**: `*` (Full permissions override).
- **admin**: General institution and department management operations.
- **principal**: Institution-level actions (e.g. shifts setup, departmental reviews).
- **hod**: Department-level operations (approvals, tasks assignment).
- **staff**: Personal details CRUD, directory reading, and task progression.

All API routes wrapper verify permission rules using the `requireAuth(handler, "permission:string")` middleware.
Timestamps are stored as standard ISO 8601 string text type in the database.
ID columns are standard UUID string text type.
