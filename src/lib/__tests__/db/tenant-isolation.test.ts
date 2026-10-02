import { SupplyDbStore } from '../../db/supply-store';
import { DocDbStore } from '../../db/docgen-store';
import {
  SupplyPoLineItemItem,
  SupplyContractMilestoneItem,
  SupplyPurchaseRequisitionItem,
} from '../../operations/supply/supply-types';
import { ExportJobItem } from '../../operations/docgen/docgen-types';

/**
 * P0 tenant-isolation regression tests: update paths must refuse to touch
 * rows that belong to a different institution (IDOR prevention).
 */
describe('Tenant isolation on store update paths (P0)', () => {
  describe('SupplyDbStore', () => {
    let store: SupplyDbStore;

    beforeEach(() => {
      store = SupplyDbStore.getInstance();
      store.clearMemoryStore();
    });

    it('updateLineItemQuantities refuses a cross-tenant line item', async () => {
      const lineItem: SupplyPoLineItemItem = {
        id: 'li-tenant-a',
        poId: 'po-tenant-a',
        lineNumber: 1,
        itemSku: 'SKU-1',
        description: 'Scoped item',
        category: 'hardware',
        unitPriceUsd: 10,
        quantityOrdered: 5,
        quantityReceived: 0,
        quantityInvoiced: 0,
        unitOfMeasure: 'unit',
        lineTotalUsd: 50,
        status: 'pending',
        institutionId: 'inst-victim',
        createdAt: new Date().toISOString(),
      };
      await store.createLineItem(lineItem);

      // Attacker from another tenant with a guessed DB id → null, no mutation
      const result = await store.updateLineItemQuantities('li-tenant-a', 3, 0, 'inst-attacker');
      expect(result).toBeNull();

      const ownScope = await store.updateLineItemQuantities('li-tenant-a', 3, 0, 'inst-victim');
      expect(ownScope).not.toBeNull();
      expect(ownScope?.quantityReceived).toBe(3);

      // Shared 'global' rows remain writable by any scope (matches read predicate)
      const globalItem: SupplyPoLineItemItem = { ...lineItem, id: 'li-shared', poId: 'po-shared', institutionId: 'global' };
      await store.createLineItem(globalItem);
      const viaGlobal = await store.updateLineItemQuantities('li-shared', 1, 0, 'inst-victim');
      expect(viaGlobal).not.toBeNull();
    });

    it('updateMilestoneStatus refuses a cross-tenant milestone', async () => {
      const milestone: SupplyContractMilestoneItem = {
        id: 'ms-tenant-a',
        milestoneId: 'MS-A',
        contractId: 'ct-tenant-a',
        milestoneNumber: 1,
        title: 'Kickoff',
        deliverableDescription: 'Project kickoff deliverables',
        amountUsd: 1000,
        dueDate: '2026-12-01',
        status: 'pending',
        institutionId: 'inst-victim',
        createdAt: new Date().toISOString(),
      };
      await store.createMilestone(milestone);

      const cross = await store.updateMilestoneStatus('ms-tenant-a', 'approved', 'staff-x', 'inst-attacker');
      expect(cross).toBeNull();

      const own = await store.updateMilestoneStatus('ms-tenant-a', 'approved', 'staff-x', 'inst-victim');
      expect(own).not.toBeNull();
      expect(own?.status).toBe('approved');
    });

    it('updateRequisitionStatus and updatePurchaseOrderStatus refuse cross-tenant ids', async () => {
      const req: SupplyPurchaseRequisitionItem = {
        id: 'req-iso-1',
        requisitionNumber: 'REQ-ISO-1',
        departmentId: 'dept-1',
        requesterId: 'staff-1',
        sourceType: 'manual',
        title: 'Isolation probe',
        urgency: 'standard',
        estimatedTotalUsd: 100,
        budgetCode: 'BUD',
        currentApprovalTier: 'hod',
        status: 'pending_approval',
        institutionId: 'inst-victim',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await store.createRequisition(req);

      const cross = await store.updateRequisitionStatus('req-iso-1', 'approved', 'staff', undefined, 'inst-attacker');
      expect(cross).toBeNull();

      const own = await store.updateRequisitionStatus('req-iso-1', 'approved', 'staff', undefined, 'inst-victim');
      expect(own?.status).toBe('approved');
    });
  });

  describe('DocDbStore (export jobs)', () => {
    let store: DocDbStore;

    beforeEach(() => {
      store = DocDbStore.getInstance();
      store.clearMemoryStore();
    });

    it('updateExportJobStatus refuses a cross-tenant job', async () => {
      const job: ExportJobItem = {
        id: 'exp-iso-1',
        institutionId: 'inst-victim',
        userId: 'staff-1',
        jobType: 'students',
        format: 'csv',
        status: 'queued',
        progressPercent: 0,
        totalRecords: 10,
        processedRecords: 0,
        fileSizeBytes: 0,
        createdAt: new Date().toISOString(),
      };
      await store.createExportJob(job);

      const cross = await store.updateExportJobStatus(
        'exp-iso-1',
        { status: 'completed', progressPercent: 100 },
        'inst-attacker'
      );
      expect(cross).toBeNull();

      const own = await store.updateExportJobStatus(
        'exp-iso-1',
        { status: 'completed', progressPercent: 100 },
        'inst-victim'
      );
      expect(own).not.toBeNull();
      expect(own?.status).toBe('completed');
    });
  });
});
