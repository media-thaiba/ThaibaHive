import {
  incrementCounter,
  setGauge,
  observeHistogram,
} from '../../metrics/registry';
import { ChannelType, MessagePriority } from './engage-types';

export class EngageTelemetry {
  private static instance: EngageTelemetry;

  public static getInstance(): EngageTelemetry {
    if (!EngageTelemetry.instance) {
      EngageTelemetry.instance = new EngageTelemetry();
    }
    return EngageTelemetry.instance;
  }

  public recordDispatch(_channel: ChannelType, _priority: MessagePriority = 'standard', durationSeconds = 0.05): void {
    incrementCounter('engage_dispatches_total', 1);
    observeHistogram('engage_dispatch_duration_seconds', durationSeconds);
  }

  public recordFailure(_channel: ChannelType, _provider: string): void {
    incrementCounter('engage_delivery_failures_total', 1);
  }

  public recordCost(costUsd: number): void {
    incrementCounter('engage_channel_cost_usd_total', costUsd);
  }

  public recordChatSession(deflected = true): void {
    incrementCounter('engage_chatbot_sessions_total', 1);
    const deflectionRate = deflected ? 0.85 : 0.40;
    setGauge('engage_chatbot_deflection_rate', deflectionRate);
  }

  public recordWorkflowExecution(): void {
    incrementCounter('engage_workflow_executions_total', 1);
  }

  public setActiveCampaigns(count: number): void {
    setGauge('engage_active_campaigns_gauge', count);
  }
}
