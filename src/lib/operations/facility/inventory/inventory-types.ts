import { PartCategory } from '../facility-types';

export interface PartReservationRequest {
  workOrderId: string;
  partNumber: string;
  quantity: number;
}

export interface PartReservationResult {
  success: boolean;
  partNumber: string;
  quantityReserved: number;
  availableStockRemaining: number;
  stockout: boolean;
  message: string;
}

export interface PurchaseRequisitionDraft {
  requisitionId: string;
  partNumber: string;
  partName: string;
  category: PartCategory;
  currentStock: number;
  reorderThreshold: number;
  suggestedReorderQuantity: number;
  unitCost: number;
  totalEstimatedCost: number;
  supplierName: string;
  estimatedLeadTimeDays: number;
  generatedAt: string;
}
