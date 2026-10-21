/**
 * @jest-environment node
 *
 * Payroll Processing & Salary Structures Pipeline — Hardening Perfection Test Suite
 * Covers:
 * - Safe JSON parsing across all mutating endpoints (400 Bad Request with { error: "Invalid JSON payload" })
 * - Centralized rate limiting enforcement on read and write
 * - Cross-tenant and cross-staff salary structure isolation (confidential salary leak prevention)
 * - Staff self-scoping: staff role cannot view or modify other staff's records
 * - Month (1-12) and Year (2020-2100) range validation on records query (400 Bad Request)
 * - Record existence and tenant-scoping verification on status updates (404 Not Found)
 * - Status transition state machine invariants (disbursed/voided terminal guards, 409 Conflict)
 * - Monthly payroll batch generation, itemized deductions, audit hashes, and concurrency mutex (409 Conflict)
 */

import { NextResponse } from 'next/server';
import { db, institutions, staff, payrollSalaryStructures, payrollRecords, payrollDeductions } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { GET as getStructures, POST as postStructure } from '@/app/api/finance/payroll/structures/route';
import { GET as getRecords, PATCH as patchRecord } from '@/app/api/finance/payroll/records/route';
import { POST as postGenerate, withPayrollBatchLock } from '@/app/api/finance/payroll/generate/route';

let mockRateLimitAllowed = true;
jest.mock('@/lib/api/rate-limit', () => ({
  checkRateLimit: jest.fn(() => ({
    allowed: mockRateLimitAllowed,
    remaining: mockRateLimitAllowed ? 999 : 0,
    resetMs: mockRateLimitAllowed ? 0 : 45000,
  })),
  rateLimitResponse: jest.fn((ms: number) =>
    NextResponse.json({ error: 'Too many requests', retryAfter: ms }, { status: 429 })
  ),
  extractIp: jest.fn(() => '127.0.0.1'),
}));

let currentSession: any = {
  userId: 'usr_payroll_admin',
  staffId: 'stf_payroll_admin',
  email: 'admin.payroll@thaiba.edu',
  role: 'admin',
  institutionId: 'inst_payroll_a',
  permissions: ['*'],
};

