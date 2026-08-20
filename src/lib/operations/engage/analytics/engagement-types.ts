import { ChannelType } from '../engage-types';

export interface EngagementFunnelStats {
  dispatched: number;
  delivered: number;
  opened: number;
  clicked: number;
  responded: number;
  deliveryRate: number;
  openRate: number;
  ctr: number;
}

export interface ChannelPerformance {
  channel: ChannelType;
  volume: number;
  deliveryRate: number;
  openRate: number;
  totalCostUsd: number;
}

export interface HourlyHeatmapCell {
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  hourOfDay: number; // 0 to 23
  interactionCount: number;
}

export interface EngagementOverview {
  funnel: EngagementFunnelStats;
  channelBreakdown: ChannelPerformance[];
  hourlyHeatmap: HourlyHeatmapCell[];
  averageSentimentScore: number;
}
