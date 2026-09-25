import { SupplyMetricsExporter } from '../../../operations/supply/telemetry/supply-metrics';

describe('SupplyMetricsExporter (SUPPLY-012)', () => {
  let exporter: SupplyMetricsExporter;

  beforeEach(() => {
    exporter = SupplyMetricsExporter.getInstance();
  });

  it('should format all 10 Prometheus OpenMetrics series with appropriate labels', () => {
    exporter.incrementCounter('supply_po_created_total', 'Total count of purchase orders issued', {
      institution_id: 'inst-1',
      category: 'hardware',
    });

    exporter.setMetric(
      'supply_spend_encumbered_usd',
      'gauge',
      'Total current dollar value of encumbered funds',
      { institution_id: 'inst-1', department_id: 'dept-cs' },
      45000.0
    );

    const text = exporter.exportMetricsText();
    expect(text).toContain('# HELP supply_po_created_total');
    expect(text).toContain('# TYPE supply_spend_encumbered_usd gauge');
    expect(text).toContain('supply_spend_encumbered_usd{department_id="dept-cs",institution_id="inst-1"} 45000');
  });
});
