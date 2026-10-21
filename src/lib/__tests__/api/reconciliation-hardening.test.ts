/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import { financialReconciliations, financialReconciliationItems, financialTransactions, institutions, staff, staffInstitutions } from "@/db/schema";
import { reconciliationEngine } from "@/lib/finance/reconciliation/reconciliation-engine";
import { financialReconciliationCreateSchema, financialReconciliationItemMatchSchema } from "@/lib/validation/schemas";
import { db } from "@/db";
import { eq } from "drizzle-orm";

// Test utilities
const createTestInstitution = async (id = "inst_test") => {
  await db.insert(institutions).values({
    id,
    name: "Test Institution",
    code: `TEST${Date.now()}`,
    type: "campus",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).onConflictDoNothing();
  return id;
};

const createTestStaff = async (institutionId: string, id = "staff_test") => {
  await db.insert(staff).values({
    id,
    email: `test-${Date.now()}@example.com`,
    employeeId: `EMP${Date.now()}`,
    firstName: "Test",
    lastName: "Staff",
    role: "accounts",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).onConflictDoNothing();
  await db.insert(staffInstitutions).values({
    id: `${id}_inst`,
    staffId: id,
    institutionId,
  }).onConflictDoNothing();
  return id;
};

const createTestTransaction = async (input: {
  institutionId: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  recordedById: string;
}) => {
  const id = `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(financialTransactions).values({
    id,
    institutionId: input.institutionId,
    type: input.type,
    category: input.type === "income" ? "fees" : "expense",
    amount: input.amount,
    transactionDate: input.date,
    recordedById: input.recordedById,
    notes: "Test transaction",
    createdAt: new Date().toISOString(),
  });
  return id;
};

const cleanup = async () => {
  await db.delete(financialReconciliationItems);
  await db.delete(financialReconciliations);
  await db.delete(financialTransactions);
  // Note: staff and institutions cleanup skipped to avoid FK constraint issues with other tables
  // Test isolation is maintained via unique IDs per test run
};

describe("Financial Reconciliation Hardening", () => {
  const institutionId = "inst_recon_test";
  const staffId = "staff_recon_test";

  beforeEach(async () => {
    await cleanup();
    await createTestInstitution(institutionId);
    await createTestStaff(institutionId, staffId);
  });

  afterEach(async () => {
    await cleanup();
  });

  describe("Validation Schemas", () => {
    it("should accept valid reconciliation create input", () => {
      const input = {
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-15", amount: 1000, description: "Salary deposit" },
        ],
        notes: "Monthly reconciliation",
      };
      const result = financialReconciliationCreateSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject periodEnd before periodStart", () => {
      const input = {
        institutionId,
        periodStart: "2024-01-31",
        periodEnd: "2024-01-01",
        bankStatementEntries: [],
      };
      const result = financialReconciliationCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("periodEnd");
      }
    });

    it("should reject malformed bank statement entries", () => {
      const input = {
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "", transactionDate: "2024-01-15", amount: 1000 }, // empty referenceId
        ],
      };
      const result = financialReconciliationCreateSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("should accept negative amounts in bank statement (refunds/chargebacks)", () => {
      const input = {
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-15", amount: -100 },
        ],
      };
      const result = financialReconciliationCreateSchema.safeParse(input);
      expect(result.success).toBe(true); // z.number().finite() allows negative
    });

    it("should accept valid item match input", () => {
      const input = {
        matchStatus: "matched" as const,
        matchedWithId: "BANK-001",
        varianceAmount: 0,
        resolutionNotes: "Auto-matched",
      };
      const result = financialReconciliationItemMatchSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("should reject invalid match status", () => {
      const input = {
        matchStatus: "invalid_status",
        varianceAmount: 0,
      };
      const result = financialReconciliationItemMatchSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("Reconciliation Engine - 3-Way Matching", () => {
    it("should create reconciliation session with fee, expense, and bank statement data", async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 5000, date: "2024-01-15", recordedById: staffId });
      await createTestTransaction({ institutionId, type: "expense", amount: 2000, date: "2024-01-20", recordedById: staffId });

      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-15", amount: 5000, description: "Fee deposit" },
          { referenceId: "BANK-002", transactionDate: "2024-01-20", amount: -2000, description: "Expense payment" }, // Negative for outflow
        ],
        notes: "Test reconciliation",
        reconciledById: staffId,
      });

      expect(result.session).toBeDefined();
      expect(result.session.institutionId).toBe(institutionId);
      expect(result.session.status).toBe("reconciled");
      expect(result.session.unreconciledVariance).toBe(0);
      expect(result.items.length).toBe(2);
    });

    it("should flag variance when bank statement does not match ledgers", async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 5000, date: "2024-01-15", recordedById: staffId });

      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-15", amount: 4000, description: "Partial deposit" },
        ],
        notes: "Variance test",
        reconciledById: staffId,
      });

      expect(result.session.status).toBe("flagged_variance");
      expect(result.session.unreconciledVariance).toBe(1000); // 5000 - 4000
    });

    it("should throw error when periodEnd is before periodStart", async () => {
      await expect(
        reconciliationEngine.createReconciliationSession({
          institutionId,
          periodStart: "2024-01-31",
          periodEnd: "2024-01-01",
        })
      ).rejects.toThrow("periodEnd must not be before periodStart");
    });

    it("should create unmatched items for unmatched bank entries", async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 5000, date: "2024-01-15", recordedById: staffId });

      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-10", amount: 1000, description: "Unknown deposit" },
        ],
      });

      const unmatchedItems = result.items.filter((i) => i.matchStatus === "unmatched");
      expect(unmatchedItems.length).toBeGreaterThan(0);
      expect(unmatchedItems.some((i) => i.sourceType === "bank_statement")).toBe(true);
    });

    it("should match expense claims with negative bank statement amounts", async () => {
      await createTestTransaction({ institutionId, type: "expense", amount: 2000, date: "2024-01-20", recordedById: staffId });

      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-20", amount: -2000, description: "Vendor payment" }, // Negative for outflow
        ],
      });

      const expenseItems = result.items.filter((i) => i.sourceType === "expense_claim");
      expect(expenseItems.length).toBe(1);
      expect(expenseItems[0].amount).toBe(-2000);
      expect(expenseItems[0].matchStatus).toBe("matched");
    });
  });

  describe("Manual Item Matching - State Invariants", () => {
    let reconciliationId: string;
    let itemId: string;

    beforeEach(async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 5000, date: "2024-01-15", recordedById: staffId });
      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-15", amount: 5000 },
        ],
      });
      reconciliationId = result.session.id;
      itemId = result.items[0].id;
    });

    it("should allow manual override of unmatched item to matched", async () => {
      // First create an unmatched item
      await createTestTransaction({ institutionId, type: "income", amount: 3000, date: "2024-01-10", recordedById: staffId });
      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [],
      });
      const unmatchedItemId = result.items.find((i) => i.matchStatus === "unmatched")?.id;

      if (unmatchedItemId) {
        const updated = await reconciliationEngine.manualMatchItem({
          itemId: unmatchedItemId,
          matchStatus: "manual_override",
          matchedWithId: "MANUAL-001",
          institutionId,
        });

        expect(updated).not.toBeNull();
        expect(updated!.matchStatus).toBe("manual_override");
        expect(updated!.matchedWithId).toBe("MANUAL-001");
      }
    });

    it("should allow variance resolution", async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 3000, date: "2024-01-10", recordedById: staffId });
      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [],
      });
      const unmatchedItemId = result.items.find((i) => i.matchStatus === "unmatched")?.id;

      if (unmatchedItemId) {
        const updated = await reconciliationEngine.manualMatchItem({
          itemId: unmatchedItemId,
          matchStatus: "variance",
          varianceAmount: 3000,
          resolutionNotes: "Pending investigation",
          institutionId,
        });

        expect(updated).not.toBeNull();
        expect(updated!.matchStatus).toBe("variance");
        expect(updated!.varianceAmount).toBe(3000);
      }
    });

    it("should reject manual match for item in different institution", async () => {
      const otherInst = await createTestInstitution("inst_other");
      const otherStaffId = await createTestStaff(otherInst, "staff_other");
      await createTestTransaction({ institutionId: otherInst, type: "income", amount: 1000, date: "2024-01-15", recordedById: otherStaffId });
      const otherResult = await reconciliationEngine.createReconciliationSession({
        institutionId: otherInst,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        reconciledById: otherStaffId,
      });
      const otherItemId = otherResult.items[0].id;

      const updated = await reconciliationEngine.manualMatchItem({
        itemId: otherItemId,
        matchStatus: "matched",
        institutionId, // Different institution
      });

      expect(updated).toBeNull();
    });

    it("should return null for non-existent item", async () => {
      const updated = await reconciliationEngine.manualMatchItem({
        itemId: "non-existent-id",
        matchStatus: "matched",
        institutionId,
      });
      expect(updated).toBeNull();
    });
  });

  describe("Reconciliation Retrieval", () => {
    it("should retrieve reconciliation with items", async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 5000, date: "2024-01-15", recordedById: staffId });
      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-15", amount: 5000 },
        ],
      });

      const retrieved = await reconciliationEngine.getReconciliation(result.session.id, institutionId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.session.id).toBe(result.session.id);
      expect(retrieved!.items.length).toBe(result.items.length);
    });

    it("should return null for reconciliation in different institution", async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 5000, date: "2024-01-15", recordedById: staffId });
      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
      });

      const otherInst = await createTestInstitution("inst_other_2");
      const retrieved = await reconciliationEngine.getReconciliation(result.session.id, otherInst);

      expect(retrieved).toBeNull();
    });
  });

  describe("Edge Cases & Error Handling", () => {
    it("should handle empty bank statement entries", async () => {
      await createTestTransaction({ institutionId, type: "income", amount: 5000, date: "2024-01-15", recordedById: staffId });

      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [],
      });

      expect(result.session.status).toBe("flagged_variance");
      expect(result.session.totalBankStatementAmount).toBe(0);
      expect(result.session.unreconciledVariance).toBe(5000);
    });

    it("should handle multiple transactions correctly", async () => {
      // Multiple income transactions
      await createTestTransaction({ institutionId, type: "income", amount: 1000, date: "2024-01-05", recordedById: staffId });
      await createTestTransaction({ institutionId, type: "income", amount: 2000, date: "2024-01-10", recordedById: staffId });
      await createTestTransaction({ institutionId, type: "income", amount: 3000, date: "2024-01-15", recordedById: staffId });
      await createTestTransaction({ institutionId, type: "expense", amount: 500, date: "2024-01-20", recordedById: staffId });

      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-05", amount: 1000 },
          { referenceId: "BANK-002", transactionDate: "2024-01-10", amount: 2000 },
          { referenceId: "BANK-003", transactionDate: "2024-01-15", amount: 3000 },
          { referenceId: "BANK-004", transactionDate: "2024-01-20", amount: -500 }, // Negative for expense
        ],
      });

      expect(result.session.totalFeeLedgerAmount).toBe(6000);
      expect(result.session.totalExpenseLedgerAmount).toBe(500);
      expect(result.session.totalBankStatementAmount).toBe(5500); // 1000 + 2000 + 3000 + (-500) = 5500
      expect(result.session.status).toBe("reconciled");
    });

    it("should not match expense with positive income bank entry by amount coincidence", async () => {
      await createTestTransaction({ institutionId, type: "expense", amount: 1000, date: "2024-01-15", recordedById: staffId });

      const result = await reconciliationEngine.createReconciliationSession({
        institutionId,
        periodStart: "2024-01-01",
        periodEnd: "2024-01-31",
        bankStatementEntries: [
          { referenceId: "BANK-001", transactionDate: "2024-01-15", amount: 1000 }, // Positive income amount
        ],
      });

      const expenseItems = result.items.filter((i) => i.sourceType === "expense_claim");
      // Expense item amount is -1000, bank entry is +1000
      // Matching logic: Math.abs(b.amount - -tx.amount) = Math.abs(1000 - (-1000)) = 2000 > 0.01, so NO match
      expect(expenseItems[0].matchStatus).toBe("unmatched");
    });
  });
});