/**
 * Prometheus OpenMetrics Supply Chain Exporter
 * SUPPLY-HIVE / ProcurementOS (Sprint-054)
 */

export interface SupplyPrometheusMetricEntry {
  name: string;
  type: 'gauge' | 'counter';
  help: string;
  labels: Record<string, string>;
  value: number;
}

export class SupplyMetricsExporter {
  private static instance: SupplyMetricsExporter;
  private metrics: Map<string, SupplyPrometheusMetricEntry> = new Map();

  public static getInstance(): SupplyMetricsExporter {
    if (!SupplyMetricsExporter.instance) {
      SupplyMetricsExporter.instance = new SupplyMetricsExporter();
    }
    return SupplyMetricsExporter.instance;
  }

  public setMetric(
    name: string,
    type: 'gauge' | 'counter',
    help: string,
    labels: Record<string, string>,
    value: number
  ): void {
    const labelKey = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const key = `${name}{${labelKey}}`;

    this.metrics.set(key, {
      name,
      type,
      help,
      labels,
      value,
    });
  }

  public incrementCounter(
    name: string,
    help: string,
    labels: Record<string, string>,
    delta = 1
  ): void {
    const labelKey = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    const key = `${name}{${labelKey}}`;

    const existing = this.metrics.get(key);
    const newVal = (existing?.value || 0) + delta;
    this.setMetric(name, 'counter', help, labels, newVal);
  }

  public exportMetricsText(): string {
    const lines: string[] = [
      '# HELP supply_po_created_total Total count of purchase orders issued',
      '# TYPE supply_po_created_total counter',
      '# HELP supply_po_value_usd_total Cumulative dollar value of purchase orders issued',
      '# TYPE supply_po_value_usd_total counter',
      '# HELP supply_invoices_matched_total Total count of 3-way matched clean invoices',
      '# TYPE supply_invoices_matched_total counter',
      '# HELP supply_discrepancies_flagged_total Total count of flagged invoice discrepancies',
      '# TYPE supply_discrepancies_flagged_total counter',
      '# HELP supply_spend_encumbered_usd Total current dollar value of encumbered funds',
      '# TYPE supply_spend_encumbered_usd gauge',
      '# HELP supply_vendor_risk_score_avg Average risk score across active vendors',
      '# TYPE supply_vendor_risk_score_avg gauge',
      '# HELP supply_esg_rating_avg Average ESG composite score across active vendors',
      '# TYPE supply_esg_rating_avg gauge',
      '# HELP supply_reorder_triggers_total Total count of predictive inventory reorders triggered',
      '# TYPE supply_reorder_triggers_total counter',
      '# HELP supply_contract_milestones_due_total Total count of contract milestones currently due',
      '# TYPE supply_contract_milestones_due_total gauge',
      '# HELP supply_savings_achieved_usd Cumulative procurement cost savings achieved',
      '# TYPE supply_savings_achieved_usd counter',
    ];

    for (const [key, metric] of this.metrics.entries()) {
      lines.push(`${key} ${metric.value}`);
    }

    return lines.join('\n') + '\n';
  }
}
