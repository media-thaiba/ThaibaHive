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
  FeeQuota,
  AllocationStatus,
  InstallmentStatus,
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

  // ─── Fee Structure Operations ───

  public async createFeeStructure(structure: FeeStructureItem): Promise<FeeStructureItem> {
    this.memoryStore.structures.set(structure.id, { ...structure });
    if (structure.components) {
      for (const comp of structure.components) {
        this.memoryStore.components.set(comp.id, { ...comp, feeStructureId: structure.id });
      }
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
    return updated;
  }

  public async updateInstallment(id: string, updates: Partial<FeeInstallmentItem>): Promise<FeeInstallmentItem | null> {
    const existing = this.memoryStore.installments.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    this.memoryStore.installments.set(id, updated);
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
    return scholarship;
  }

  public async listScholarships(institutionId: string, academicYear?: string): Promise<FeeScholarshipItem[]> {
    return Array.from(this.memoryStore.scholarships.values()).filter(
      (s) => s.institutionId === institutionId && (!academicYear || s.academicYear === academicYear)
    );
  }

  public async createConcession(concession: FeeConcessionItem): Promise<FeeConcessionItem> {
    this.memoryStore.concessions.set(concession.id, { ...concession });
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
    return log;
  }

  public async listAuditLogs(institutionId: string, entityId?: string): Promise<FeeAuditLogItem[]> {
    return Array.from(this.memoryStore.auditLogs.values()).filter(
      (a) => a.institutionId === institutionId && (!entityId || a.entityId === entityId)
    );
  }
}