jest.mock('@thaiba/auth', () => {
  const actual = jest.requireActual('@thaiba/auth');
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve(currentSession)),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe('Payroll Processing & Salary Structures Pipeline — Hardening Perfection Suite', () => {
  const suffix = Math.random().toString(36).slice(2, 8);
  const instA = `inst_pay_a_${suffix}`;
  const instB = `inst_pay_b_${suffix}`;

  const adminAId = `stf_pay_adm_a_${suffix}`;
  const staffA1Id = `stf_pay_s1_a_${suffix}`;
  const staffA2Id = `stf_pay_s2_a_${suffix}`;
  const staffB1Id = `stf_pay_s1_b_${suffix}`;

  beforeAll(async () => {
    // Seed institutions
    await db.insert(institutions).values([
      { id: instA, name: `Payroll Inst A ${suffix}`, code: `PIA_${suffix}` },
      { id: instB, name: `Payroll Inst B ${suffix}`, code: `PIB_${suffix}` },
    ]);

    // Seed staff members
    await db.insert(staff).values([
      { id: adminAId, email: `admin_a_${suffix}@test.edu`, employeeId: `EMP_ADM_${suffix}`, firstName: 'Admin', lastName: 'User', role: 'admin', isActive: true },
      { id: staffA1Id, email: `staff_a1_${suffix}@test.edu`, employeeId: `EMP_S1A_${suffix}`, firstName: 'Staff', lastName: 'One', role: 'staff', isActive: true },
      { id: staffA2Id, email: `staff_a2_${suffix}@test.edu`, employeeId: `EMP_S2A_${suffix}`, firstName: 'Staff', lastName: 'Two', role: 'staff', isActive: false }, // Inactive staff
      { id: staffB1Id, email: `staff_b1_${suffix}@test.edu`, employeeId: `EMP_S1B_${suffix}`, firstName: 'Staff', lastName: 'Three', role: 'staff', isActive: true },
    ]);
  });

  afterAll(async () => {
    await db.delete(payrollDeductions).execute();
    await db.delete(payrollRecords).execute();
    await db.delete(payrollSalaryStructures).execute();
    await db.delete(staff).where(inArray(staff.id, [adminAId, staffA1Id, staffA2Id, staffB1Id]));
    await db.delete(institutions).where(inArray(institutions.id, [instA, instB]));
  });

  beforeEach(async () => {
    mockRateLimitAllowed = true;
    currentSession = {
      userId: adminAId,
      staffId: adminAId,
      email: `admin_a_${suffix}@test.edu`,
      role: 'admin',
      institutionId: instA,
      permissions: ['*'],
    };
  });

  const createJsonRequest = (
    url: string,
    method: 'GET' | 'POST' | 'PATCH' = 'POST',
    body?: any,
    rawBody?: string
  ): Request => {
    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer mock-jwt-token',
      },
    };
    if (rawBody !== undefined) {
      init.body = rawBody;
    } else if (body !== undefined) {
      init.body = JSON.stringify(body);
    }
    return new Request(url, init);
  };

  // --------------------------------------------------------------------------
  // 1. Safe JSON Parsing Across Mutating Endpoints
  // --------------------------------------------------------------------------
  describe('1. Safe JSON Parsing Across Mutating Endpoints', () => {
    const malformedBody = '{ "invalidJson": ';

    it('POST /api/finance/payroll/structures returns 400 on malformed JSON', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/structures', 'POST', undefined, malformedBody);
      const res = await (postStructure as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('PATCH /api/finance/payroll/records returns 400 on malformed JSON', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/records?id=rec-123', 'PATCH', undefined, malformedBody);
      const res = await (patchRecord as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('POST /api/finance/payroll/generate returns 400 on malformed JSON', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/generate', 'POST', undefined, malformedBody);
      const res = await (postGenerate as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Centralized Rate Limiting Protection
  // --------------------------------------------------------------------------
  describe('2. Centralized Rate Limiting Protection', () => {
    it('returns 429 when rate limit is exceeded on read or write endpoints', async () => {
      mockRateLimitAllowed = false;

      const reqGet = createJsonRequest('https://thaiba.edu/api/finance/payroll/structures', 'GET');
      const resGet = await (getStructures as any)(reqGet, currentSession);
      expect(resGet.status).toBe(429);

      const reqPost = createJsonRequest('https://thaiba.edu/api/finance/payroll/structures', 'POST', { baseSalary: 50000 });
      const resPost = await (postStructure as any)(reqPost, currentSession);
      expect(resPost.status).toBe(429);

      const reqPatch = createJsonRequest('https://thaiba.edu/api/finance/payroll/records?id=rec-1', 'PATCH', { status: 'approved' });
      const resPatch = await (patchRecord as any)(reqPatch, currentSession);
      expect(resPatch.status).toBe(429);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Salary Structures Lifecycle & Confidentiality Isolation
  // --------------------------------------------------------------------------
  describe('3. Salary Structures Lifecycle & Confidentiality Isolation', () => {
    it('fails with 400 on invalid or non-positive base salary', async () => {
      const payload = {
        institutionId: instA,
        staffId: staffA1Id,
        baseSalary: -5000,
        effectiveDate: '2026-10-01',
      };
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/structures', 'POST', payload);
      const res = await (postStructure as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('creates salary structure successfully (201 Created)', async () => {
      const payload = {
        institutionId: instA,
        staffId: staffA1Id,
        baseSalary: 60000,
        hraAllowance: 12000,
        daAllowance: 6000,
        specialAllowance: 2000,
        pfDeductionRate: 0.12,
        effectiveDate: '2026-10-01',
      };
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/structures', 'POST', payload);
      const res = await (postStructure as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.structure).toBeDefined();
      expect(data.structure.baseSalary).toBe(60000);
      expect(data.structure.staffId).toBe(staffA1Id);
    });

    it('cross-tenant leak prevention: querying staffId in another institution returns empty array', async () => {
      // Also seed a salary structure for staffB1 in instB
      currentSession.institutionId = instB;
      const payloadB = {
        institutionId: instB,
        staffId: staffB1Id,
        baseSalary: 75000,
        effectiveDate: '2026-10-01',
      };
      const reqB = createJsonRequest('https://thaiba.edu/api/finance/payroll/structures', 'POST', payloadB);
      await (postStructure as any)(reqB, currentSession);

      // Now as Admin in instA, try to query staffB1's salary structure
      currentSession.institutionId = instA;
      const leakReq = createJsonRequest(`https://thaiba.edu/api/finance/payroll/structures?institutionId=${instA}&staffId=${staffB1Id}`, 'GET');
      const leakRes = await (getStructures as any)(leakReq, currentSession);
      const leakData = await leakRes.json();

      expect(leakRes.status).toBe(200);
      // Must not leak staffB1's salary to instA admin
      expect(leakData.structures).toEqual([]);
    });

    it('staff self-scoping: staff role can only view their own salary structure', async () => {
      currentSession = {
        userId: staffA1Id,
        staffId: staffA1Id,
        email: `staff_a1_${suffix}@test.edu`,
        role: 'staff',
        institutionId: instA,
        permissions: ['finance:payroll:view'],
      };

      // Staff queries requesting another staff's ID
      const req = createJsonRequest(`https://thaiba.edu/api/finance/payroll/structures?institutionId=${instA}&staffId=${staffB1Id}`, 'GET');
      const res = await (getStructures as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Result is forced to staffA1's structure, ignoring requested staffB1Id
      expect(data.structures.length).toBe(1);
      expect(data.structures[0].staffId).toBe(staffA1Id);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Payroll Records Query Bounds & Scoping
  // --------------------------------------------------------------------------
  describe('4. Payroll Records Query Bounds & Scoping', () => {
    it('returns 400 on invalid month range (<1 or >12)', async () => {
      const req1 = createJsonRequest('https://thaiba.edu/api/finance/payroll/records?month=13', 'GET');
      const res1 = await (getRecords as any)(req1, currentSession);
      const data1 = await res1.json();

      expect(res1.status).toBe(400);
      expect(data1.error).toContain('Invalid month parameter');

      const req2 = createJsonRequest('https://thaiba.edu/api/finance/payroll/records?month=0', 'GET');
      const res2 = await (getRecords as any)(req2, currentSession);
      expect(res2.status).toBe(400);
    });

    it('returns 400 on invalid year bounds (<2020 or >2100 or non-numeric)', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/records?year=1999', 'GET');
      const res = await (getRecords as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Invalid year parameter');
    });

    it('enforces staff self-scoping on payroll records list', async () => {
      currentSession = {
        userId: staffA1Id,
        staffId: staffA1Id,
        email: `staff_a1_${suffix}@test.edu`,
        role: 'staff',
        institutionId: instA,
        permissions: ['finance:payroll:view'],
      };

      const req = createJsonRequest(`https://thaiba.edu/api/finance/payroll/records?staffId=${adminAId}`, 'GET');
      const res = await (getRecords as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(200);
      // Staff role can only see their own records
      for (const rec of data.records) {
        expect(rec.staffId).toBe(staffA1Id);
      }
    });
  });

  // --------------------------------------------------------------------------
  // 5. Payroll Record Status State Machine & Invariants
  // --------------------------------------------------------------------------
  describe('5. Payroll Record Status State Machine & Invariants', () => {
    it('PATCH /records returns 400 when record ID is missing', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/records', 'PATCH', { status: 'approved' });
      const res = await (patchRecord as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Record ID is required');
    });

    it('PATCH /records returns 404 when record does not exist', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/payroll/records?id=non_existent_rec_id', 'PATCH', { status: 'approved' });
      const res = await (patchRecord as any)(req, currentSession);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Payroll record not found');
    });

    it('enforces state machine: draft -> approved -> disbursed -> terminal', async () => {
      // Generate a record first
      const genReq = createJsonRequest('https://thaiba.edu/api/finance/payroll/generate', 'POST', {
        institutionId: instA,
        payPeriodYear: 2026,
        payPeriodMonth: 10,
        staffIds: [staffA1Id],
      });
      const genRes = await (postGenerate as any)(genReq, currentSession);
      const genData = await genRes.json();
      expect(genRes.status).toBe(201);
      expect(genData.records.length).toBe(1);

      const recordId = genData.records[0].id;
      expect(genData.records[0].status).toBe('draft');

      // 1. Invalid transition directly from draft -> disbursed returns 400
      const invalidReq = createJsonRequest(`https://thaiba.edu/api/finance/payroll/records?institutionId=${instA}&id=${recordId}`, 'PATCH', {
        status: 'disbursed',
        paymentReference: 'REF-INVALID-1',
      });
      const invalidRes = await (patchRecord as any)(invalidReq, currentSession);
      const invalidData = await invalidRes.json();
      expect(invalidRes.status).toBe(400);
      expect(invalidData.error).toContain("Invalid status transition from 'draft' to 'disbursed'");

      // 2. Valid transition: draft -> approved
      const approveReq = createJsonRequest(`https://thaiba.edu/api/finance/payroll/records?institutionId=${instA}&id=${recordId}`, 'PATCH', {
        status: 'approved',
      });
      const approveRes = await (patchRecord as any)(approveReq, currentSession);
      const approveData = await approveRes.json();
      expect(approveRes.status).toBe(200);
      expect(approveData.record.status).toBe('approved');
      expect(approveData.record.approvedById).toBe(adminAId);

      // 3. Valid transition: approved -> disbursed
      const disburseReq = createJsonRequest(`https://thaiba.edu/api/finance/payroll/records?institutionId=${instA}&id=${recordId}`, 'PATCH', {
        status: 'disbursed',
        paymentReference: 'NEFT-TX-202610-001',
      });
      const disburseRes = await (patchRecord as any)(disburseReq, currentSession);
      const disburseData = await disburseRes.json();
      expect(disburseRes.status).toBe(200);
      expect(disburseData.record.status).toBe('disbursed');
      expect(disburseData.record.paymentReference).toBe('NEFT-TX-202610-001');
      expect(disburseData.record.disbursedAt).toBeDefined();

      // 4. Terminal state: disbursed record cannot be updated again (409 Conflict)
      const modifyTerminalReq = createJsonRequest(`https://thaiba.edu/api/finance/payroll/records?institutionId=${instA}&id=${recordId}`, 'PATCH', {
        status: 'draft',
      });
      const modifyTerminalRes = await (patchRecord as any)(modifyTerminalReq, currentSession);
      const modifyTerminalData = await modifyTerminalRes.json();
      expect(modifyTerminalRes.status).toBe(409);
      expect(modifyTerminalData.error).toContain('Cannot update a payroll record that is already disbursed');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Batch Monthly Payroll Generation & Concurrency Mutex
  // --------------------------------------------------------------------------
  describe('6. Batch Monthly Payroll Generation & Concurrency Mutex', () => {
    it('generates payroll records, itemized deductions, and SHA-256 audit hash', async () => {
      const genReq = createJsonRequest('https://thaiba.edu/api/finance/payroll/generate', 'POST', {
        institutionId: instA,
        payPeriodYear: 2026,
        payPeriodMonth: 11,
      });
      const genRes = await (postGenerate as any)(genReq, currentSession);
      const genData = await genRes.json();

      expect(genRes.status).toBe(201);
      expect(genData.records).toBeDefined();
      expect(genData.records.length).toBeGreaterThanOrEqual(1);

      const record = genData.records[0];
      expect(record.grossEarnings).toBeGreaterThan(0);
      expect(record.totalDeductions).toBeGreaterThan(0);
      expect(record.netPayable).toBe(record.grossEarnings - record.totalDeductions);
      expect(record.auditHash).toBeDefined();

      // Verify itemized deductions exist in db
      const deductions = await db
        .select()
        .from(payrollDeductions)
        .where(eq(payrollDeductions.payrollRecordId, record.id));
      expect(deductions.length).toBe(3); // PF, PT, TDS
    });

    it('reports inactive staff as skipped without failing the batch', async () => {
      // Seed salary structure for inactive staffA2
      await db.insert(payrollSalaryStructures).values({
        id: `sal-struct-inactive-${suffix}`,
        institutionId: instA,
        staffId: staffA2Id,
        baseSalary: 45000,
        effectiveDate: '2026-10-01',
      }).onConflictDoNothing();

      const genReq = createJsonRequest('https://thaiba.edu/api/finance/payroll/generate', 'POST', {
        institutionId: instA,
        payPeriodYear: 2026,
        payPeriodMonth: 12,
        staffIds: [staffA1Id, staffA2Id],
      });
      const genRes = await (postGenerate as any)(genReq, currentSession);
      const genData = await genRes.json();

      expect(genRes.status).toBe(201);
      expect(genData.skipped).toBeDefined();
      expect(genData.skipped).toContainEqual({ staffId: staffA2Id, reason: 'inactive' });
    });

    it('concurrency mutex blocks duplicate parallel runs with 409 Conflict', async () => {
      const lockKey = `${instA}:2026:9`;

      // Acquire lock manually to simulate concurrent batch in progress
      await withPayrollBatchLock(lockKey, async () => {
        const parallelReq = createJsonRequest('https://thaiba.edu/api/finance/payroll/generate', 'POST', {
          institutionId: instA,
          payPeriodYear: 2026,
          payPeriodMonth: 9,
        });
        const parallelRes = await (postGenerate as any)(parallelReq, currentSession);
        const parallelData = await parallelRes.json();

        expect(parallelRes.status).toBe(409);
        expect(parallelData.error).toContain('Payroll generation already in progress for this period');
      });
    });
  });
});
