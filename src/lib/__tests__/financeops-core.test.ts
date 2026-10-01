import { TaxRateEngine } from "../finance/tax/tax-rate-engine";
import { PurchaseApprovalEngine } from "../finance/purchases/purchase-approval-engine";
import { PayrollEngine } from "../finance/payroll/payroll-engine";
import { ReconciliationEngine } from "../finance/reconciliation/reconciliation-engine";

// In-memory mock storage for DB operations
let mockJurisdictions: any[] = [];
let mockOverrides: any[] = [];
let mockTiers: any[] = [];
let mockPurchaseRequests: any[] = [];
let mockApprovalLogs: any[] = [];
let mockSalaryStructures: any[] = [];
let mockPayrollRecords: any[] = [];
let mockPayrollDeductions: any[] = [];
let mockTransactions: any[] = [];
let mockReconciliations: any[] = [];
let mockReconciliationItems: any[] = [];

jest.mock("@/db", () => {
  return {
    db: {
      select: () => ({
        from: (table: any) => ({
          where: (condition: any) => {
            let data: any[] = [];
            if (table === "tax_jurisdictions") data = mockJurisdictions;
            else if (table === "tax_rate_overrides") data = mockOverrides;
            else if (table === "purchase_approval_tiers") data = mockTiers;
            else if (table === "purchase_requests") data = mockPurchaseRequests;
            else if (table === "purchase_approval_logs") data = mockApprovalLogs;
            else if (table === "payroll_salary_structures") data = mockSalaryStructures;
            else if (table === "payroll_records") data = mockPayrollRecords;
            else if (table === "financial_transactions") {
              if (condition?.args?.some((arg: any) => arg?.b === "income")) {
                data = mockTransactions.filter((t) => t.type === "income");
              } else if (condition?.args?.some((arg: any) => arg?.b === "expense")) {
                data = mockTransactions.filter((t) => t.type === "expense");
              } else {
                data = mockTransactions;
              }
            }
            else if (table === "financial_reconciliations") data = mockReconciliations;
            else if (table === "financial_reconciliation_items") data = mockReconciliationItems;
            
            return {
              orderBy: () => data,
              all: () => data,
              then: (resolve: any) => resolve(data),
            };
          },
          orderBy: () => {
            if (table === "purchase_approval_tiers") return mockTiers;
            return [];
          },
          then: (resolve: any) => {
            if (table === "payroll_salary_structures") return resolve(mockSalaryStructures);
            return resolve([]);
          },
        }),
      }),
      insert: (table: any) => ({
        values: (vals: any) => {
          const arr = Array.isArray(vals) ? vals : [vals];
          if (table === "tax_jurisdictions") mockJurisdictions.push(...arr);
          else if (table === "tax_rate_overrides") mockOverrides.push(...arr);
          else if (table === "purchase_approval_tiers") mockTiers.push(...arr);
          else if (table === "purchase_requests") mockPurchaseRequests.push(...arr);
          else if (table === "purchase_approval_logs") mockApprovalLogs.push(...arr);
          else if (table === "payroll_salary_structures") mockSalaryStructures.push(...arr);
          else if (table === "payroll_records") mockPayrollRecords.push(...arr);
          else if (table === "payroll_deductions") mockPayrollDeductions.push(...arr);
          else if (table === "financial_reconciliations") mockReconciliations.push(...arr);
          else if (table === "financial_reconciliation_items") mockReconciliationItems.push(...arr);

          return {
            returning: () => arr,
            onConflictDoUpdate: () => ({
              returning: () => arr,
            }),
            get: () => arr[0],
            then: (resolve: any) => resolve(arr),
          };
        },
      }),
      update: (table: any) => ({
        set: (vals: any) => ({
          where: (_cond: any) => {
            let updated: any[] = [];
            if (table === "purchase_requests") {
              mockPurchaseRequests = mockPurchaseRequests.map((r) => ({ ...r, ...vals }));
              updated = mockPurchaseRequests;
            } else if (table === "payroll_records") {
              mockPayrollRecords = mockPayrollRecords.map((r) => ({ ...r, ...vals }));
              updated = mockPayrollRecords;
            } else if (table === "financial_reconciliations") {
              mockReconciliations = mockReconciliations.map((r) => ({ ...r, ...vals }));
              updated = mockReconciliations;
            } else if (table === "financial_reconciliation_items") {
              mockReconciliationItems = mockReconciliationItems.map((r) => ({ ...r, ...vals }));
              updated = mockReconciliationItems;
            }
            return {
              returning: () => updated,
              then: (resolve: any) => resolve(updated),
            };
          },
        }),
      }),
    },
    taxJurisdictions: "tax_jurisdictions",
    taxRateOverrides: "tax_rate_overrides",
    purchaseApprovalTiers: "purchase_approval_tiers",
    purchaseRequests: "purchase_requests",
    purchaseApprovalLogs: "purchase_approval_logs",
    payrollSalaryStructures: "payroll_salary_structures",
    payrollRecords: "payroll_records",
    payrollDeductions: "payroll_deductions",
    financialTransactions: "financial_transactions",
    financialReconciliations: "financial_reconciliations",
    financialReconciliationItems: "financial_reconciliation_items",
    eq: (a: any, b: any) => ({ a, b }),
    and: (...args: any[]) => ({ args }),
    or: (...args: any[]) => ({ args }),
    gte: (a: any, b: any) => ({ a, b }),
    lte: (a: any, b: any) => ({ a, b }),
    asc: (a: any) => ({ a }),
    desc: (a: any) => ({ a }),
    isNull: (a: any) => ({ a }),
  };
});

