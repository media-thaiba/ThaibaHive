# STATE_MANAGEMENT.md — Application State Architecture

> **Specification Tier**: Implementation Masterplan (AIOS 6.0)  
> **Source of Truth**: `.ai/implementation/STATE_MANAGEMENT.md`

---

## 1. State Classification Matrix

| State Type | Primary Technology | Location / Scope | Usage |
| :--- | :--- | :--- | :--- |
| **Auth Identity** | React Context (`AuthContext`) | `src/contexts/AuthContext.tsx` | Global user identity, login/logout |
| **Theme State** | React Context (`ThemeContext`) | `src/contexts/ThemeContext.tsx` | Dark / Light theme toggle |
| **Server Data Cache**| TanStack Query v5 | `src/providers/query-provider.tsx` | API data fetching, caching, background refetch |
| **Transient UI State**| React `useState` / `useReducer` | Component-local | Form field inputs, modal open state, tab index |
| **Mobile Offline Cache**| Hive (`hive_flutter`) | Flutter App Storage | Local offline DB cache for widgets |

---

# ROUTING_STRATEGY.md — Next.js App Router Architecture

## 1. Route Architecture & Namespaces

```
src/app/
├── (public)/                 # Public unauthenticated routes (/auth/login, /auth/signup)
├── (shell)/                  # Authenticated App Shell & Workspaces
│   ├── page.tsx              # Home / Dashboard router
│   ├── workspace/            # Role-specific workspaces (/workspace/principal, /workspace/teacher)
│   ├── academic/             # Academic screens (/academic/students, /academic/classes)
│   ├── (erp)/                # ERP Module Group
│   │   ├── payroll/          # Payroll module
│   │   ├── fee-management/   # Fee collection module
│   │   ├── hostel/           # Hostel module
│   │   └── transport/        # Transit module
│   └── [feature]/            # Other feature pages (tasks, leaves, expenses, assets)
└── api/                      # Co-located API Route Handlers (/api/*)
```

---

# AUTH_FLOW.md — Authentication & Session Lifecycle

## 1. Complete Session Lifecycle

```
[ User Credentials ] ──► POST /api/auth/login ──► Verify Bcrypt & DB Active State
                                                            │
[ httpOnly Cookie ] ◄── Sign HS256 JWT via jose ◄───────────┘
         │
         ▼
API Request ──► requireAuth() Guard ──► verifySession() ──► Re-query DB tokenVersion
                                                                    │
                                            [ 401 Unauthorized ] ◄──┴── Valid? ──► Execute Handler
```

---

# FILE_STORAGE.md — Supabase Storage & Proxy Architecture

* **Upload Path**: Client ──► `POST /api/upload` ──► `uploadToSupabase()` REST stream to Supabase Storage.
* **Download Streaming**: Client ──► `GET /api/upload/files/[...path]` ──► `downloadFromSupabase()` with Range request support for streaming media.

---

# BACKGROUND_PROCESSING.md — Background Job & Queue Specification

* **Scheduled Jobs**: Executed via background timer tools (`schedule`) or cron schedules.
* **Tasks Processed**: Daily midnight fee checks, 1st-of-month invoicing, presence disconnect debouncing, dead FCM token pruning.
