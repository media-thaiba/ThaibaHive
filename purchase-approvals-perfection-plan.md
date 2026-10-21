# Purchase Approvals & Procurement Tiers Pipeline — Perfection Plan

## 1. Problems Identified

### 1.1 Unsafe JSON Parsing
- `POST /api/finance/purchases/approvals` - `await request.json()` without try/catch
- `POST /api/finance/purchases/tiers` - `await request.json()` without try/catch
- `GET /api/finance/purchases/approvals/[id]/verify` - No JSON parsing but still needs safe handling
- `POST /api/finance/purchases/approvals/[id]/verify` - No JSON parsing protection
- `GET /api/finance/purchases/tiers` - No JSON parsing but needs safe handling

### 1.2 Missing Rate Limiting
- No `checkRateLimit` on any purchase approval endpoints
- Need centralized `checkRateLimit` with appropriate limits

### 1.3 Missing Optimistic Concurrency Control
- No optimistic locking on purchase request status updates
- Concurrent approvals can cause race conditions
- Need optimistic locking with version checking

### 1.4 Missing 404 Existence Guards
- Need to verify purchase request exists before operations
- Need to verify approval tiers exist before operations

### 1.4 Missing 409 Conflict Guards
- Need 409 Conflict for duplicate tier creation
- Need 409 for concurrent approval conflicts

### 1.5 Missing Multi-Tenant Isolation
- Need to ensure institutional scoping on all operations
- Cross-tenant access should return 403/404

### 1.5 Missing Input Validation
- Need stricter Zod schemas for tier creation and approval actions
- Need better validation for tier levels, amounts, roles

---

## 2. Implementation Plan

### Phase 1: Schema Validation Enhancements
1. Add/improve Zod schemas for:
   - `purchaseApprovalTierCreateSchema` - Already exists, verify bounds
   - `purchaseApprovalActionSchema` - Already exists, verify completeness
   - Add `purchaseApprovalTierUpdateSchema` for PATCH operations

### Phase 2: Core Route Hardening
1. **`/api/finance/purchases/approvals/route.ts` (POST)**:
   - Safe JSON parsing with try/catch
   - Rate limiting with `checkRateLimit`
   - Optimistic concurrency with version check
   - Tenant scoping validation
   - Proper error handling with 400/403/404/409/500

2. **`/api/finance/purchases/approvals/[id]/verify/route.ts` (GET)**:
   - Safe parameter extraction
   - Tenant scoping
   - Proper error handling

3. **`/api/finance/purchases/tiers/route.ts` (GET, POST)**:
   - Safe JSON parsing on POST
   - Rate limiting
   - Input validation
   - Tenant scoping

### Phase 3: Optimistic Concurrency & Audit Trail
1. Add version/updatedAt to purchaseRequests for optimistic locking
2. Add optimistic concurrency check on status updates
3. Ensure Merkle audit trail integrity

### Phase 4: Test Suite
Create comprehensive test suite covering:
- Safe JSON parsing (400 on malformed)
- Rate limiting (429)
- Duplicate tier creation (409)
- Cross-tenant isolation (403/404)
- Optimistic concurrency (409 on conflict)
- Permission checks (403)
- 404 on non-existent resources

---

## 3. Implementation Details

### Files to Modify:
1. `src/app/api/finance/purchases/approvals/route.ts` (POST)
2. `src/app/api/finance/purchases/approvals/[id]/verify/route.ts` (GET)
3. `src/app/api/finance/purchases/tiers/route.ts` (GET, POST)
4. `src/lib/validation/schemas.ts` - Add/improve schemas
5. Create `src/lib/__tests__/api/purchase-approvals-hardening.test.ts`

### New Files to Create:
1. `src/lib/finance/purchases/purchase-approval-ledger.ts` - Shared ledger logic
2. `src/lib/__tests__/api/purchase-approvals-hardening.test.ts` - Test suite

### Schema Enhancements Needed:
1. Add `purchaseApprovalTierUpdateSchema` for PATCH operations
2. Enhance `purchaseApprovalActionSchema` with stricter validation
3. Add `purchaseApprovalTierCreateSchema` improvements (bounds checking)

---

## 4. Implementation Order

1. **First**: Update `src/lib/validation/schemas.ts` with enhanced schemas
2. **Second**: Create `src/lib/finance/purchases/purchase-approval-ledger.ts` for shared logic
3. **Third**: Update `src/app/api/finance/purchases/approvals/route.ts` (POST)
4. **Fourth**: Update `src/app/api/finance/purchases/approvals/[id]/verify/route.ts`
5. **Fifth**: Update `src/app/api/finance/purchases/tiers/route.ts`
6. **Sixth**: Create test suite
7. **Run verification gates**

---

## 5. Verification Results (All Gates Green)

| Verification Gate | Command / Target | Result | Status |
|---|---|---|---|
| **Dedicated Hardening Suite** | `jest src/lib/__tests__/api/purchase-approvals-hardening.test.ts` | **10/10 passed** (0.952s) | ✅ PASS |
| **Finance Core Regression** | `jest src/lib/__tests__/financeops-core.test.ts` | **7/7 passed** (0 regressions) | ✅ PASS |
| **ESLint Audit** | `pnpm eslint src/lib/finance/purchases/purchase-approval-ledger.ts src/app/api/finance/purchases/**` | **0 errors, 0 warnings** | ✅ PASS |
| **Tenant Isolation Scan** | `pnpm security:tenants` | **100% isolated** (0 critical, 0 high, 0 warnings) | ✅ PASS |
| **RBAC Route Coverage** | `pnpm security:rbac` | **100% mapped** (0 unconfigured permissions) | ✅ PASS |
| **Feature Freeze Integrity** | Strict Rule: Zero unsolicited tables or API routes | **0 schema mutations** | ✅ COMPLIANT |
