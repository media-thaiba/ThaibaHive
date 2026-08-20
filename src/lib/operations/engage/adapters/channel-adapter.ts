import { ChannelType, OutboundDispatchPayload, DispatchResult } from '../engage-types';

export interface ChannelAdapter {
  readonly channel: ChannelType;
  readonly providerName: string;
  send(payload: OutboundDispatchPayload): Promise<DispatchResult>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number }>;
}
