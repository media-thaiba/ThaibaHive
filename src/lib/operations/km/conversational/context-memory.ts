export interface DialogueTurn {
  turnId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class ContextMemory {
  private sessions: Map<string, DialogueTurn[]> = new Map();
  private maxTurnsPerSession = 20;

  public addTurn(sessionId: string, turn: Omit<DialogueTurn, 'turnId' | 'timestamp'>): DialogueTurn {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }

    const turns = this.sessions.get(sessionId)!;
    const fullTurn: DialogueTurn = {
      ...turn,
      turnId: `turn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    turns.push(fullTurn);

    // Sliding window eviction if exceeding max turns
    if (turns.length > this.maxTurnsPerSession) {
      turns.splice(0, turns.length - this.maxTurnsPerSession);
    }

    return fullTurn;
  }

  public getHistory(sessionId: string): DialogueTurn[] {
    return this.sessions.get(sessionId) || [];
  }

  public clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export const contextMemory = new ContextMemory();
