# Attendance System Polish: Shift Grace Period & Check-In/Check-Out Validation

## Context

The mobile Express API (`thaibahive_mobile_app/api/src/routes/attendance/index.ts`) has full NFC/QR check-in validation, shift resolution, and grace period logic. The Next.js web API currently has:
- **Check-in**: A stub returning 403 (mobile-only)
- **Check-out**: Basic checkout without shift resolution or early exit calculation

This plan ports the mobile API logic to the Next.js routes, adding shared utilities for shift resolution, geofencing, and NFC/QR validation.

---

## File Changes

### 1. NEW: `src/lib/attendance/geo.ts`

Haversine distance calculation (extracted from mobile API, lines 10-26).

```ts
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number
```

### 2. NEW: `src/lib/attendance/shifts.ts`

Shift resolution service (ported from mobile API, lines 29-81).

```ts
const DEFAULT_SHIFT = { startTime: "09:00", endTime: "17:00", gracePeriodMinutes: 15 };

export async function resolveShift(staffId: string, date: string): Promise<{
  startTime: string; endTime: string; gracePeriodMinutes: number;
}>
```

Resolution order:
1. Direct `staffShifts` assignment (active on `date`)
2. Department-level `shifts` (via `staffDepartments`)
3. System-wide `shifts` where `applicableToAll = true`
4. Hardcoded `DEFAULT_SHIFT` fallback

### 3. NEW: `src/lib/attendance/validation.ts`

NFC and QR validation functions extracted from mobile API (lines 118-204).

```ts
export class AttendanceValidationError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

export async function validateNfcCheckIn(staffId: string, nfcTagId: string, lat?: number, lon?: number): Promise<void>
// Throws AttendanceValidationError with appropriate HTTP status on failure

export async function validateQrCheckIn(qrCode: string, lat?: number, lon?: number): Promise<void>
// Throws AttendanceValidationError with appropriate HTTP status on failure
```

NFC logic:
1. Check personal NFC match (`staff.nfcTagId`)
2. Else check `attendanceLocations.nfcTagId` (active)
3. If location has coordinates → require `lat`/`lon` and verify geofence (Haversine + radius)

QR logic:
1. Base64url-decode → parse JSON `{ nonce, timestamp, locationId, hmac, validFor? }`
2. Look up `attendanceLocations` by `locationId` (must be active)
3. Recompute HMAC-SHA256 with `qrSecret`, compare
4. Geofence check (if location has coordinates)
5. Expiry check (default 30s)
6. Anti-replay: check existing `usedNonces` table (shared with WebView auth handoff), insert nonce with 5-minute expiry

### 4. MODIFY: `src/lib/validation/schemas.ts`

Add Zod schemas:

```ts
export const checkInSchema = z.object({
  method: z.enum(["nfc", "qr"]),
  nfcTagId: z.string().optional(),
  qrCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine(
  (data) => {
    if (data.method === "nfc") return !!data.nfcTagId;
    if (data.method === "qr") return !!data.qrCode;
    return false;
  },
  { message: "NFC check-in requires nfcTagId; QR check-in requires qrCode" }
);
```

### 5. MODIFY: `src/app/api/attendance/check-in/route.ts`

Replace the 403 stub with full implementation. **Remains mobile-only** — the NFC/QR validation naturally restricts access since only the mobile app can provide valid payloads.

**Request**: `POST /api/attendance/check-in`
- Body: `{ method, nfcTagId?, qrCode?, latitude?, longitude? }`
- Auth: `requireAuth` (any authenticated user — mobile app sends JWT)

**Logic**:
1. Parse & validate body with `checkInSchema`
2. Call `validateNfcCheckIn()` or `validateQrCheckIn()` based on method (catches `AttendanceValidationError` for proper HTTP status)
3. Check no existing log for today (400 if already checked in)
4. Call `resolveShift(staffId, today)`
5. Calculate `lateMinutes` relative to `shiftStart + gracePeriod`
6. Set `status` to `"late"` or `"present"`
7. Insert into `attendanceLogs` with `uuid()` id
8. Return 201 with the new record

**Imports**: `db`, `attendanceLogs`, `staff`, `attendanceLocations`, `usedNonces` from `@/db/schema`; `requireAuth` from `@/lib/api/auth-guard`; `checkInSchema` from `@/lib/validation/schemas`; `resolveShift` from `@/lib/attendance/shifts`; `validateNfcCheckIn`, `validateQrCheckIn` from `@/lib/attendance/validation`; `v4 as uuid` from `uuid`; `createHmac` from `crypto`.

### 6. MODIFY: `src/app/api/attendance/check-out/route.ts`

Enhance existing checkout with shift resolution.

**Changes**:
1. Import `resolveShift` from `@/lib/attendance/shifts`
2. After finding today's log, call `resolveShift(session.staffId, today)`
3. Calculate `earlyExitMinutes` if checkout is before `shift.endTime`
4. Set `earlyExitMinutes` on the update

**Existing imports to add**: `resolveShift` from `@/lib/attendance/shifts`

---

## Verification

1. Run `pnpm typecheck` — must pass with zero TypeScript errors
2. Run `pnpm build` (if typecheck passes) — ensure no runtime import issues
