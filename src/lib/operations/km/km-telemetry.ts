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

  public trackQuery(_topic: string, _status: 'success' | 'fallback' | 'error', _durationSec: number, _tenantId = 'global'): void {
    incrementCounter('km_queries_total');
  }

  public trackHybridRetrievalLatency(_category: string, latencySec: number): void {
    incrementCounter('km_hybrid_retrieval_latency_seconds', latencySec);
  }

  public trackTokenUsage(tokens: number, _model = 'text-embedding-3-small', _tenantId = 'global'): void {
    incrementCounter('km_copilot_token_usage_total', tokens);
  }

  public trackDegreeAudit(_programCode: string, _isEligible: boolean): void {
    incrementCounter('km_degree_audits_total');
  }

  public updateDeflectionRate(deflectionRateRatio: number, _tenantId = 'global'): void {
    setGauge('km_deflection_rate_gauge', Math.max(0, Math.min(1.0, deflectionRateRatio)));
  }

  public syncActiveWebSocketConnections(_institutionId = 'global'): void {
    const activeCount = wsClientManager.getActiveConnectionsCount();
    setGauge('km_active_websocket_connections_gauge', activeCount);
  }
}

export const kmTelemetry = KmTelemetry.getInstance();
