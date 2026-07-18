# NFC Check-In & Verification Settings Implementation Plan

## Overview

This plan details the implementation of administrative interfaces and API logic for managing global and campus-specific NFC check-in and background presence verification settings.

---

## Database Schema Changes

### SQLite Schema (`packages/db/schema.ts`)

**Current Issues:**
- Missing `institutionId` foreign key cascade on delete
- Missing coalesced unique index for global/campus settings
- Missing `.notNull()` constraints on numeric fields

**Required Changes:**
1. Add `onDelete: "cascade"` to `institutionId` foreign key reference
2. Add unique index: `uniqueIndex("idx_settings_inst_coalesce").on(sql\`coalesce(${t.institutionId}, 'GLOBAL_DEFAULT')\`)`
3. Add `.notNull()` to all numeric setting fields:
   - `checkIntervalMinutes`
   - `gracePeriodMinutes`
   - `geofenceRadiusMeters`
   - `lowBatteryIntervalMinutes`

### PostgreSQL Schema (`packages/db/schema.pg.ts`)

**Same changes as SQLite:**
1. Add `onDelete: "cascade"` to `institutionId` foreign key
2. Add coalesced unique index
3. Add `.notNull()` constraints

---

## Backend API Changes

### Settings API (`src/app/api/attendance/settings/route.ts`)

**Current Issues:**
- No institution-specific filtering
- No role-based access control
- No audit logging
- No validation
- No upsert logic with conflict handling

**Required Changes:**

#### GET Handler:
1. Read `institutionId` from search params
2. Authorization check:
   - Global admins (`super_admin` or `admin` with `attendance:manage` permission) can access all
   - Campus principals can only access their own institution
3. Query with fallback:
   - First try institution-specific settings
   - Fall back to global settings (`institutionId IS NULL`)
   - Fall back to hardcoded `DEFAULT_SETTINGS`

#### PUT Handler:
1. Read `institutionId` from request body
2. Authorization check (same as GET)
3. Validate input using Zod schema
4. Transaction-based upsert:
   - If setting exists → update and log `UPDATE_VERIFICATION_SETTINGS`
   - If not exists → insert and log `CREATE_VERIFICATION_SETTINGS`
   - Handle unique constraint violations (error code `23505` or `SQLITE_CONSTRAINT_UNIQUE`) for concurrent writes

---

## Validation Schema

Add to `src/lib/validation/schemas.ts`:

```typescript
export const verificationSettingsSchema = z.object({
  institutionId: z.string().nullable().optional(),
  isEnabled: z.boolean().optional(),
  shadowMode: z.boolean().optional(),
  checkIntervalMinutes: z.number().int().min(1).max(180).optional(),
  gracePeriodMinutes: z.number().int().min(0).max(60).optional(),
  autoCheckoutOnViolation: z.boolean().optional(),
  geofenceRadiusMeters: z.number().int().min(10).max(5000).optional(),
  lowBatteryIntervalMinutes: z.number().int().min(1).max(180).optional(),
  criticalBatterySuspend: z.boolean().optional(),
});
```

---

## Frontend UI Changes

### Attendance Locations Page (`src/app/(shell)/admin/attendance-locations/page.tsx`)

**Current State:**
- Single-tab interface for location management

**Required Changes:**
1. Add tabbed interface with "Locations" and "Verification Settings" tabs
2. Create new `VerificationSettingsForm` component with:
   - Campus/Institution selector dropdown
   - Toggle switches for boolean settings
   - Numeric inputs for interval/radius settings
   - Save button with loading state
3. Fetch institutions list from `/api/admin/institutions`
4. On campus selection change:
   - Fetch settings from `/api/attendance/settings?institutionId=...`
   - Show loading skeleton during fetch
5. On form submit:
   - PUT to `/api/attendance/settings` with form data
   - Show success/error toast
6. Role-based visibility:
   - Global admins see "Global Settings" option + all campuses
   - Campus principals see only their campus

---

## Implementation Tasks

### Phase 1: Database Schema Updates
- [ ] Update SQLite schema with cascade delete, unique index, and notNull constraints
- [ ] Update PostgreSQL schema with same changes
- [ ] Generate PostgreSQL migration files (`pnpm db:generate`)
- [ ] Verify no duplicate settings exist in PostgreSQL before migration
- [ ] Push schema updates to local SQLite database

### Phase 2: Backend API
- [ ] Add verification settings Zod schema to `src/lib/validation/schemas.ts`
- [ ] Refactor GET handler with institution filtering and authorization
- [ ] Refactor PUT handler with validation, transaction upsert, and audit logging
- [ ] Add institution assignment verification (check `staffInstitutions` table)
- [ ] Implement concurrent write conflict handling

### Phase 3: Frontend UI
- [ ] Add tabbed interface to attendance-locations page
- [ ] Create `VerificationSettingsForm` component
- [ ] Implement campus selector with role-based filtering
- [ ] Add form fields with proper validation
- [ ] Connect to API endpoints with loading states
- [ ] Add success/error feedback

### Phase 4: Testing
- [ ] Write unit tests for settings endpoint
- [ ] Test default fallback behavior
- [ ] Test CRUD operations
- [ ] Test cross-campus principal spoofing rejection (403)
- [ ] Run lint and typecheck
- [ ] Run full test suite

---

## Authorization Rules

### Global Admins (`super_admin` or `admin` with `attendance:manage`):
- Can view and modify global settings
- Can view and modify any campus settings

### Campus Principals (`principal`):
- Can view settings for their assigned institution
- Can modify settings for their assigned institution
- **Cannot** access global settings
- **Cannot** access other campus settings (returns 403)
- If no campus override exists, GET returns global settings (intentional visibility)

---

## Audit Trail

### Activity Logging:
- `CREATE_VERIFICATION_SETTINGS` - When creating campus-specific settings for the first time
  - Diff calculated against `DEFAULT_SETTINGS`
- `UPDATE_VERIFICATION_SETTINGS` - When updating existing settings
  - Diff calculated against previous settings value

### Log Format:
```typescript
{
  action: "CREATE_VERIFICATION_SETTINGS" | "UPDATE_VERIFICATION_SETTINGS",
  resourceType: "presence_verification_settings",
  resourceId: settingsId,
  details: {
    institutionId: string | null,
    changes: { field: { from: oldValue, to: newValue } }
  }
}
```

---

## Verification Plan

### Automated Tests:
```bash
pnpm lint
pnpm typecheck
pnpm test
```

### Manual Verification:
1. Navigate to `/admin/attendance-locations`
2. Click "Verification Settings" tab
3. Select "Global Settings" and configure:
   - Check Interval: 12 minutes
   - Geofence Radius: 200 meters
   - Shadow Mode: Enabled
4. Click "Save Settings"
5. Select a specific campus (e.g., "TPS - Majhikhanda")
6. Verify it loads global settings (12 min / 200 m)
7. Customize campus settings (e.g., Geofence Radius: 100 meters)
8. Click "Save"
9. Switch back to "Global Settings" → verify 200 meters
10. Switch to campus → verify 100 meters
11. Check `/timeline` for `UPDATE_VERIFICATION_SETTINGS` audit entry

---

## Scope Boundary

**In Scope:**
- Administrative dashboard UI
- API endpoints for CRUD operations
- Database schema and migrations
- Authorization and validation
- Audit logging

**Out of Scope:**
- Background tracking execution
- Auto-checkout daemon enforcement
- Device background task processing
- Mobile app integration
