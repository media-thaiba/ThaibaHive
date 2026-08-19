import { NegotiationBid, NegotiationOutcome, NegotiationSession } from './types';
import { AgentRegistry } from '../core/registry';

const SWARM_NEGOTIATION_ENABLED = process.env.SWARM_NEGOTIATION_ENABLED !== 'false';

/**
 * Sprint-020 NegotiationAgent — abstract base for all negotiation algorithm implementations.
 * Self-registers into the Sprint-019 AgentRegistry with role='negotiator'.
 */
export abstract class NegotiationAgent {
  public readonly id: string;
  public readonly role = 'negotiator';
  protected readonly version: string;

  constructor(id: string, version = '3.4.0') {
    this.id = id;
    this.version = version;
  }

  async initialize(): Promise<void> {
    if (!SWARM_NEGOTIATION_ENABLED) return;
    AgentRegistry.getInstance().register(this.id, this.role, this.version);
  }

  async shutdown(): Promise<void> {
    AgentRegistry.getInstance().unregister(this.id);
  }

  abstract propose(session: NegotiationSession): Promise<NegotiationBid>;
  abstract evaluate(bids: NegotiationBid[]): Promise<void>;
  abstract accept(outcome: NegotiationOutcome): Promise<void>;
  abstract reject(reason?: string): Promise<void>;
  abstract finalize(): Promise<void>;
}