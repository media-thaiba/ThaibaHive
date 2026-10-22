/**
 * @jest-environment node
 *
 * Student Fee Management & Financial Receipts Pipeline — Hardening Perfection Test Suite
 * Covers:
 * - Safe JSON parsing across all mutating endpoints (400 Bad Request with { error: "Invalid JSON payload" })
 * - Rate limiting enforcement on read and write
 * - Fee structure tenant-scoped duplicate code collisions (409 Conflict) & cross-tenant isolation (201 Created)
 * - Missing fee structure on allocation (404 Not Found)
 * - Duplicate student fee allocation prevention (409 Conflict)
 * - Counter shift validation, allocation verification, student matching, and overpayment guards (400/404/409)
 * - Online checkout allocation balance & overpayment guards (400/404/409)
 * - Receipt generation payment verification (404 Not Found)
 * - Public cryptographic receipt verification via hash (400/404/200)
 * - Scholarship concession validation and retrieval (400/200/201)
 */

import { NextResponse } from 'next/server';
import { GET as getStructures, POST as postStructure } from '@/app/api/finance/fees/structures/route';
import { GET as getAllocations, POST as postAllocation } from '@/app/api/finance/fees/allocations/route';
import { GET as getCounter, POST as postCounter } from '@/app/api/finance/fees/counter/route';
import { GET as getReceipts, POST as postReceipt } from '@/app/api/finance/fees/receipts/route';
import { POST as postCheckout } from '@/app/api/finance/fees/checkout/route';
import { GET as getScholarships, POST as postScholarship } from '@/app/api/finance/fees/scholarships/route';
import { GET as getVerifyReceipt } from '@/app/api/finance/fees/verify/[hash]/route';
import { FeeDbStore } from '@/db/fee-store';
import { CounterRegisterEngine } from '@/lib/operations/finance/counter/counter-register-engine';

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

let mockSession = {
  userId: 'usr_fee_admin',
  staffId: 'usr_fee_admin',
  email: 'fee.admin@thaiba.edu',
  role: 'super_admin',
  institutionId: 'inst-001',
  permissions: ['*'],
};

jest.mock('@thaiba/auth', () => {
  const actual = jest.requireActual('@thaiba/auth');
  return {
    ...actual,
    verifySession: jest.fn().mockImplementation(() => Promise.resolve(mockSession)),
    hasPermission: jest.fn().mockReturnValue(true),
  };
});

