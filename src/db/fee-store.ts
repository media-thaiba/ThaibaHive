import { db } from '@thaiba/db';
import {
  feeStructures,
  feeStructureComponents,
  feeStudentAllocations,
  feeInstallments,
  feePayments,
  feePaymentTransactions,
  feeReceipts,
  feeScholarships,
  feeConcessions,
  feeCounterRegisters,
  feeDefaulterLogs,
  feeReconciliationBatches,
  feeAuditLogs,
} from '@thaiba/db/schema';
import { eq } from 'drizzle-orm';
import {
  FeeStructureItem,
  FeeStructureComponentItem,
  FeeStudentAllocationItem,
  FeeInstallmentItem,
  FeePaymentItem,
  FeePaymentTransactionItem,
  FeeReceiptItem,
  FeeScholarshipItem,
  FeeConcessionItem,
  FeeCounterRegisterItem,
  FeeDefaulterLogItem,
  FeeReconciliationBatchItem,
  FeeAuditLogItem,
  AllocationStatus,
  PaymentStatus,
  CounterStatus,
  ConcessionStatus,
} from '../lib/operations/finance/types';

export interface InMemoryFeeStore {
  structures: Map<string, FeeStructureItem>;
  components: Map<string, FeeStructureComponentItem>;
  allocations: Map<string, FeeStudentAllocationItem>;
  installments: Map<string, FeeInstallmentItem>;
  payments: Map<string, FeePaymentItem>;
  paymentTransactions: Map<string, FeePaymentTransactionItem>;
  receipts: Map<string, FeeReceiptItem>;
  scholarships: Map<string, FeeScholarshipItem>;
  concessions: Map<string, FeeConcessionItem>;
  counterRegisters: Map<string, FeeCounterRegisterItem>;
  defaulterLogs: Map<string, FeeDefaulterLogItem>;
  reconciliationBatches: Map<string, FeeReconciliationBatchItem>;
  auditLogs: Map<string, FeeAuditLogItem>;
}

export class FeeDbStore {
  private static instance: FeeDbStore;
  private memoryStore: InMemoryFeeStore = {
    structures: new Map(),
    components: new Map(),
    allocations: new Map(),
    installments: new Map(),
    payments: new Map(),
    paymentTransactions: new Map(),
    receipts: new Map(),
    scholarships: new Map(),
    concessions: new Map(),
    counterRegisters: new Map(),
    defaulterLogs: new Map(),
    reconciliationBatches: new Map(),
    auditLogs: new Map(),
  };

  public static getInstance(): FeeDbStore {
    if (!FeeDbStore.instance) {
      FeeDbStore.instance = new FeeDbStore();
    }
    return FeeDbStore.instance;
  }

  public clearMemoryStore(): void {
    this.memoryStore.structures.clear();
    this.memoryStore.components.clear();
    this.memoryStore.allocations.clear();
    this.memoryStore.installments.clear();
    this.memoryStore.payments.clear();
    this.memoryStore.paymentTransactions.clear();
    this.memoryStore.receipts.clear();
    this.memoryStore.scholarships.clear();
    this.memoryStore.concessions.clear();
    this.memoryStore.counterRegisters.clear();
    this.memoryStore.defaulterLogs.clear();
    this.memoryStore.reconciliationBatches.clear();
    this.memoryStore.auditLogs.clear();
  }

