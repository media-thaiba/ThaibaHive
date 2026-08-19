export interface ResourceCapability {
  id: string;
  name: string;
  capacity: number;
}
export interface NegotiationBid {
  agentId: string;
  sessionId: string;
  resourceId: string;
  bidAmount: number;
  timestamp: string;
  metadata?: any;
}
export interface NegotiationOutcome {
  sessionId: string;
  winnerId: string;
  allocation: any;
  finalPrice: number;
  timestamp: string;
}
export interface NegotiationSession {
  id: string;
  status: 'active' | 'completed' | 'timeout' | 'failed';
  resourceId: string;
  participants: string[];
  createdAt: string;
}