describe('Student Fee Management & Financial Receipts Pipeline — Hardening Perfection Suite', () => {
  beforeEach(() => {
    mockRateLimitAllowed = true;
    FeeDbStore.getInstance().clearMemoryStore();
    mockSession = {
      userId: 'usr_fee_admin',
      staffId: 'usr_fee_admin',
      email: 'fee.admin@thaiba.edu',
      role: 'super_admin',
      institutionId: 'inst-001',
      permissions: ['*'],
    };
  });

  const createJsonRequest = (
    url: string,
    method: 'GET' | 'POST' = 'POST',
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
    const malformedBody = '{ "unclosedJson": ';

    it('POST /api/finance/fees/structures returns 400 on malformed JSON payload', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', undefined, malformedBody);
      const res = await (postStructure as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('POST /api/finance/fees/allocations returns 400 on malformed JSON payload', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/allocations', 'POST', undefined, malformedBody);
      const res = await (postAllocation as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('POST /api/finance/fees/counter returns 400 on malformed JSON payload', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', undefined, malformedBody);
      const res = await (postCounter as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('POST /api/finance/fees/receipts returns 400 on malformed JSON payload', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/receipts', 'POST', undefined, malformedBody);
      const res = await (postReceipt as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('POST /api/finance/fees/checkout returns 400 on malformed JSON payload', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/checkout', 'POST', undefined, malformedBody);
      const res = await (postCheckout as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Invalid JSON payload');
    });

    it('POST /api/finance/fees/scholarships returns 400 on malformed JSON payload', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/scholarships', 'POST', undefined, malformedBody);
      const res = await (postScholarship as any)(req, mockSession);
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

      const reqGet = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'GET');
      const resGet = await (getStructures as any)(reqGet, mockSession);
      expect(resGet.status).toBe(429);

      const reqPost = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', { name: 'Test' });
      const resPost = await (postStructure as any)(reqPost, mockSession);
      expect(resPost.status).toBe(429);
    });

    it('returns 429 when rate limit is exceeded on public verify/[hash] endpoint', async () => {
      mockRateLimitAllowed = false;

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/verify/test-hash', 'GET');
      const res = await (getVerifyReceipt as any)(req, { params: Promise.resolve({ hash: 'test-hash' }) });
      expect(res.status).toBe(429);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Fee Structures — Validation, Collision & Multi-Tenant Isolation
  // --------------------------------------------------------------------------
  describe('3. Fee Structures — Validation, Collision & Multi-Tenant Isolation', () => {
    const validStructure = {
      institutionId: 'inst-001',
      name: 'Computer Science 2026-2027',
      code: 'CS-2026',
      academicYear: '2026-2027',
      quota: 'general',
      residentialType: 'day_scholar',
      currency: 'INR',
      totalAmount: 75000,
      components: [
        {
          name: 'Tuition Fee',
          componentType: 'tuition',
          amount: 60000,
          isMandatory: true,
          glAccountCode: 'GL:4100',
        },
        {
          name: 'Laboratory Fee',
          componentType: 'lab',
          amount: 15000,
          isMandatory: true,
          glAccountCode: 'GL:4200',
        },
      ],
    };

    it('fails with 400 on invalid or missing structure fields', async () => {
      const invalid = { ...validStructure, name: '', totalAmount: -500 };
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', invalid);
      const res = await (postStructure as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('creates fee structure successfully (201 Created)', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', validStructure);
      const res = await (postStructure as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.structure.code).toBe('CS-2026');
      expect(data.structure.totalAmount).toBe(75000);
    });

    it('rejects duplicate code collision within the same institution (409 Conflict)', async () => {
      // First creation
      const req1 = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', validStructure);
      await (postStructure as any)(req1, mockSession);

      // Attempt duplicate code (case-insensitive check)
      const duplicateBody = { ...validStructure, name: 'Duplicate CS', code: 'cs-2026' };
      const req2 = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', duplicateBody);
      const res2 = await (postStructure as any)(req2, mockSession);
      const data2 = await res2.json();

      expect(res2.status).toBe(409);
      expect(data2.error).toContain("already exists in this institution");
    });

    it('permits same code in a different institution (multi-tenant boundary)', async () => {
      // Create in inst-001
      const req1 = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', validStructure);
      await (postStructure as any)(req1, mockSession);

      // Create in inst-002 with same code
      mockSession.institutionId = 'inst-002';
      const crossTenantBody = { ...validStructure, institutionId: 'inst-002', code: 'CS-2026' };
      const req2 = createJsonRequest('https://thaiba.edu/api/finance/fees/structures', 'POST', crossTenantBody);
      const res2 = await (postStructure as any)(req2, mockSession);
      const data2 = await res2.json();

      expect(res2.status).toBe(201);
      expect(data2.success).toBe(true);
      expect(data2.structure.institutionId).toBe('inst-002');
    });

    it('lists fee structures with institution and academic year filtering', async () => {
      const store = FeeDbStore.getInstance();
      await store.createFeeStructure({
        id: 'struct-filter-1',
        institutionId: 'inst-001',
        name: 'Structure Year 26',
        code: 'STRUCT-Y26',
        academicYear: '2026-2027',
        term: 'annual',
        quota: 'general',
        residentialType: 'day_scholar',
        totalAmount: 50000,
        currency: 'INR',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/structures?institutionId=inst-001&academicYear=2026-2027', 'GET');
      const res = await (getStructures as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.structures.length).toBe(1);
      expect(data.structures[0].code).toBe('STRUCT-Y26');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Fee Allocations — Structure Existence & Duplicate Allocation Guards
  // --------------------------------------------------------------------------
  describe('4. Fee Allocations — Structure Existence & Duplicate Allocation Guards', () => {
    it('returns 404 when allocating against a non-existent fee structure', async () => {
      const allocationPayload = {
        institutionId: 'inst-001',
        studentId: 'stud-101',
        feeStructureId: 'non_existent_structure_id',
        academicYear: '2026-2027',
        term: 'annual',
      };

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/allocations', 'POST', allocationPayload);
      const res = await (postAllocation as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Fee structure not found');
    });

    it('allocates fee structure to student successfully (201 Created)', async () => {
      const store = FeeDbStore.getInstance();
      await store.createFeeStructure({
        id: 'struct-btech-01',
        institutionId: 'inst-001',
        name: 'B.Tech IT',
        code: 'BTECH-IT',
        academicYear: '2026-2027',
        term: 'annual',
        quota: 'general',
        residentialType: 'day_scholar',
        totalAmount: 80000,
        currency: 'INR',
        isActive: true,
        components: [
          {
            id: 'comp-btech-01',
            feeStructureId: 'struct-btech-01',
            name: 'Tuition Fee',
            componentType: 'tuition',
            amount: 80000,
            isMandatory: true,
            isRefundable: false,
            taxRatePercent: 0,
            glAccountCode: 'GL-100',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const allocationPayload = {
        institutionId: 'inst-001',
        studentId: 'stud-101',
        feeStructureId: 'struct-btech-01',
        academicYear: '2026-2027',
        term: 'annual',
      };

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/allocations', 'POST', allocationPayload);
      const res = await (postAllocation as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.allocation.studentId).toBe('stud-101');
      expect(data.allocation.feeStructureId).toBe('struct-btech-01');
      expect(data.allocation.netPayableAmount).toBe(80000);
    });

    it('rejects duplicate allocation of same structure for same student & academic year (409 Conflict)', async () => {
      const store = FeeDbStore.getInstance();
      await store.createFeeStructure({
        id: 'struct-dup-01',
        institutionId: 'inst-001',
        name: 'B.Tech EE',
        code: 'BTECH-EE',
        academicYear: '2026-2027',
        term: 'annual',
        quota: 'general',
        residentialType: 'day_scholar',
        totalAmount: 60000,
        currency: 'INR',
        isActive: true,
        components: [
          {
            id: 'comp-dup-01',
            feeStructureId: 'struct-dup-01',
            name: 'Tuition Fee',
            componentType: 'tuition',
            amount: 60000,
            isMandatory: true,
            isRefundable: false,
            taxRatePercent: 0,
            glAccountCode: 'GL-100',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const allocationPayload = {
        institutionId: 'inst-001',
        studentId: 'stud-dup-01',
        feeStructureId: 'struct-dup-01',
        academicYear: '2026-2027',
        term: 'annual',
      };

      // First allocation
      const req1 = createJsonRequest('https://thaiba.edu/api/finance/fees/allocations', 'POST', allocationPayload);
      const res1 = await (postAllocation as any)(req1, mockSession);
      expect(res1.status).toBe(201);

      // Attempt second allocation
      const req2 = createJsonRequest('https://thaiba.edu/api/finance/fees/allocations', 'POST', allocationPayload);
      const res2 = await (postAllocation as any)(req2, mockSession);
      const data2 = await res2.json();

      expect(res2.status).toBe(409);
      expect(data2.error).toContain('already allocated to this student for academic year');
    });

    it('lists allocations filtered by studentId', async () => {
      const store = FeeDbStore.getInstance();
      await store.createAllocation({
        id: 'alloc-filter-1',
        institutionId: 'inst-001',
        studentId: 'stud-filter-target',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 50000,
        concessionAmount: 0,
        netPayableAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
        status: 'unpaid',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/allocations?institutionId=inst-001&studentId=stud-filter-target', 'GET');
      const res = await (getAllocations as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.allocations.length).toBe(1);
      expect(data.allocations[0].studentId).toBe('stud-filter-target');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Counter Payment Workflow — Shift Validation & Overpayment Guards
  // --------------------------------------------------------------------------
  describe('5. Counter Payment Workflow — Shift Validation & Overpayment Guards', () => {
    it('opens and closes counter shift successfully', async () => {
      const openReq = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', {
        action: 'open',
        institutionId: 'inst-001',
        counterName: 'Counter Desk A',
        openingFloat: 5000,
      });

      const openRes = await (postCounter as any)(openReq, mockSession);
      const openData = await openRes.json();

      expect(openRes.status).toBe(201);
      expect(openData.success).toBe(true);
      expect(openData.register.status).toBe('open');

      const closeReq = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', {
        action: 'close',
        shiftId: openData.register.id,
        closingCashDeclared: 5000,
      });

      const closeRes = await (postCounter as any)(closeReq, mockSession);
      const closeData = await closeRes.json();

      expect(closeRes.status).toBe(200);
      expect(closeData.success).toBe(true);
      expect(closeData.summary).toBeDefined();
      expect(closeData.summary.register.status).toBe('closed');
    });

    it('rejects counter payment when shift does not exist', async () => {
      const store = FeeDbStore.getInstance();
      const allocation = await store.createAllocation({
        id: 'alloc-shift-check',
        institutionId: 'inst-001',
        studentId: 'stud-shift-check',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 10000,
        concessionAmount: 0,
        netPayableAmount: 10000,
        paidAmount: 0,
        balanceAmount: 10000,
        status: 'unpaid',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const payReq = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', {
        action: 'record_payment',
        shiftId: 'non_existent_shift',
        studentId: allocation.studentId,
        allocationId: allocation.id,
        amount: 5000,
        paymentMethod: 'cash',
        payerName: 'Parent A',
      });

      const res = await (postCounter as any)(payReq, mockSession);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toContain('Counter shift not found or already closed');
    });

    it('rejects counter payment when allocation does not exist (404 Not Found)', async () => {
      const store = FeeDbStore.getInstance();
      const engine = new CounterRegisterEngine(store);
      const shift = await engine.openShift('inst-001', 'staff-01', 'Counter 1', 1000);

      const payReq = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', {
        action: 'record_payment',
        shiftId: shift.id,
        studentId: 'stud-001',
        allocationId: 'alloc-missing-99',
        amount: 2000,
        paymentMethod: 'cash',
        payerName: 'Parent B',
      });

      const res = await (postCounter as any)(payReq, mockSession);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Fee allocation not found');
    });

    it('rejects counter payment when student does not match allocation (400)', async () => {
      const store = FeeDbStore.getInstance();
      const engine = new CounterRegisterEngine(store);
      const shift = await engine.openShift('inst-001', 'staff-01', 'Counter 2', 1000);

      const allocation = await store.createAllocation({
        id: 'alloc-mismatch-1',
        institutionId: 'inst-001',
        studentId: 'stud-real-owner',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 10000,
        concessionAmount: 0,
        netPayableAmount: 10000,
        paidAmount: 0,
        balanceAmount: 10000,
        status: 'unpaid',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const payReq = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', {
        action: 'record_payment',
        shiftId: shift.id,
        studentId: 'stud-imposter',
        allocationId: allocation.id,
        amount: 5000,
        paymentMethod: 'cash',
        payerName: 'Imposter',
      });

      const res = await (postCounter as any)(payReq, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Student does not match the fee allocation');
    });

    it('rejects counter payment overpayment exceeding balanceAmount (400 Bad Request)', async () => {
      const store = FeeDbStore.getInstance();
      const engine = new CounterRegisterEngine(store);
      const shift = await engine.openShift('inst-001', 'staff-01', 'Counter 3', 1000);

      const allocation = await store.createAllocation({
        id: 'alloc-balance-check',
        institutionId: 'inst-001',
        studentId: 'stud-balance-target',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 10000,
        concessionAmount: 0,
        netPayableAmount: 10000,
        paidAmount: 8000,
        balanceAmount: 2000,
        status: 'partial',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const payReq = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', {
        action: 'record_payment',
        shiftId: shift.id,
        studentId: allocation.studentId,
        allocationId: allocation.id,
        amount: 3000, // Exceeds balance of 2000
        paymentMethod: 'cash',
        payerName: 'Parent Balance',
      });

      const res = await (postCounter as any)(payReq, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Amount exceeds outstanding balance');
    });

    it('processes counter payment successfully and updates shift and allocation (201 Created)', async () => {
      const store = FeeDbStore.getInstance();
      const engine = new CounterRegisterEngine(store);
      const shift = await engine.openShift('inst-001', 'staff-01', 'Counter 4', 1000);

      const allocation = await store.createAllocation({
        id: 'alloc-success-01',
        institutionId: 'inst-001',
        studentId: 'stud-success-01',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 10000,
        concessionAmount: 0,
        netPayableAmount: 10000,
        paidAmount: 0,
        balanceAmount: 10000,
        status: 'unpaid',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const payReq = createJsonRequest('https://thaiba.edu/api/finance/fees/counter', 'POST', {
        action: 'record_payment',
        shiftId: shift.id,
        studentId: allocation.studentId,
        allocationId: allocation.id,
        amount: 4000,
        paymentMethod: 'cash',
        payerName: 'Parent Success',
      });

      const res = await (postCounter as any)(payReq, mockSession);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.payment.amount).toBe(4000);
      expect(data.payment.paymentMethod).toBe('cash');

      // Check allocation updated
      const updatedAlloc = await store.getAllocationById(allocation.id);
      expect(updatedAlloc?.paidAmount).toBe(4000);
      expect(updatedAlloc?.balanceAmount).toBe(6000);
      expect(updatedAlloc?.status).toBe('partial');
    });
  });

  // --------------------------------------------------------------------------
  // 6. Online Checkout & Payment Gateway Integration
  // --------------------------------------------------------------------------
  describe('6. Online Checkout & Payment Gateway Integration', () => {
    it('returns 404 when allocationId is not found', async () => {
      const checkoutPayload = {
        allocationId: 'alloc-non-existent',
        amount: 5000,
        paymentMethod: 'razorpay',
        payerEmail: 'student@thaiba.edu',
      };

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/checkout', 'POST', checkoutPayload);
      const res = await (postCheckout as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Fee allocation not found');
    });

    it('rejects checkout with 400 when amount exceeds allocation balance', async () => {
      const store = FeeDbStore.getInstance();
      const allocation = await store.createAllocation({
        id: 'alloc-checkout-balance',
        institutionId: 'inst-001',
        studentId: 'stud-checkout-target',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 20000,
        concessionAmount: 0,
        netPayableAmount: 20000,
        paidAmount: 15000,
        balanceAmount: 5000,
        status: 'partial',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const checkoutPayload = {
        allocationId: allocation.id,
        amount: 8000, // Exceeds balance of 5000
        paymentMethod: 'razorpay',
        payerEmail: 'student@thaiba.edu',
      };

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/checkout', 'POST', checkoutPayload);
      const res = await (postCheckout as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain('Amount exceeds outstanding balance');
    });

    it('creates online checkout order successfully (200 OK)', async () => {
      const store = FeeDbStore.getInstance();
      const allocation = await store.createAllocation({
        id: 'alloc-checkout-success',
        institutionId: 'inst-001',
        studentId: 'stud-checkout-ok',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 25000,
        concessionAmount: 0,
        netPayableAmount: 25000,
        paidAmount: 0,
        balanceAmount: 25000,
        status: 'unpaid',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const checkoutPayload = {
        allocationId: allocation.id,
        amount: 10000,
        paymentMethod: 'razorpay',
        payerEmail: 'student@thaiba.edu',
      };

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/checkout', 'POST', checkoutPayload);
      const res = await (postCheckout as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.order).toBeDefined();
      expect(data.order.amount).toBe(10000);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Receipts Issuance & Cryptographic Hash Verification
  // --------------------------------------------------------------------------
  describe('7. Receipts Issuance & Cryptographic Hash Verification', () => {
    it('POST /api/finance/fees/receipts returns 404 when payment does not exist', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/receipts', 'POST', {
        paymentId: 'non_existent_pay_id',
        studentName: 'Student Name',
      });

      const res = await (postReceipt as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(404);
      expect(data.error).toBe('Payment record not found');
    });

    it('issues receipt for a valid payment and verifies cryptographic hash', async () => {
      const store = FeeDbStore.getInstance();
      const payment = await store.recordPayment({
        id: 'pay-receipt-test-01',
        paymentNumber: 'RCPT-TEST-001',
        institutionId: 'inst-001',
        allocationId: 'alloc-01',
        studentId: 'stud-01',
        amount: 15000,
        fineAmount: 0,
        discountAmount: 0,
        netAmount: 15000,
        currency: 'INR',
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        receiptNumber: 'RCPT-TEST-001',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Generate receipt
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/receipts', 'POST', {
        paymentId: payment.id,
        studentName: 'Aisha Rahman',
        studentRollNumber: 'CS-2026-042',
        programGrade: 'B.Tech AI',
        academicYear: '2026-2027',
      });

      const res = await (postReceipt as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.receipt.receiptHash).toBeDefined();
      expect(data.receipt.signature).toBeDefined();

      const receiptHash = data.receipt.receiptHash;

      // Lookup receipt via authenticated receipts endpoint by hash
      const getReq = createJsonRequest(`https://thaiba.edu/api/finance/fees/receipts?hash=${receiptHash}`, 'GET');
      const getRes = await (getReceipts as any)(getReq, mockSession);
      const getData = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getData.receipt.receiptHash).toBe(receiptHash);

      // Verify receipt via public verify endpoint
      const verifyReq = createJsonRequest(`https://thaiba.edu/api/finance/fees/verify/${receiptHash}`, 'GET');
      const verifyRes = await (getVerifyReceipt as any)(verifyReq, {
        params: Promise.resolve({ hash: receiptHash }),
      });
      const verifyData = await verifyRes.json();

      expect(verifyRes.status).toBe(200);
      expect(verifyData.status).toBe('VERIFIED_FEE_RECEIPT');
      expect(verifyData.receiptHash).toBe(receiptHash);
    });

    it('public verify/[hash] returns 404 for unknown hash', async () => {
      const verifyReq = createJsonRequest('https://thaiba.edu/api/finance/fees/verify/unknown-hash-12345', 'GET');
      const verifyRes = await (getVerifyReceipt as any)(verifyReq, {
        params: Promise.resolve({ hash: 'unknown-hash-12345' }),
      });
      const verifyData = await verifyRes.json();

      expect(verifyRes.status).toBe(404);
      expect(verifyData.status).toBe('INVALID_OR_NOT_FOUND');
    });

    it('public verify/[hash] returns 400 for empty hash', async () => {
      const verifyReq = createJsonRequest('https://thaiba.edu/api/finance/fees/verify/%20', 'GET');
      const verifyRes = await (getVerifyReceipt as any)(verifyReq, {
        params: Promise.resolve({ hash: '  ' }),
      });
      const verifyData = await verifyRes.json();

      expect(verifyRes.status).toBe(400);
      expect(verifyData.error).toBe('Fee receipt hash is required');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Scholarships & Concessions
  // --------------------------------------------------------------------------
  describe('8. Scholarships & Concessions', () => {
    it('fails with 400 on invalid concession application payload', async () => {
      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/scholarships', 'POST', {
        action: 'apply',
        studentId: '', // Invalid empty studentId
      });

      const res = await (postScholarship as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toBe('Validation failed');
    });

    it('applies for scholarship concession and retrieves concession list', async () => {
      const store = FeeDbStore.getInstance();
      await store.createFeeStructure({
        id: 'struct-1',
        institutionId: 'inst-001',
        name: 'General Structure',
        code: 'GEN-01',
        academicYear: '2026-2027',
        term: 'annual',
        quota: 'general',
        residentialType: 'day_scholar',
        totalAmount: 50000,
        currency: 'INR',
        isActive: true,
        components: [
          {
            id: 'comp-gen-01',
            feeStructureId: 'struct-1',
            name: 'Tuition Fee',
            componentType: 'tuition',
            amount: 50000,
            isMandatory: true,
            isRefundable: false,
            taxRatePercent: 0,
            glAccountCode: 'GL-100',
            createdAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await store.createScholarship({
        id: 'sch-merit-academic',
        institutionId: 'inst-001',
        name: 'Merit Academic Scholarship',
        code: 'SCH-MERIT-ACAD',
        category: 'merit',
        targetComponentType: 'tuition',
        discountType: 'percentage',
        discountValue: 10,
        totalBudget: 100000,
        disbursedAmount: 0,
        academicYear: '2026-2027',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await store.createAllocation({
        id: 'alloc-merit-01',
        institutionId: 'inst-001',
        studentId: 'stud-merit-01',
        feeStructureId: 'struct-1',
        academicYear: '2026-2027',
        baseAmount: 50000,
        concessionAmount: 0,
        netPayableAmount: 50000,
        paidAmount: 0,
        balanceAmount: 50000,
        status: 'unpaid',
        allocationDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const req = createJsonRequest('https://thaiba.edu/api/finance/fees/scholarships', 'POST', {
        action: 'apply',
        institutionId: 'inst-001',
        studentId: 'stud-merit-01',
        allocationId: 'alloc-merit-01',
        scholarshipId: 'sch-merit-academic',
        amount: 5000,
        reason: 'Top 1% Academic Distinction Merit Scholarship',
      });

      const res = await (postScholarship as any)(req, mockSession);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.concession.studentId).toBe('stud-merit-01');

      // Fetch concessions list
      const getReq = createJsonRequest('https://thaiba.edu/api/finance/fees/scholarships?institutionId=inst-001&type=concessions', 'GET');
      const getRes = await (getScholarships as any)(getReq, mockSession);
      const getData = await getRes.json();

      expect(getRes.status).toBe(200);
      expect(getData.concessions.length).toBeGreaterThanOrEqual(1);
    });
  });
});
