import { SupplyMerkleAnchor } from '../../../operations/supply/security/supply-merkle-anchor';
import { ProcurementAuditVerifier } from '../../../operations/supply/security/procurement-audit-verifier';
import { SupplyDbStore } from '../../../db/supply-store';

describe('SupplyMerkleAnchor & AuditVerifier (SUPPLY-013)', () => {
  let store: SupplyDbStore;
  let anchor: SupplyMerkleAnchor;

  beforeEach(() => {
    store = SupplyDbStore.getInstance();
    store.clearMemoryStore();
    anchor = new SupplyMerkleAnchor(store);
  });

  it('should anchor procurement events into an unbroken SHA-256 Merkle chain', async () => {
    const log1 = await anchor.anchorEvent(
      'staff-1',
      'hod',
      'requisition_approved',
      'requisition',
      'req-001',
      { amount: 4500.0, budgetCode: 'BUDGET-CS' },
      'inst-audit-1'
    );
    expect(log1.prevMerkleRoot).toBe('GENESIS_SUPPLY_MERKLE_ROOT');
    expect(log1.merkleRoot).toBeDefined();

    const log2 = await anchor.anchorEvent(
      'staff-buyer',
      'admin',
      'po_issued',
      'purchase_order',
      'po-001',
      { poNumber: 'PO-001', vendor: 'Apex' },
      'inst-audit-1'
    );
    expect(log2.prevMerkleRoot).toBe(log1.merkleRoot);

    const verification = await ProcurementAuditVerifier.verifyChainIntegrity('inst-audit-1', store);
    expect(verification.isValid).toBe(true);
    expect(verification.unbrokenChain).toBe(true);
    expect(verification.totalLogsScanned).toBe(2);
    expect(verification.merkleHeadRoot).toBe(log2.merkleRoot);
  });
});
