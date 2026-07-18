# System Architecture — ThaibaHive

This document details the high-level architecture, module flow patterns, and integration layers.

## High-Level Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                           BROWSER                           │
│  Next.js 16 App Router (React 19, Tailwind 3.4)             │
│  ┌─────────────────────────┐     ┌───────────────────────┐  │
│  │ Auth Context (jose JWT) │     │ Theme & Query Context │  │
│  └────────────┬────────────┘     └───────────┬───────────┘  │
│               └──────────────┬───────────────┘              │
│                              ▼                              │
│                    Page Route Components                    │
│             (Dashboard, Attendance, Tasks, etc.)            │
│                              │                              │
│                              ▼                              │
│                       API Fetch Client                      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP Requests
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS WEB API SERVER                   │
│  API Routes (28 modules in /api/*)                          │
│                              │                              │
│                              ▼                              │
│                   requireAuth() RBAC Guard                  │
│                              │                              │
│                              ▼                              │
│                    Drizzle Query Engine                     │
│                              │                              │
│                              ▼                              │
│             Database (SQLite dev / PostgreSQL prod)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ WebView / Nonce Flow
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     COMPANION MOBILE APP                    │
│  Flutter Mobile (Riverpod State, GoRouter)                  │
│                              │                              │
│                              ▼                              │
│         WebViewHandoff (Secure Storage / Nonces)            │
│                              │                              │
│                              ▼                              │
│             Android Glance Home Screen Widgets              │
└─────────────────────────────────────────────────────────────┘
```

## Core Modules & Departmental Layouts
ThaibaHive separates standard operational features from specialized departments:
- **Parent App Shell**: Common features (Attendance, Tasks, Leave, Reports, Bookings, Settings).
- **EduHive**: School-specific structures (Institutions, departments, shifts, checklists templates).
- **MediaHive**: Dynamic ingestion pipelines, transcoding queues, and asset buckets storage.

## Mobile Auth Integration (Nonce Handoff)
1. Mobile app stores active JWT inside secure storage (`AppConstants.storageTokenKey`).
2. To load a secure web page inside WebView:
   - Mobile app requests a short-lived nonce from `/api/auth/mobile-handoff/nonce`.
   - The API yields a secure single-use nonce.
   - WebView navigates to `/auth/mobile-handoff?nonce=<nonce>`.
   - The server verifies the nonce, sets the HTTP-only secure JWT cookie, and redirects the WebView to the requested dashboard layout.
