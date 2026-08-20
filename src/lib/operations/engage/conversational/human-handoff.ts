import { EngageDbStore } from '../../../db/engage-store';

export interface EscalationTicket {
  ticketId: string;
  sessionId: string;
  stakeholderId: string;
  intent: string;
  sentimentScore: number;
  reason: string;
  createdAt: string;
}

export class HumanHandoffManager {
  private static instance: HumanHandoffManager;
  private store: EngageDbStore;
  private pendingQueue: Map<string, EscalationTicket> = new Map();

  private constructor() {
    this.store = EngageDbStore.getInstance();
  }

  public static getInstance(): HumanHandoffManager {
    if (!HumanHandoffManager.instance) {
      HumanHandoffManager.instance = new HumanHandoffManager();
    }
    return HumanHandoffManager.instance;
  }

  public async escalateSession(
    sessionId: string,
    stakeholderId: string,
    reason: string,
    sentimentScore = 0,
    institutionId = 'global'
  ): Promise<EscalationTicket> {
    const ticketId = `tkt_esc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const ticket: EscalationTicket = {
      ticketId,
      sessionId,
      stakeholderId,
      intent: 'human_agent_request',
      sentimentScore,
      reason,
      createdAt: new Date().toISOString(),
    };

    this.pendingQueue.set(ticketId, ticket);

    await this.store.saveChatSessionAsync({
      sessionId,
      stakeholderId,
      status: 'agent_pending',
      lastInteractionAt: new Date().toISOString(),
      institutionId,
    });

    return ticket;
  }

  public async assignAgent(
    ticketId: string,
    agentId: string,
    institutionId = 'global'
  ): Promise<boolean> {
    const ticket = this.pendingQueue.get(ticketId);
    if (!ticket) return false;

    this.pendingQueue.delete(ticketId);

    await this.store.saveChatSessionAsync({
      sessionId: ticket.sessionId,
      status: 'agent_active',
      assignedAgentId: agentId,
      lastInteractionAt: new Date().toISOString(),
      institutionId,
    });

    // Record agent joined message
    await this.store.saveChatMessageAsync({
      messageId: `cmsg_agent_join_${Date.now()}`,
      sessionId: ticket.sessionId,
      senderType: 'system',
      text: `Staff advisor (ID: ${agentId}) has joined the conversation.`,
      institutionId,
    });

    return true;
  }

  public getPendingQueue(): EscalationTicket[] {
    return Array.from(this.pendingQueue.values());
  }
}
