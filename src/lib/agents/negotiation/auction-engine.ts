import { NegotiationBid, NegotiationOutcome } from './types';

const SWARM_NEGOTIATION_ENABLED = true;

export class AuctionEngine {
  async processFirstPriceAuction(bids: NegotiationBid[], reservePrice: number): Promise<NegotiationOutcome | null> {
    if (!SWARM_NEGOTIATION_ENABLED) return null;
    const validBids = bids.filter(b => b.bidAmount >= reservePrice);
    if (validBids.length === 0) return null;
    
    validBids.sort((a, b) => b.bidAmount - a.bidAmount);
    const winner = validBids[0];
    
    return {
      sessionId: winner.sessionId,
      winnerId: winner.agentId,
      allocation: { resourceId: winner.resourceId },
      finalPrice: winner.bidAmount,
      timestamp: new Date().toISOString()
    };
  }
  
  async processVickreyAuction(bids: NegotiationBid[], reservePrice: number): Promise<NegotiationOutcome | null> {
    if (!SWARM_NEGOTIATION_ENABLED) return null;
    const validBids = bids.filter(b => b.bidAmount >= reservePrice);
    if (validBids.length === 0) return null;
    
    validBids.sort((a, b) => b.bidAmount - a.bidAmount);
    const winner = validBids[0];
    const secondPrice = validBids.length > 1 ? validBids[1].bidAmount : reservePrice;
    
    return {
      sessionId: winner.sessionId,
      winnerId: winner.agentId,
      allocation: { resourceId: winner.resourceId },
      finalPrice: secondPrice,
      timestamp: new Date().toISOString()
    };
  }
}