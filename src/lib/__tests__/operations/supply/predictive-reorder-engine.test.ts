import { PredictiveReorderEngine, InventoryItemStockState } from '../../../operations/supply/inventory/predictive-reorder-engine';
import { EoqCalculator } from '../../../operations/supply/inventory/eoq-calculator';

describe('PredictiveReorderEngine (SUPPLY-004)', () => {
  let engine: PredictiveReorderEngine;

  beforeEach(() => {
    engine = PredictiveReorderEngine.getInstance();
  });

  it('should calculate Wilson EOQ accurately', () => {
    // Annual Demand = 1200 units, Order Cost = $50, Holding Cost = $3/unit/year
    // EOQ = sqrt((2 * 1200 * 50) / 3) = sqrt(40000) = 200
    const eoq = EoqCalculator.calculateEoq({
      annualDemandUnits: 1200,
      orderCostUsd: 50,
      holdingCostPerUnitUsd: 3,
    });
    expect(eoq).toBe(200);
  });

  it('should trigger reorder when inventory drops below safety threshold', () => {
    const item: InventoryItemStockState = {
      itemSku: 'HVAC-FILT-MERV13',
      itemName: 'MERV 13 Air Filter 24x24',
      category: 'facilities_maintenance',
      unitPriceUsd: 25.0,
      currentStockOnHand: 10,
      stockInTransit: 0,
      dailyUsageRate: 3.0,
      leadTimeDays: 7,
      annualDemandUnits: 1095,
      orderCostUsd: 40.0,
      holdingCostPerUnitUsd: 2.0,
      targetDepartmentId: 'dept-facilities',
      budgetCode: 'BUDGET-FACILITIES-2026',
      sourceType: 'predictive_reorder',
    };

    const evaluation = engine.evaluateStockLevel(item);
    expect(evaluation.shouldReorder).toBe(true);
    expect(evaluation.suggestedOrderQuantity).toBeGreaterThan(50);

    const autoReq = engine.generateAutonomousRequisition(item, evaluation, 'inst-1');
    expect(autoReq).not.toBeNull();
    expect(autoReq?.sourceType).toBe('predictive_reorder');
    expect(autoReq?.title).toContain('Autonomous Restock: MERV 13 Air Filter');
  });

  it('should not reorder when stock on hand plus in transit is sufficient', () => {
    const item: InventoryItemStockState = {
      itemSku: 'GPU-CABLE-QSFP56',
      itemName: '200G InfiniBand Direct Attach Cable',
      category: 'hardware',
      unitPriceUsd: 120.0,
      currentStockOnHand: 50,
      stockInTransit: 20,
      dailyUsageRate: 1.0,
      leadTimeDays: 5,
      annualDemandUnits: 365,
      orderCostUsd: 60.0,
      holdingCostPerUnitUsd: 10.0,
      targetDepartmentId: 'dept-hpc',
      budgetCode: 'BUDGET-HPC-2026',
      sourceType: 'predictive_reorder',
    };

    const evaluation = engine.evaluateStockLevel(item);
    expect(evaluation.shouldReorder).toBe(false);
    expect(evaluation.suggestedOrderQuantity).toBe(0);
  });
});
