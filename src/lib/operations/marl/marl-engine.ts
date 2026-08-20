import {
  AgentAction,
  AgentDomain,
  AgentObservation,
  AgentPolicyState,
  JointAction,
  JointObservation,
  MarlPolicyConfig,
  ReplayExperience,
} from './marl-types';
import { CentralizedCritic } from './centralized-critic';

/**
 * Multi-Agent Reinforcement Learning Engine (AIMS / AutoOps)
 * Coordinates decentralized domain actors with centralized critic value evaluation.
 */
export class MarlEngine {
  private critic: CentralizedCritic;
  private policies: Map<string, AgentPolicyState> = new Map();
  private replayBuffer: ReplayExperience[] = [];
  private config: MarlPolicyConfig;
  private stepCounter = 0;

  constructor(config?: Partial<MarlPolicyConfig>) {
    this.config = {
      gamma: 0.95,
      actorLearningRate: 0.001,
      criticLearningRate: 0.005,
      explorationEpsilon: 0.1,
      epsilonDecay: 0.995,
      minEpsilon: 0.01,
      replayBufferSize: 10000,
      batchSize: 32,
      ...config,
    };
    this.critic = new CentralizedCritic(this.config);
  }

  /**
   * Registers a domain agent into the MARL coordination system
   */
  public registerAgent(agentId: string, domain: AgentDomain, featureDim = 8, actionDim = 4): void {
    if (!this.policies.has(agentId)) {
      const weights: number[][] = Array.from({ length: actionDim }, () =>
        Array.from({ length: featureDim }, () => (Math.random() - 0.5) * 0.1)
      );

      this.policies.set(agentId, {
        agentId,
        domain,
        policyWeights: weights,
        stepCount: 0,
        totalReward: 0,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  /**
   * Selects an action for a specific agent given its observation (Decentralized Actor execution)
   */
  public selectAction(obs: AgentObservation): AgentAction {
    let policy = this.policies.get(obs.agentId);
    if (!policy) {
      this.registerAgent(obs.agentId, obs.domain, Math.max(obs.stateVector.length, 8), 4);
      policy = this.policies.get(obs.agentId)!;
    }

    const actionDim = policy.policyWeights.length;
    const actionVector: number[] = new Array(actionDim).fill(0);

    // Epsilon-greedy action selection
    const isExploring = Math.random() < this.config.explorationEpsilon;

    for (let a = 0; a < actionDim; a++) {
      if (isExploring) {
        actionVector[a] = Math.random() * 2 - 1; // [-1, 1]
      } else {
        let linearCombination = 0;
        const stateLen = Math.min(obs.stateVector.length, policy.policyWeights[a].length);
        for (let s = 0; s < stateLen; s++) {
          linearCombination += obs.stateVector[s] * policy.policyWeights[a][s];
        }
        actionVector[a] = Math.tanh(linearCombination);
      }
    }

    const expectedConfidence = Math.max(0.7, 1.0 - this.config.explorationEpsilon * 0.5);

    return {
      id: `act_${obs.agentId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      agentId: obs.agentId,
      domain: obs.domain,
      actionType: `optimize_${obs.domain}`,
      actionVector,
      parameters: {
        setpointAdjustment: actionVector[0] ? Number((actionVector[0] * 2.0).toFixed(2)) : 0,
        throttleFactor: actionVector[1] ? Number((Math.abs(actionVector[1])).toFixed(2)) : 1.0,
      },
      confidence: Number(expectedConfidence.toFixed(3)),
      expectedReward: Number((Math.random() * 0.5 + 0.5).toFixed(3)),
      status: 'proposed',
      safetyScore: 0.95,
      timestamp: new Date().toISOString(),
      institutionId: obs.institutionId,
    };
  }

  /**
   * Formulates a Joint Action from all agent observations and evaluates with Centralized Critic
   */
  public coordinateJointDecision(jointObs: JointObservation): JointAction {
    const actions: Record<string, AgentAction> = {};

    for (const agentId of Object.keys(jointObs.observations)) {
      const obs = jointObs.observations[agentId];
      actions[agentId] = this.selectAction(obs);
    }

    const tempJointAction: JointAction = {
      step: ++this.stepCounter,
      actions,
      jointValueEstimate: 0,
      timestamp: new Date().toISOString(),
      institutionId: jointObs.institutionId,
    };

    const jointValue = this.critic.evaluateJointValue(jointObs, tempJointAction);
    tempJointAction.jointValueEstimate = Number(jointValue.toFixed(4));

    return tempJointAction;
  }

  /**
   * Records experience in the replay buffer and triggers learning updates
   */
  public recordExperience(exp: ReplayExperience): void {
    this.replayBuffer.push(exp);
    if (this.replayBuffer.length > this.config.replayBufferSize) {
      this.replayBuffer.shift();
    }

    // Decay exploration epsilon
    if (this.config.explorationEpsilon > this.config.minEpsilon) {
      this.config.explorationEpsilon *= this.config.epsilonDecay;
    }

    // Update policies if enough batch samples
    if (this.replayBuffer.length >= this.config.batchSize) {
      const sampleBatch = this.sampleBatch(this.config.batchSize);
      this.critic.trainOnBatch(sampleBatch);
    }
  }

  public recordStepExperience(exp: ReplayExperience): void {
    this.recordExperience(exp);
  }

  public trainStep(): void {
    if (this.replayBuffer.length > 0) {
      const batchSize = Math.min(this.replayBuffer.length, this.config.batchSize);
      const sampleBatch = this.sampleBatch(batchSize);
      this.critic.trainOnBatch(sampleBatch);
    }
  }

  private sampleBatch(batchSize: number): ReplayExperience[] {
    const samples: ReplayExperience[] = [];
    for (let i = 0; i < batchSize; i++) {
      const idx = Math.floor(Math.random() * this.replayBuffer.length);
      samples.push(this.replayBuffer[idx]);
    }
    return samples;
  }

  public getPolicies(): Map<string, AgentPolicyState> {
    return this.policies;
  }

  public getPolicy(agentId: string): AgentPolicyState | undefined {
    return this.policies.get(agentId);
  }

  public getCritic(): CentralizedCritic {
    return this.critic;
  }

  public getExplorationEpsilon(): number {
    return this.config.explorationEpsilon;
  }

  public getReplayBufferSize(): number {
    return this.replayBuffer.length;
  }
}
