import { incrementCounter, setGauge } from '@/lib/metrics/registry';
import { wsClientManager } from './streaming/ws-client-manager';

export class KmTelemetry {
  private static instance: KmTelemetry;

  public static getInstance(): KmTelemetry {
    if (!KmTelemetry.instance) {
      KmTelemetry.instance = new KmTelemetry();
    }
    return KmTelemetry.instance;
  }

  public trackQuery(topic: string, status: 'success' | 'fallback' | 'error', durationSec: number, tenantId = 'global'): void {
    incrementCounter('km_queries_total');
  }

  public trackHybridRetrievalLatency(category: string, latencySec: number): void {
    incrementCounter('km_hybrid_retrieval_latency_seconds', latencySec);
  }

  public trackTokenUsage(tokens: number, model = 'text-embedding-3-small', tenantId = 'global'): void {
    incrementCounter('km_copilot_token_usage_total', tokens);
  }

  public trackDegreeAudit(programCode: string, isEligible: boolean): void {
    incrementCounter('km_degree_audits_total');
  }

  public updateDeflectionRate(deflectionRateRatio: number, tenantId = 'global'): void {
    setGauge('km_deflection_rate_gauge', Math.max(0, Math.min(1.0, deflectionRateRatio)));
  }

  public syncActiveWebSocketConnections(institutionId = 'global'): void {
    const activeCount = wsClientManager.getActiveConnectionsCount();
    setGauge('km_active_websocket_connections_gauge', activeCount);
  }
}

export const kmTelemetry = KmTelemetry.getInstance();