describe("Sprint-103: Finance Operations Consolidation Tests", () => {
  beforeEach(() => {
    mockJurisdictions = [];
    mockOverrides = [];
    mockTiers = [];
    mockPurchaseRequests = [];
    mockApprovalLogs = [];
    mockSalaryStructures = [];
    mockPayrollRecords = [];
    mockPayrollDeductions = [];
    mockTransactions = [];
    mockReconciliations = [];
    mockReconciliationItems = [];
  });

  describe("TaxRateEngine", () => {
    it("should compute default tax for jurisdiction and apply institution override", async () => {
      const engine = TaxRateEngine.getInstance();

      // 1. Create jurisdiction
      const jur = await engine.createJurisdiction({
        countryCode: "IN",
        regionCode: "KL",
        jurisdictionName: "Kerala GST",
        defaultTaxRate: 0.18,
        taxCode: "GST_18",
      });

      expect(jur.defaultTaxRate).toBe(0.18);
      expect(jur.taxCode).toBe("GST_18");

      // 2. Compute standard tax
      const standardCalc = await engine.calculateTax(1000, "inst-1", "general", jur.id);
      expect(standardCalc.taxRate).toBe(0.18);
      expect(standardCalc.taxAmount).toBe(180);
      expect(standardCalc.totalAmount).toBe(1180);
      expect(standardCalc.isOverrideApplied).toBe(false);

      // 3. Create exemption override for education tuition (0% rate)
      await engine.createOverride({
        institutionId: "inst-1",
        jurisdictionId: jur.id,
        category: "tuition",
        overrideRate: 0.0,
        exemptionReason: "Educational Exemption Section 12AA",
        effectiveFrom: "2026-01-01",
      });

      const overrideCalc = await engine.calculateTax(50000, "inst-1", "tuition", jur.id);
      expect(overrideCalc.taxRate).toBe(0.0);
      expect(overrideCalc.taxAmount).toBe(0);
      expect(overrideCalc.totalAmount).toBe(50000);
      expect(overrideCalc.isOverrideApplied).toBe(true);
      expect(overrideCalc.overrideReason).toBe("Educational Exemption Section 12AA");
    });
  });

  describe("PurchaseApprovalEngine", () => {
    it("should process multi-tier purchase approval and verify cryptographic Merkle chain", async () => {
      const engine = PurchaseApprovalEngine.getInstance();

      // 1. Setup tiers
      await engine.createTier({
        institutionId: "inst-1",
        tierLevel: 1,
        name: "HOD Approval",
        minAmount: 0,
        maxAmount: 10000,
        requiredRole: "hod",
      });

      await engine.createTier({
        institutionId: "inst-1",
        tierLevel: 2,
        name: "Principal Approval",
        minAmount: 10001,
        maxAmount: 100000,
        requiredRole: "principal",
      });

      // 2. Create purchase request
      mockPurchaseRequests.push({
        id: "req-1",
        institutionId: "inst-1",
        requesterId: "staff-1",
        itemName: "Lab Equipment",
        estimatedCost: 5000,
        status: "pending_hod",
      });

      // 3. Process HOD approval
      const approvalResult = await engine.processApproval({
        purchaseRequestId: "req-1",
        institutionId: "inst-1",
        approverId: "hod-1",
        approverRole: "hod",
        action: "approved",
        comments: "Budget approved for lab equipment",
      });

      expect(approvalResult.request.status).toBe("approved");
      expect(approvalResult.merkleAuditHash).toBeDefined();

      // 4. Verify Cryptographic Merkle Chain
      const verification = await engine.verifyAuditTrail("req-1");
      expect(verification.isValid).toBe(true);
      expect(verification.totalLogs).toBe(1);
    });

    it("should reject approval if unauthorized role attempts tier approval", async () => {
      const engine = PurchaseApprovalEngine.getInstance();

      mockTiers.push({
        id: "tier-1",
        institutionId: "inst-1",
        tierLevel: 1,
        minAmount: 0,
        maxAmount: 50000,
        requiredRole: "principal",
      });

      mockPurchaseRequests.push({
        id: "req-2",
        institutionId: "inst-1",
        estimatedCost: 25000,
        status: "pending_approval",
      });

      await expect(
        engine.processApproval({
          purchaseRequestId: "req-2",
          institutionId: "inst-1",
          approverId: "staff-99",
          approverRole: "staff",
          action: "approved",
        })
      ).rejects.toThrow("Role mismatch");
    });
  });

  describe("PayrollEngine", () => {
    it("should accurately compute gross earnings, statutory deductions, and net payable", () => {
      const engine = PayrollEngine.getInstance();

      const breakdown = engine.computeBreakdown({
        baseSalary: 60000,
        hraAllowance: 12000,
        daAllowance: 6000,
        specialAllowance: 2000,
        pfDeductionRate: 0.12,
      });

      expect(breakdown.grossEarnings).toBe(80000); // 60000 + 12000 + 6000 + 2000
      expect(breakdown.pfDeduction).toBe(7200);   // 60000 * 0.12
      expect(breakdown.professionalTax).toBe(200);
      expect(breakdown.incomeTax).toBe(8000);     // 80000 * 0.1
      expect(breakdown.totalDeductions).toBe(15400); // 7200 + 200 + 8000
      expect(breakdown.netPayable).toBe(64600);   // 80000 - 15400
    });

    it("should batch generate monthly payroll and disburse records", async () => {
      const engine = PayrollEngine.getInstance();

      mockSalaryStructures.push({
        id: "struct-1",
        institutionId: "inst-1",
        staffId: "staff-1",
        baseSalary: 50000,
        hraAllowance: 10000,
        daAllowance: 5000,
        specialAllowance: 0,
        pfDeductionRate: 0.12,
      });

      const records = await engine.generateMonthlyPayroll("inst-1", 2026, 10);
      expect(records.length).toBe(1);
      expect(records[0].status).toBe("draft");
      expect(records[0].auditHash).toBeDefined();

      const disbursed = await engine.updateRecordStatus(
        records[0].id,
        "disbursed",
        "admin-1",
        "NEFT-TX-20261001-9988"
      );

      expect(disbursed.status).toBe("disbursed");
      expect(disbursed.paymentReference).toBe("NEFT-TX-20261001-9988");
    });
  });

  describe("ReconciliationEngine", () => {
    it("should match transactions, compute variance, and classify reconciliation status", async () => {
      const engine = ReconciliationEngine.getInstance();

      // Income (fee collection): 100,000
      mockTransactions.push({
        id: "tx-fee-1",
        institutionId: "inst-1",
        type: "income",
        amount: 100000,
        transactionDate: "2026-10-01",
      });

      // Expense: 20,000
      mockTransactions.push({
        id: "tx-exp-1",
        institutionId: "inst-1",
        type: "expense",
        amount: 20000,
        transactionDate: "2026-10-01",
      });

      // Bank statement record: 80,000 net deposit
      const result = await engine.createReconciliationSession({
        institutionId: "inst-1",
        periodStart: "2026-10-01",
        periodEnd: "2026-10-31",
        bankStatementEntries: [
          {
            referenceId: "bank-stmt-1",
            transactionDate: "2026-10-01",
            amount: 100000,
            description: "Direct fee collection deposit",
          },
          {
            referenceId: "bank-stmt-2",
            transactionDate: "2026-10-01",
            amount: -20000,
            description: "Vendor payout wire",
          },
        ],
        notes: "Monthly October Reconciliation",
      });

      expect(result.session.totalFeeLedgerAmount).toBe(100000);
      expect(result.session.totalExpenseLedgerAmount).toBe(20000);
      expect(result.session.totalBankStatementAmount).toBe(80000);
      expect(result.session.unreconciledVariance).toBe(0);
      expect(result.session.status).toBe("reconciled");
    });
  });
});
