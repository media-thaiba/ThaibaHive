export interface FinancialTelemetryEvent {
  id: string;
  type: 'payment_received' | 'shift_opened' | 'shift_closed' | 'concession_approved' | 'webhook_alert';
  timestamp: string;
  institutionId: string;
  data: Record<string, any>;
}

export class FeeTelemetryManager {
  private static instance: FeeTelemetryManager;
  private listeners: Array<(event: FinancialTelemetryEvent) => void> = [];

  // OpenMetrics state counters
  public metrics = {
    collectionsTotal: 0,
    amountCollectedCents: 0,
    gatewayLatencyMs: 120,
    webhookSuccessRate: 1.0,
    agingOverdueTotal: 0,
    counterVarianceCents: 0,
    scholarshipDisbursedCents: 0,
    dlqPendingEvents: 0,
  };

  public static getInstance(): FeeTelemetryManager {
    if (!FeeTelemetryManager.instance) {
      FeeTelemetryManager.instance = new FeeTelemetryManager();
    }
    return FeeTelemetryManager.instance;
  }

  public subscribe(listener: (event: FinancialTelemetryEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public broadcastEvent(
    type: FinancialTelemetryEvent['type'],
    institutionId: string,
    data: Record<string, any>
  ): void {
    const event: FinancialTelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      timestamp: new Date().toISOString(),
      institutionId,
      data,
    };

    // Update internal counters
    if (type === 'payment_received' && data.amount) {
      this.metrics.collectionsTotal++;
      this.metrics.amountCollectedCents += Math.round(data.amount * 100);
    }
    if (type === 'concession_approved' && data.amount) {
      this.metrics.scholarshipDisbursedCents += Math.round(data.amount * 100);
    }

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // Suppress client disconnect errors
      }
    }
  }

  /**
   * Generates standard Prometheus OpenMetrics text format
   */
  public exportPrometheusMetrics(): string {
    return `# HELP thaiba_fee_collections_total Total number of fee payments processed
# TYPE thaiba_fee_collections_total counter
thaiba_fee_collections_total ${this.metrics.collectionsTotal}

# HELP thaiba_fee_amount_collected_cents Total gross fee revenue collected in subunits
# TYPE thaiba_fee_amount_collected_cents counter
thaiba_fee_amount_collected_cents ${this.metrics.amountCollectedCents}

# HELP thaiba_fee_gateway_latency_seconds Average payment gateway response time
# TYPE thaiba_fee_gateway_latency_seconds gauge
thaiba_fee_gateway_latency_seconds ${(this.metrics.gatewayLatencyMs / 1000).toFixed(4)}

# HELP thaiba_fee_webhook_success_rate Percentage of successfully verified webhooks
# TYPE thaiba_fee_webhook_success_rate gauge
thaiba_fee_webhook_success_rate ${this.metrics.webhookSuccessRate.toFixed(2)}

# HELP thaiba_fee_aging_overdue_total Total students currently in overdue aging buckets
# TYPE thaiba_fee_aging_overdue_total gauge
thaiba_fee_aging_overdue_total ${this.metrics.agingOverdueTotal}

# HELP thaiba_fee_counter_variance_cents Cashier shift reconciliation discrepancy
# TYPE thaiba_fee_counter_variance_cents gauge
thaiba_fee_counter_variance_cents ${this.metrics.counterVarianceCents}

# HELP thaiba_fee_scholarship_disbursed_cents Total scholarship concessions approved in subunits
# TYPE thaiba_fee_scholarship_disbursed_cents counter
thaiba_fee_scholarship_disbursed_cents ${this.metrics.scholarshipDisbursedCents}

# HELP thaiba_fee_dlq_pending_events Pending un-replayed webhook events in dead letter queue
# TYPE thaiba_fee_dlq_pending_events gauge
thaiba_fee_dlq_pending_events ${this.metrics.dlqPendingEvents}
`;
  }
}
