# Security — ThaibaHive RBAC & Access Control Matrix

> Based on `src/lib/auth/roles.ts` and `src/lib/api/auth-guard.ts`

---

## Role Definitions

| Role | Scope | Description |
|------|-------|-------------|
| `super_admin` | All institutions | Director Office — full system access |
| `admin` | All institutions | IT/HR — system management, staff onboarding |
| `principal` | Single institution | Institution head — institution-wide oversight |
| `hod` | Single department | Department head — department management |
| `staff` | Self only | Regular employee — daily operations |

---

## Permission Matrix

### Staff Management

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `staff:read` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `staff:create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `staff:update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `staff:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Attendance

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `attendance:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `attendance:manage` | ✅ | ✅ | ✅ | ✅ | ❌ |

**RLS Policy**: Staff can only see their own attendance. HOD+ can see their department. Principal+ can see their institution. Admin+ can see all.

### Tasks

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `tasks:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tasks:create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `tasks:assign` | ✅ | ✅ | ✅ | ✅ | ❌ |

**RLS Policy**: Staff see only assigned tasks. HOD+ see department tasks. Principal+ see institution tasks.

### Leaves

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `leaves:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `leaves:approve` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `leaves:delete` | ✅ | ✅ | ✅ | ❌ | ✅ |

**RLS Policy**: Staff see only their own leaves. HOD+ see department leaves. Principal+ see institution leaves.

### Reports

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `reports:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `reports:create` | ✅ | ✅ | ✅ | ❌ | ✅ |
| `reports:review` | ✅ | ✅ | ✅ | ✅ | ❌ |

### Announcements

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `announcements:create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `announcements:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |

**RLS Policy**: Staff see announcements targeted to them (role, department, institution, or global).

### Events

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `events:create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `events:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Polls

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `polls:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `polls:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Bookings

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `bookings:manage` | ✅ | ✅ | ✅ | ❌ | ❌ |

### Help Desk

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `helpdesk:manage` | ✅ | ✅ | ✅ | ❌ | ❌ |

### Assets

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `assets:create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `assets:update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `assets:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Finance

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `finance:create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `finance:update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `finance:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `finance:export` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Vehicles

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `vehicles:create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `vehicles:update` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `vehicles:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Visitors

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `visitors:create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `visitors:update` | ✅ | ✅ | ✅ | ❌ | ❌ |

### Other

| Permission | super_admin | admin | principal | hod | staff |
|-----------|:-----------:|:-----:|:---------:|:---:|:-----:|
| `recognition:create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canteen:create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `canteen:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `canteen:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `checklists:update` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `notifications:update` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `grievances:create` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `grievances:read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `availability:write` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `system:telemetry` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `org:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## API Route Protection

Every API route must use the `requireAuth` wrapper:

```ts
// Public route (no auth)
export const GET = async (request: Request) => { ... };

// Authenticated route (any role)
export const GET = requireAuth(async (request, session) => { ... });

// Permission-gated route
export const GET = requireAuth(async (request, session) => {
  // Only runs if session.role has "staff:read"
}, "staff:read");
```

---

## Database Row-Level Security (RLS) Policies

> To be implemented when migrating to PostgreSQL in production.

### Institution Scope
```sql
-- Staff can only see data from their institution
CREATE POLICY institution_isolation ON staff
  USING (institution_id = current_user_institution_id());
```

### Department Scope
```sql
-- HODs can only see their department's data
CREATE POLICY department_isolation ON tasks
  USING (department_id = current_user_department_id());
```

### Self Scope
```sql
-- Staff can only see their own data
CREATE POLICY self_only ON attendance_logs
  USING (staff_id = current_user_id());
```

### Admin Bypass
```sql
-- Admins and super_admins bypass all RLS
CREATE POLICY admin_bypass ON staff
  USING (current_user_role() IN ('admin', 'super_admin'));
```

---

## Data Sensitivity Classification

| Data | Sensitivity | Protection |
|------|-------------|------------|
| Password hashes | **Critical** | Never expose, bcrypt only |
| JWT tokens | **Critical** | httpOnly, secure, sameSite cookies |
| Bank account details | **High** | Encrypted at rest (future), admin-only read |
| Aadhaar / PAN | **High** | Encrypted at rest (future), admin-only read |
| Personal contact info | **Medium** | Role-gated read access |
| Attendance records | **Medium** | Self + manager read |
| Task details | **Low** | Department-scoped read |
| Announcements | **Low** | Target-audience read |

---

## Security Checklist

- [ ] All API routes use `requireAuth`
- [ ] Passwords hashed with bcrypt (cost factor ≥ 10)
- [ ] JWT secrets are 64+ character random strings
- [ ] Cookies set with `httpOnly: true`, `secure: true` (prod), `sameSite: "lax"`
- [ ] No secrets in client-side code
- [ ] No `console.log` of sensitive data
- [ ] Input validation with Zod on all API routes
- [ ] SQL injection prevented by Drizzle ORM parameterized queries
- [ ] CORS configured for production domain only
- [ ] Rate limiting on auth endpoints (future)
- [ ] CSRF protection via SameSite cookies
- [ ] No `passwordHash` in any API response
