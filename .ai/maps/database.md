# Database Schema Dependency Map

Database tables junction map in `packages/db/schema.ts`.

```
staff
├── staffInstitutions ── institutions
├── staffDepartments  ── departments
├── attendance_logs
├── leaves
└── tasks
```

## Relationships
- Deleting an `institution` requires deleting cascading dependencies on `staffInstitutions`.
- Shifts map directly to staff records.
