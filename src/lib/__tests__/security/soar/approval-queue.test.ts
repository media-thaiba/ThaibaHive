import { approvalQueue } from '@/lib/security/soar/approval-queue';

describe('ApprovalQueue', () => {
  beforeEach(() => {
    approvalQueue.clear();
  });

  it('should enqueue and retrieve pending approval items', () => {
    const item = approvalQueue.enqueue(
      'exec-101',
      'pb-quarantine',
      'Subnet Quarantine',
      { type: 'SUBNET', value: '192.168.1.0/24' },
      75,
      { threat: 'ddos' }
    );

    expect(item.id).toMatch(/^appr_/);
    expect(item.status).toBe('PENDING');

    const pending = approvalQueue.getPendingApprovals();
    expect(pending).toHaveLength(1);
    expect(pending[0].execution_id).toBe('exec-101');
  });

  it('should resolve approval with APPROVED or REJECTED state', () => {
    const item = approvalQueue.enqueue(
      'exec-102',
      'pb-quarantine',
      'IP Quarantine',
      { type: 'IP', value: '1.2.3.4' },
      65,
      {}
    );

    const approved = approvalQueue.resolve(item.id, 'APPROVED', 'sec_admin_1', 'Verified malicious C2');
    expect(approved?.status).toBe('APPROVED');
    expect(approved?.resolved_by).toBe('sec_admin_1');
    expect(approved?.reason).toBe('Verified malicious C2');

    // Pending should now be empty
    expect(approvalQueue.getPendingApprovals()).toHaveLength(0);
    expect(approvalQueue.getApproval(item.id)?.status).toBe('APPROVED');
  });

  it('should auto-expire pending items past TTL', () => {
    const item = approvalQueue.enqueue(
      'exec-103',
      'pb-test',
      'Test',
      { type: 'IP', value: '1.1.1.1' },
      60,
      {},
      { ttlHours: -1 } // Already expired
    );

    const pending = approvalQueue.getPendingApprovals();
    expect(pending).toHaveLength(0);
    expect(approvalQueue.getApproval(item.id)?.status).toBe('EXPIRED');
  });
});
