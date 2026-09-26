import { FeeDbStore } from '../../../../db/fee-store';
import { FeeConcessionItem } from '../types';
import * as crypto from 'crypto';

export class ScholarshipApprovalWorkflow {
  private store: FeeDbStore;

  constructor(store?: FeeDbStore) {
    this.store = store || FeeDbStore.getInstance();
  }

  /**
   * Approves a pending concession application and applies balance reduction
   */
  public async approveConcession(
    concessionId: string,
    approverId: string,
    decisionNotes: string = 'Approved by Financial Board'
  ): Promise<FeeConcessionItem> {
    const concession = await this.store['memoryStore']?.concessions.get(concessionId);
    if (!concession || concession.status !== 'pending') {
      throw new Error(`Concession ${concessionId} is not in pending status`);
    }

    const updated = await this.store.updateConcessionStatus(
      concessionId,
      'approved',
      approverId,
      decisionNotes
    );

    // Update Student Allocation & Installments
    const allocation = await this.store.getAllocationById(concession.allocationId);
    if (allocation) {
      const newConcessionTotal = allocation.concessionAmount + concession.amount;
      const newNetPayable = Math.max(0, allocation.baseAmount - newConcessionTotal);
      const newBalance = Math.max(0, newNetPayable - allocation.paidAmount);
      const newStatus = newBalance === 0 ? 'paid' : allocation.paidAmount > 0 ? 'partial' : 'unpaid';

      await this.store.updateAllocation(allocation.id, {
        concessionAmount: newConcessionTotal,
        netPayableAmount: newNetPayable,
        balanceAmount: newBalance,
        status: newStatus,
      });
    }

    // Update Scholarship disbursed amount
    if (concession.scholarshipId) {
      const scholarship = this.store['memoryStore']?.scholarships.get(concession.scholarshipId);
      if (scholarship) {
        scholarship.disbursedAmount += concession.amount;
        scholarship.updatedAt = new Date().toISOString();
      }
    }

    // Emit Audit Log
    const auditPayload = JSON.stringify({
      concessionId,
      amount: concession.amount,
      approverId,
      decisionNotes,
      status: 'approved',
    });
    await this.store.createAuditLog({
      id: `audit_${Date.now()}`,
      auditId: `AUD-CONC-${concessionId}`,
      institutionId: concession.institutionId,
      actorId: approverId,
      actorRole: 'admin',
      action: 'scholarship_approved',
      entityType: 'fee_concessions',
      entityId: concessionId,
      payloadHash: crypto.createHash('sha256').update(auditPayload).digest('hex'),
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    return updated!;
  }

  /**
   * Rejects a concession application
   */
  public async rejectConcession(
    concessionId: string,
    approverId: string,
    rejectionReason: string
  ): Promise<FeeConcessionItem> {
    const concession = await this.store['memoryStore']?.concessions.get(concessionId);
    if (!concession || concession.status !== 'pending') {
      throw new Error(`Concession ${concessionId} is not in pending status`);
    }

    const updated = await this.store.updateConcessionStatus(
      concessionId,
      'rejected',
      approverId,
      rejectionReason
    );

    return updated!;
  }
}
