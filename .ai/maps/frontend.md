# Frontend Dependency Map

Visualizes routing hierarchies, contexts, and shell layout bounds.

```
/ (Root Shell Layout)
├── AuthContext (Session state)
├── ThemeContext (Dark/Light provider)
└── QueryProvider (TanStack caching)

[Shell Layout Pages]
├── Dashboard (/)
│   └── Quick Action Panels
├── Attendance (/attendance)
│   └── Shift selectors
├── Tasks (/tasks)
│   └── Kanban Board (dnd-kit)
└── Staff Directory (/staff)
    └── Staff details (/staff/[id])
```

## Critical Verification Impact
- Modifications in `AuthContext` can trigger full-app logout behaviors.
- Changing shell layout dimensions affects touch target rules on small viewports.
