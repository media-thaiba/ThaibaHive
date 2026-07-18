# Backend API Dependency Map

Overview of endpoint structures and auth dependencies.

```
/api/
├── auth/
│   ├── login/
│   ├── signup/
│   └── mobile-handoff/ (nonce creation)
├── staff/ (CRUD)
├── attendance/ (logs management)
└── approvals/ (HOD & Admin triggers)
```

## Middleware Guard Filters
- Every route inherits `requireAuth` wrapper filter.
- Role validations link directly to `packages/auth/roles.ts` rules mapping.
