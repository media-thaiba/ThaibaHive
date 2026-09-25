import { PurchaseRequisitionDraft } from './inventory-types';
import { facilityStore } from '../../../db/facility-store';

export class ReorderAllocator {
  /**
   * Scans parts catalog and generates purchase requisition drafts for any items below reorderThreshold.
   */
  public static async scanAndGenerateRequisitions(institutionId: string = 'global'): Promise<PurchaseRequisitionDraft[]> {
    const parts = await facilityStore.listParts(institutionId);
    const requisitions: PurchaseRequisitionDraft[] = [];

    for (const part of parts) {
      const netAvailable = part.quantityOnHand - part.quantityReserved;
      if (netAvailable <= part.reorderThreshold) {
        const suggestedReorderQty = Math.max(10, part.targetStockLevel - netAvailable);
        const totalEstimatedCost = Number((suggestedReorderQty * part.unitCost).toFixed(2));

        requisitions.push({
          requisitionId: `REQ-${Date.now()}-${part.partNumber}`,
          partNumber: part.partNumber,
          partName: part.name,
          category: part.category,
          currentStock: part.quantityOnHand,
          reorderThreshold: part.reorderThreshold,
          suggestedReorderQuantity: suggestedReorderQty,
          unitCost: part.unitCost,
          totalEstimatedCost,
          supplierName: part.supplierName || 'Preferred OEM Distributor',
          estimatedLeadTimeDays: part.leadTimeDays || 3,
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return requisitions;
  }
}