  private handlePersistenceError(operation: string, entityId: string, err: unknown): void {
    console.warn(`[FeeDbStore] Database write-through fallback during ${operation} for ${entityId}:`, err);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[FeeDbStore] Failed to persist ${operation} (${entityId}): ${String(err)}`);
    }
  }

  // ─── Fee Structure Operations ───

  public async createFeeStructure(structure: FeeStructureItem): Promise<FeeStructureItem> {
    this.memoryStore.structures.set(structure.id, { ...structure });
    if (structure.components) {
      for (const comp of structure.components) {
        this.memoryStore.components.set(comp.id, { ...comp, feeStructureId: structure.id });
      }
    }

    try {
      if (db) {
        await db.insert(feeStructures).values({
          id: structure.id,
          institutionId: structure.institutionId,
          name: structure.name,
          code: structure.code,
          academicYear: structure.academicYear,
          programId: structure.programId || null,
          gradeLevel: structure.gradeLevel || null,
          term: structure.term || 'annual',
          quota: structure.quota || 'general',
          residentialType: structure.residentialType || 'day_scholar',
          currency: structure.currency || 'INR',
          totalAmount: structure.totalAmount || 0,
          isActive: structure.isActive ?? true,
          createdAt: structure.createdAt || new Date().toISOString(),
          updatedAt: structure.updatedAt || new Date().toISOString(),
        }).onConflictDoUpdate({
          target: feeStructures.id,
          set: {
            name: structure.name,
            totalAmount: structure.totalAmount || 0,
            isActive: structure.isActive ?? true,
            updatedAt: new Date().toISOString(),
          },
        });

        if (structure.components) {
          for (const comp of structure.components) {
            await db.insert(feeStructureComponents).values({
              id: comp.id,
              feeStructureId: structure.id,
              name: comp.name,
              componentType: comp.componentType || 'tuition',
              amount: comp.amount || 0,
              isMandatory: comp.isMandatory ?? true,
              isRefundable: comp.isRefundable ?? false,
              taxRatePercent: comp.taxRatePercent || 0,
              glAccountCode: comp.glAccountCode || 'GL:4100-FEE_REVENUE',
              createdAt: comp.createdAt || new Date().toISOString(),
            }).onConflictDoNothing();
          }
        }
      }
    } catch (err) {
      this.handlePersistenceError('createFeeStructure', structure.id, err);
    }

    return structure;
  }

  public async getFeeStructureById(id: string, institutionId?: string): Promise<FeeStructureItem | null> {
    const struct = this.memoryStore.structures.get(id);
    if (!struct) return null;
    if (institutionId && struct.institutionId !== institutionId && struct.institutionId !== 'global') {
      return null;
    }
    const comps = Array.from(this.memoryStore.components.values()).filter(
      (c) => c.feeStructureId === id
    );
    return { ...struct, components: comps };
  }

  public async listFeeStructures(institutionId: string, academicYear?: string): Promise<FeeStructureItem[]> {
    return Array.from(this.memoryStore.structures.values())
      .filter((s) => (s.institutionId === institutionId || s.institutionId === 'global') && (!academicYear || s.academicYear === academicYear))
      .map((s) => ({
        ...s,
        components: Array.from(this.memoryStore.components.values()).filter((c) => c.feeStructureId === s.id),
      }));
  }

  // ─── Student Allocation Operations ───

  public async createAllocation(allocation: FeeStudentAllocationItem): Promise<FeeStudentAllocationItem> {
    this.memoryStore.allocations.set(allocation.id, { ...allocation });
    if (allocation.installments) {
      for (const inst of allocation.installments) {
        this.memoryStore.installments.set(inst.id, { ...inst, allocationId: allocation.id });
      }
    }

    try {
      if (db) {
        await db.insert(feeStudentAllocations).values({
          id: allocation.id,
          institutionId: allocation.institutionId,
          studentId: allocation.studentId,
          feeStructureId: allocation.feeStructureId,
          academicYear: allocation.academicYear,
          baseAmount: allocation.baseAmount || 0,
          concessionAmount: allocation.concessionAmount || 0,
          netPayableAmount: allocation.netPayableAmount || 0,
          paidAmount: allocation.paidAmount || 0,
          balanceAmount: allocation.balanceAmount || 0,
          status: allocation.status || 'unpaid',
          allocationDate: allocation.allocationDate || new Date().toISOString(),
          dueDate: allocation.dueDate || null,
          remarks: allocation.remarks || null,
          createdAt: allocation.createdAt || new Date().toISOString(),
          updatedAt: allocation.updatedAt || new Date().toISOString(),
        }).onConflictDoUpdate({
          target: feeStudentAllocations.id,
          set: {
            concessionAmount: allocation.concessionAmount || 0,
            netPayableAmount: allocation.netPayableAmount || 0,
            paidAmount: allocation.paidAmount || 0,
            balanceAmount: allocation.balanceAmount || 0,
            status: allocation.status || 'unpaid',
            updatedAt: new Date().toISOString(),
          },
        });

        if (allocation.installments) {
          for (const inst of allocation.installments) {
            await db.insert(feeInstallments).values({
              id: inst.id,
              allocationId: allocation.id,
              installmentNumber: inst.installmentNumber || 1,
              title: inst.title,
              dueDate: inst.dueDate,
              gracePeriodDays: inst.gracePeriodDays ?? 7,
              amount: inst.amount || 0,
              paidAmount: inst.paidAmount || 0,
              balanceAmount: inst.balanceAmount || 0,
              fineAmount: inst.fineAmount || 0,
              fineWaivedAmount: inst.fineWaivedAmount || 0,
              status: inst.status || 'pending',
              lastPaymentDate: inst.lastPaymentDate || null,
              createdAt: inst.createdAt || new Date().toISOString(),
              updatedAt: inst.updatedAt || new Date().toISOString(),
            }).onConflictDoNothing();
          }
        }
      }
    } catch (err) {
      this.handlePersistenceError('createAllocation', allocation.id, err);
    }

    return allocation;
  }

  public async getAllocationById(id: string, institutionId?: string): Promise<FeeStudentAllocationItem | null> {
    const alloc = this.memoryStore.allocations.get(id);
    if (!alloc) return null;
    if (institutionId && alloc.institutionId !== institutionId) {
      return null;
    }
    const insts = Array.from(this.memoryStore.installments.values())
      .filter((i) => i.allocationId === id)
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
    return { ...alloc, installments: insts };
  }

  public async listAllocationsByStudent(studentId: string, institutionId?: string): Promise<FeeStudentAllocationItem[]> {
    return Array.from(this.memoryStore.allocations.values())
      .filter((a) => a.studentId === studentId && (!institutionId || a.institutionId === institutionId))
      .map((a) => ({
        ...a,
        installments: Array.from(this.memoryStore.installments.values())
          .filter((i) => i.allocationId === a.id)
          .sort((x, y) => x.installmentNumber - y.installmentNumber),
      }));
  }

  public async listAllocations(institutionId: string, status?: AllocationStatus): Promise<FeeStudentAllocationItem[]> {
    return Array.from(this.memoryStore.allocations.values())
      .filter((a) => a.institutionId === institutionId && (!status || a.status === status))
      .map((a) => ({
        ...a,
        installments: Array.from(this.memoryStore.installments.values())
          .filter((i) => i.allocationId === a.id)
          .sort((x, y) => x.installmentNumber - y.installmentNumber),
      }));
  }

  public async updateAllocation(id: string, updates: Partial<FeeStudentAllocationItem>): Promise<FeeStudentAllocationItem | null> {
    const existing = this.memoryStore.allocations.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.memoryStore.allocations.set(id, updated);

    try {
      if (db) {
        await db.update(feeStudentAllocations).set({
          concessionAmount: updated.concessionAmount,
          netPayableAmount: updated.netPayableAmount,
          paidAmount: updated.paidAmount,
          balanceAmount: updated.balanceAmount,
          status: updated.status,
          dueDate: updated.dueDate,
          remarks: updated.remarks,
          updatedAt: updated.updatedAt,
        }).where(eq(feeStudentAllocations.id, id));
      }
    } catch (err) {
      this.handlePersistenceError('updateAllocation', id, err);
    }

    return updated;
  }

  public async updateInstallment(id: string, updates: Partial<FeeInstallmentItem>): Promise<FeeInstallmentItem | null> {
    const existing = this.memoryStore.installments.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.memoryStore.installments.set(id, updated);

    try {
      if (db) {
        await db.update(feeInstallments).set({
          paidAmount: updated.paidAmount,
          balanceAmount: updated.balanceAmount,
          fineAmount: updated.fineAmount,
          fineWaivedAmount: updated.fineWaivedAmount,
          status: updated.status,
          lastPaymentDate: updated.lastPaymentDate,
          updatedAt: updated.updatedAt,
        }).where(eq(feeInstallments.id, id));
      }
    } catch (err) {
      this.handlePersistenceError('updateInstallment', id, err);
    }

    return updated;
  }

  // ─── Payment & Receipt Operations ───

  public async recordPayment(payment: FeePaymentItem, transactions?: FeePaymentTransactionItem[]): Promise<FeePaymentItem> {
    this.memoryStore.payments.set(payment.id, { ...payment });
    if (transactions) {
      for (const tx of transactions) {
        this.memoryStore.paymentTransactions.set(tx.id, { ...tx, paymentId: payment.id });
      }
    }

    try {
      if (db) {
        await db.insert(feePayments).values({
          id: payment.id,
          paymentNumber: payment.paymentNumber,
          institutionId: payment.institutionId,
          allocationId: payment.allocationId,
          studentId: payment.studentId,
          amount: payment.amount || 0,
          fineAmount: payment.fineAmount || 0,
          discountAmount: payment.discountAmount || 0,
          netAmount: payment.netAmount || 0,
          currency: payment.currency || 'INR',
          paymentMethod: payment.paymentMethod,
          paymentStatus: payment.paymentStatus || 'completed',
          gatewayOrderId: payment.gatewayOrderId || null,
          gatewayPaymentId: payment.gatewayPaymentId || null,
          transactionReference: payment.transactionReference || null,
          counterRegisterId: payment.counterRegisterId || null,
          payerName: payment.payerName || null,
          payerPhone: payment.payerPhone || null,
          payerEmail: payment.payerEmail || null,
          receiptNumber: payment.receiptNumber || null,
          paidAt: payment.paidAt || new Date().toISOString(),
          createdAt: payment.createdAt || new Date().toISOString(),
          updatedAt: payment.updatedAt || new Date().toISOString(),
        }).onConflictDoUpdate({
          target: feePayments.id,
          set: {
            paymentStatus: payment.paymentStatus || 'completed',
            gatewayPaymentId: payment.gatewayPaymentId || null,
            transactionReference: payment.transactionReference || null,
            receiptNumber: payment.receiptNumber || null,
            updatedAt: new Date().toISOString(),
          },
        });

        if (transactions) {
          for (const tx of transactions) {
            await db.insert(feePaymentTransactions).values({
              id: tx.id,
              paymentId: payment.id,
              installmentId: tx.installmentId || null,
              componentId: tx.componentId || null,
              allocatedAmount: tx.allocatedAmount || 0,
              glDebitAccount: tx.glDebitAccount || 'GL:1100-BANK_CASH',
              glCreditAccount: tx.glCreditAccount || 'GL:1200-FEE_RECEIVABLE',
              createdAt: tx.createdAt || new Date().toISOString(),
            }).onConflictDoNothing();
          }
        }
      }
    } catch (err) {
      this.handlePersistenceError('recordPayment', payment.id, err);
    }

    return payment;
  }

  public async getPaymentById(id: string, institutionId?: string): Promise<FeePaymentItem | null> {
    const pay = this.memoryStore.payments.get(id);
    if (!pay) return null;
    if (institutionId && pay.institutionId !== institutionId) {
      return null;
    }
    const txs = Array.from(this.memoryStore.paymentTransactions.values()).filter((t) => t.paymentId === id);
    return { ...pay, transactions: txs };
  }

  public async getPaymentByNumber(paymentNumber: string, institutionId?: string): Promise<FeePaymentItem | null> {
    for (const pay of this.memoryStore.payments.values()) {
      if (pay.paymentNumber === paymentNumber) {
        if (!institutionId || pay.institutionId === institutionId) {
          const txs = Array.from(this.memoryStore.paymentTransactions.values()).filter((t) => t.paymentId === pay.id);
          return { ...pay, transactions: txs };
        }
      }
    }
    return null;
  }

  public async listPayments(institutionId: string, studentId?: string, status?: PaymentStatus): Promise<FeePaymentItem[]> {
    return Array.from(this.memoryStore.payments.values())
      .filter((p) => p.institutionId === institutionId && (!studentId || p.studentId === studentId) && (!status || p.paymentStatus === status))
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }

  public async createReceipt(receipt: FeeReceiptItem): Promise<FeeReceiptItem> {
    this.memoryStore.receipts.set(receipt.id, { ...receipt });

    try {
      if (db) {
        await db.insert(feeReceipts).values({
          id: receipt.id,
          receiptNumber: receipt.receiptNumber,
          institutionId: receipt.institutionId,
          paymentId: receipt.paymentId,
          studentId: receipt.studentId,
          docGeneratedRecordId: receipt.docGeneratedRecordId || null,
          receiptHash: receipt.receiptHash,
          signature: receipt.signature,
          qrPayload: receipt.qrPayload,
          receiptHtml: receipt.receiptHtml || null,
          receiptPdfUrl: receipt.receiptPdfUrl || null,
          downloadCount: receipt.downloadCount || 0,
          issuedAt: receipt.issuedAt || new Date().toISOString(),
          createdAt: receipt.createdAt || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (err) {
      this.handlePersistenceError('createReceipt', receipt.id, err);
    }

    return receipt;
  }

  public async getReceiptByHash(receiptHash: string): Promise<FeeReceiptItem | null> {
    for (const rcpt of this.memoryStore.receipts.values()) {
      if (rcpt.receiptHash === receiptHash) {
        return rcpt;
      }
    }
    return null;
  }

  public async getReceiptByPaymentId(paymentId: string): Promise<FeeReceiptItem | null> {
    for (const rcpt of this.memoryStore.receipts.values()) {
      if (rcpt.paymentId === paymentId) {
        return rcpt;
      }
    }
    return null;
  }

  // ─── Scholarship & Concession Operations ───

  public async createScholarship(scholarship: FeeScholarshipItem): Promise<FeeScholarshipItem> {
    this.memoryStore.scholarships.set(scholarship.id, { ...scholarship });

    try {
      if (db) {
        await db.insert(feeScholarships).values({
          id: scholarship.id,
          institutionId: scholarship.institutionId,
          name: scholarship.name,
          code: scholarship.code,
          category: scholarship.category || 'merit',
          discountType: scholarship.discountType || 'percentage',
          discountValue: scholarship.discountValue || 0,
          targetComponentType: scholarship.targetComponentType || 'tuition',
          totalBudget: scholarship.totalBudget || 0,
          disbursedAmount: scholarship.disbursedAmount || 0,
          academicYear: scholarship.academicYear,
          isActive: scholarship.isActive ?? true,
          createdAt: scholarship.createdAt || new Date().toISOString(),
          updatedAt: scholarship.updatedAt || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (err) {
      this.handlePersistenceError('createScholarship', scholarship.id, err);
    }

    return scholarship;
  }

  public async listScholarships(institutionId: string, academicYear?: string): Promise<FeeScholarshipItem[]> {
    return Array.from(this.memoryStore.scholarships.values()).filter(
      (s) => s.institutionId === institutionId && (!academicYear || s.academicYear === academicYear)
    );
  }

  public async createConcession(concession: FeeConcessionItem): Promise<FeeConcessionItem> {
    this.memoryStore.concessions.set(concession.id, { ...concession });

    try {
      if (db) {
        await db.insert(feeConcessions).values({
          id: concession.id,
          institutionId: concession.institutionId,
          studentId: concession.studentId,
          scholarshipId: concession.scholarshipId || null,
          allocationId: concession.allocationId,
          amount: concession.amount || 0,
          reason: concession.reason,
          supportingDocUrl: concession.supportingDocUrl || null,
          status: concession.status || 'pending',
          appliedById: concession.appliedById,
          approvedById: concession.approvedById || null,
          decisionNotes: concession.decisionNotes || null,
          decisionDate: concession.decisionDate || null,
          createdAt: concession.createdAt || new Date().toISOString(),
          updatedAt: concession.updatedAt || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (err) {
      this.handlePersistenceError('createConcession', concession.id, err);
    }

    return concession;
  }

  public async updateConcessionStatus(
    id: string,
    status: ConcessionStatus,
    approvedById?: string,
    decisionNotes?: string
  ): Promise<FeeConcessionItem | null> {
    const existing = this.memoryStore.concessions.get(id);
    if (!existing) return null;
    const updated: FeeConcessionItem = {
      ...existing,
      status,
      approvedById: approvedById || existing.approvedById,
      decisionNotes: decisionNotes || existing.decisionNotes,
      decisionDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.concessions.set(id, updated);

    try {
      if (db) {
        await db.update(feeConcessions).set({
          status: updated.status,
          approvedById: updated.approvedById,
          decisionNotes: updated.decisionNotes,
          decisionDate: updated.decisionDate,
          updatedAt: updated.updatedAt,
        }).where(eq(feeConcessions.id, id));
      }
    } catch (err) {
      this.handlePersistenceError('updateConcessionStatus', id, err);
    }

    return updated;
  }

  public async listConcessions(institutionId: string, studentId?: string, status?: ConcessionStatus): Promise<FeeConcessionItem[]> {
    return Array.from(this.memoryStore.concessions.values()).filter(
      (c) => c.institutionId === institutionId && (!studentId || c.studentId === studentId) && (!status || c.status === status)
    );
  }

  // ─── Counter Register Operations ───

  public async openCounterRegister(register: FeeCounterRegisterItem): Promise<FeeCounterRegisterItem> {
    this.memoryStore.counterRegisters.set(register.id, { ...register });

    try {
      if (db) {
        await db.insert(feeCounterRegisters).values({
          id: register.id,
          institutionId: register.institutionId,
          cashierId: register.cashierId,
          counterName: register.counterName,
          openingFloat: register.openingFloat || 0,
          closingCashDeclared: register.closingCashDeclared || null,
          systemCashTotal: register.systemCashTotal || 0,
          systemPosTotal: register.systemPosTotal || 0,
          systemChequeTotal: register.systemChequeTotal || 0,
          cashDropsTotal: register.cashDropsTotal || 0,
          varianceAmount: register.varianceAmount || 0,
          status: register.status || 'open',
          openedAt: register.openedAt || new Date().toISOString(),
          closedAt: register.closedAt || null,
          supervisorId: register.supervisorId || null,
          supervisorNotes: register.supervisorNotes || null,
          createdAt: register.createdAt || new Date().toISOString(),
          updatedAt: register.updatedAt || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (err) {
      this.handlePersistenceError('openCounterRegister', register.id, err);
    }

    return register;
  }

  public async closeCounterRegister(
    id: string,
    closingCashDeclared: number,
    supervisorId?: string,
    supervisorNotes?: string
  ): Promise<FeeCounterRegisterItem | null> {
    const existing = this.memoryStore.counterRegisters.get(id);
    if (!existing) return null;
    const variance = closingCashDeclared - (existing.openingFloat + existing.systemCashTotal - existing.cashDropsTotal);
    const updated: FeeCounterRegisterItem = {
      ...existing,
      closingCashDeclared,
      varianceAmount: variance,
      status: 'closed',
      closedAt: new Date().toISOString(),
      supervisorId: supervisorId || existing.supervisorId,
      supervisorNotes: supervisorNotes || existing.supervisorNotes,
      updatedAt: new Date().toISOString(),
    };
    this.memoryStore.counterRegisters.set(id, updated);

    try {
      if (db) {
        await db.update(feeCounterRegisters).set({
          closingCashDeclared: updated.closingCashDeclared,
          varianceAmount: updated.varianceAmount,
          status: updated.status,
          closedAt: updated.closedAt,
          supervisorId: updated.supervisorId,
          supervisorNotes: updated.supervisorNotes,
          updatedAt: updated.updatedAt,
        }).where(eq(feeCounterRegisters.id, id));
      }
    } catch (err) {
      this.handlePersistenceError('closeCounterRegister', id, err);
    }

    return updated;
  }

  public async getCounterRegisterById(id: string, institutionId?: string): Promise<FeeCounterRegisterItem | null> {
    const reg = this.memoryStore.counterRegisters.get(id);
    if (!reg) return null;
    if (institutionId && reg.institutionId !== institutionId) return null;
    return reg;
  }

  public async listCounterRegisters(institutionId: string, status?: CounterStatus): Promise<FeeCounterRegisterItem[]> {
    return Array.from(this.memoryStore.counterRegisters.values()).filter(
      (r) => r.institutionId === institutionId && (!status || r.status === status)
    );
  }

  // ─── Defaulter & Aging Operations ───

  public async logDefaulterAction(log: FeeDefaulterLogItem): Promise<FeeDefaulterLogItem> {
    this.memoryStore.defaulterLogs.set(log.id, { ...log });

    try {
      if (db) {
        await db.insert(feeDefaulterLogs).values({
          id: log.id,
          institutionId: log.institutionId,
          studentId: log.studentId,
          allocationId: log.allocationId,
          agingDays: log.agingDays || 0,
          agingBucket: log.agingBucket || 'current',
          overdueAmount: log.overdueAmount || 0,
          riskScore: log.riskScore || 0,
          actionTaken: log.actionTaken || 'reminder_sent',
          channel: log.channel || 'whatsapp',
          dispatchedAt: log.dispatchedAt || new Date().toISOString(),
          createdAt: log.createdAt || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (err) {
      this.handlePersistenceError('logDefaulterAction', log.id, err);
    }

    return log;
  }

  public async listDefaulterLogs(institutionId: string, studentId?: string): Promise<FeeDefaulterLogItem[]> {
    return Array.from(this.memoryStore.defaulterLogs.values()).filter(
      (d) => d.institutionId === institutionId && (!studentId || d.studentId === studentId)
    );
  }

  // ─── Reconciliation Operations ───

  public async createReconciliationBatch(batch: FeeReconciliationBatchItem): Promise<FeeReconciliationBatchItem> {
    this.memoryStore.reconciliationBatches.set(batch.id, { ...batch });

    try {
      if (db) {
        await db.insert(feeReconciliationBatches).values({
          id: batch.id,
          batchNumber: batch.batchNumber,
          institutionId: batch.institutionId,
          sourceType: batch.sourceType || 'bank_statement',
          statementDate: batch.statementDate,
          totalTransactions: batch.totalTransactions || 0,
          matchedTransactions: batch.matchedTransactions || 0,
          unmatchedTransactions: batch.unmatchedTransactions || 0,
          totalSettledAmount: batch.totalSettledAmount || 0,
          feeChargesAmount: batch.feeChargesAmount || 0,
          netPayoutAmount: batch.netPayoutAmount || 0,
          discrepancyAmount: batch.discrepancyAmount || 0,
          status: batch.status || 'in_progress',
          reconciledById: batch.reconciledById || null,
          reconciledAt: batch.reconciledAt || null,
          createdAt: batch.createdAt || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (err) {
      this.handlePersistenceError('createReconciliationBatch', batch.id, err);
    }

    return batch;
  }

  public async listReconciliationBatches(institutionId: string): Promise<FeeReconciliationBatchItem[]> {
    return Array.from(this.memoryStore.reconciliationBatches.values()).filter(
      (r) => r.institutionId === institutionId
    );
  }

  // ─── Audit Log Operations ───

  public async createAuditLog(log: FeeAuditLogItem): Promise<FeeAuditLogItem> {
    this.memoryStore.auditLogs.set(log.id, { ...log });

    try {
      if (db) {
        await db.insert(feeAuditLogs).values({
          id: log.id,
          auditId: log.auditId,
          institutionId: log.institutionId,
          actorId: log.actorId,
          actorRole: log.actorRole,
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          payloadHash: log.payloadHash,
          timestamp: log.timestamp || new Date().toISOString(),
          createdAt: log.createdAt || new Date().toISOString(),
        }).onConflictDoNothing();
      }
    } catch (err) {
      this.handlePersistenceError('createAuditLog', log.id, err);
    }

    return log;
  }

  public async listAuditLogs(institutionId: string, entityId?: string): Promise<FeeAuditLogItem[]> {
    return Array.from(this.memoryStore.auditLogs.values()).filter(
      (a) => a.institutionId === institutionId && (!entityId || a.entityId === entityId)
    );
  }
}
