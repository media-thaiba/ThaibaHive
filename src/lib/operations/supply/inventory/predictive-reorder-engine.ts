import { SupplyPurchaseRequisitionItem, RequisitionSourceType } from '../supply-types';
import { EoqCalculator, EoqParameters, ReorderPointParameters } from './eoq-calculator';

export interface InventoryItemStockState {
  itemSku: string;
  itemName: string;
  category: string;
  unitPriceUsd: number;
  currentStockOnHand: number;
  stockInTransit: number;
  dailyUsageRate: number;
  leadTimeDays: number;
  annualDemandUnits: number;
  orderCostUsd: number;
  holdingCostPerUnitUsd: number;
  targetDepartmentId: string;
  budgetCode: string;
  sourceType: RequisitionSourceType;
  sourceReferenceId?: string;
}

export interface ReorderTriggerEvaluation {
  itemSku: string;
  shouldReorder: boolean;
  effectiveStock: number;
  reorderPoint: number;
  suggestedOrderQuantity: number;
  estimatedCostUsd: number;
  reason: string;
}

export class PredictiveReorderEngine {
  private static instance: PredictiveReorderEngine;

  public static getInstance(): PredictiveReorderEngine {
    if (!PredictiveReorderEngine.instance) {
      PredictiveReorderEngine.instance = new PredictiveReorderEngine();
    }
    return PredictiveReorderEngine.instance;
  }

  public evaluateStockLevel(item: InventoryItemStockState): ReorderTriggerEvaluation {
    const rParams: ReorderPointParameters = {
      dailyUsageRate: item.dailyUsageRate,
      leadTimeDays: item.leadTimeDays,
      serviceLevelZScore: 1.96, // 97.5% reliability
    };
    const { reorderPoint } = EoqCalculator.calculateReorderPoint(rParams);
    const effectiveStock = item.currentStockOnHand + item.stockInTransit;

    if (effectiveStock <= reorderPoint) {
      const eoqParams: EoqParameters = {
        annualDemandUnits: item.annualDemandUnits,
        orderCostUsd: item.orderCostUsd,
        holdingCostPerUnitUsd: item.holdingCostPerUnitUsd,
      };
      const suggestedOrderQuantity = EoqCalculator.calculateEoq(eoqParams);
      const estimatedCostUsd = suggestedOrderQuantity * item.unitPriceUsd;

      return {
        itemSku: item.itemSku,
        shouldReorder: true,
        effectiveStock,
        reorderPoint,
        suggestedOrderQuantity,
        estimatedCostUsd,
        reason: `Effective stock (${effectiveStock}) fell below Reorder Point (${reorderPoint}). EOQ triggered replenishment.`,
      };
    }

    return {
      itemSku: item.itemSku,
      shouldReorder: false,
      effectiveStock,
      reorderPoint,
      suggestedOrderQuantity: 0,
      estimatedCostUsd: 0,
      reason: `Stock healthy (${effectiveStock} > ROP ${reorderPoint}). No reorder required.`,
    };
  }

  public generateAutonomousRequisition(
    item: InventoryItemStockState,
    evaluation: ReorderTriggerEvaluation,
    institutionId = 'global'
  ): SupplyPurchaseRequisitionItem | null {
    if (!evaluation.shouldReorder) {
      return null;
    }

    const reqId = `req-auto-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const reqNumber = `REQ-AUTO-${Date.now().toString().slice(-6)}`;

    return {
      id: reqId,
      requisitionNumber: reqNumber,
      departmentId: item.targetDepartmentId,
      requesterId: 'SYSTEM_PREDICTIVE_INVENTORY_DAEMON',
      sourceType: item.sourceType,
      sourceReferenceId: item.sourceReferenceId,
      title: `Autonomous Restock: ${item.itemName} (${evaluation.suggestedOrderQuantity} units)`,
      urgency: 'standard',
      estimatedTotalUsd: evaluation.estimatedCostUsd,
      budgetCode: item.budgetCode,
      currentApprovalTier: evaluation.estimatedCostUsd < 1000 ? 'auto' : 'hod',
      status: evaluation.estimatedCostUsd < 1000 ? 'approved' : 'pending_approval',
      notes: evaluation.reason,
      institutionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }
}
