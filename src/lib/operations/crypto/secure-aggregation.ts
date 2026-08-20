import { MaskedClientPayload, SecAggSession } from './smpc-types';
import { MaskingVectorEngine } from './masking-vector-engine';
import { HomomorphicPrimitives } from './homomorphic-primitives';

/**
 * 4-Phase Secure Aggregation Protocol (SecAgg)
 */
export class SecureAggregationProtocol {
  private sessions: Map<string, SecAggSession> = new Map();

  /**
   * Phase 1: Initialize Session & Register Participants
   */
  public initSession(
    sessionId: string,
    modelId: string,
    roundNumber: number,
    participants: string[],
    threshold?: number
  ): SecAggSession {
    const t = threshold ?? Math.max(2, Math.floor(participants.length * 0.6));
    const session: SecAggSession = {
      sessionId,
      modelId,
      roundNumber,
      threshold: t,
      participants: [...participants],
      activePhase: 'KEY_EXCHANGE',
      receivedMaskedPayloads: new Map(),
      dropoutNodeIds: [],
      createdAt: new Date().toISOString(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Phase 2: Collect Masked Vector from Client Node
   */
  public submitMaskedVector(sessionId: string, payload: MaskedClientPayload): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`SecAgg session not found: ${sessionId}`);
    if (session.activePhase === 'AGGREGATED' || session.activePhase === 'FAILED') {
      throw new Error(`Cannot submit to session in phase: ${session.activePhase}`);
    }

    session.receivedMaskedPayloads.set(payload.nodeId, payload);
    session.activePhase = 'MASKED_COLLECTION';
    this.sessions.set(sessionId, session);
  }

  /**
   * Phase 3 & 4: Unmask Dropouts & Aggregate Vectors
   */
  public finalizeAggregation(sessionId: string): number[] {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`SecAgg session not found: ${sessionId}`);

    const receivedNodes = Array.from(session.receivedMaskedPayloads.keys());
    if (receivedNodes.length < session.threshold) {
      session.activePhase = 'FAILED';
      this.sessions.set(sessionId, session);
      throw new Error(`Insufficient active nodes (${receivedNodes.length}) below threshold (${session.threshold})`);
    }

    session.activePhase = 'UNMASKING';
    const dropouts = session.participants.filter((p) => !session.receivedMaskedPayloads.has(p));
    session.dropoutNodeIds = dropouts;

    // Sum all received masked vectors
    const maskedVectors = Array.from(session.receivedMaskedPayloads.values()).map((p) => p.maskedVector);
    const rawSum = HomomorphicPrimitives.addVectors(maskedVectors);
    const dim = rawSum.length;

    // Remove remaining pairwise masks of dropped nodes
    // For every pair (surviving_u, dropout_v), surviving_u added/subtracted pairMask(u, v) which was not cancelled
    const finalSum = [...rawSum];

    for (const survivingNode of receivedNodes) {
      for (const dropoutNode of dropouts) {
        const seed = MaskingVectorEngine.derivePairwiseSeed(survivingNode, dropoutNode, session.roundNumber);
        const pairMask = MaskingVectorEngine.generateMaskVector(seed, dim);

        if (survivingNode < dropoutNode) {
          // survivingNode added pairMask, so we subtract it
          for (let i = 0; i < dim; i++) {
            finalSum[i] -= pairMask[i];
          }
        } else {
          // survivingNode subtracted pairMask, so we add it
          for (let i = 0; i < dim; i++) {
            finalSum[i] += pairMask[i];
          }
        }
      }
    }

    // Average across participating surviving nodes
    const finalAveraged = HomomorphicPrimitives.scaleVector(finalSum, 1.0 / receivedNodes.length);
    session.finalAggregatedVector = finalAveraged;
    session.activePhase = 'AGGREGATED';
    this.sessions.set(sessionId, session);

    return finalAveraged;
  }

  public getSession(sessionId: string): SecAggSession | undefined {
    return this.sessions.get(sessionId);
  }

  public clear(): void {
    this.sessions.clear();
  }
}
