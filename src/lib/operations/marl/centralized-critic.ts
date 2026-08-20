import { JointObservation, JointAction, MarlPolicyConfig, ReplayExperience } from './marl-types';

/**
 * Centralized Critic Network for Multi-Agent Policy Gradient (MADDPG / MAPPO)
 * Evaluates the global value function Q(s, a_1, ..., a_n) across all agent domains.
 */
export class CentralizedCritic {
  private config: MarlPolicyConfig;
  private valueWeights: number[];
  private bias: number;

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
    // Initialize standard dimension weights (global state dimension ~ 32)
    this.valueWeights = Array.from({ length: 32 }, () => (Math.random() - 0.5) * 0.1);
    this.bias = 0.0;
  }

  /**
   * Estimates the Q-value for a joint state and joint action vector
   */
  public evaluateJointValue(jointObs: JointObservation, jointAction: JointAction): number {
    const combinedVector: number[] = [...jointObs.globalStateVector];

    for (const agentId of Object.keys(jointAction.actions)) {
      const action = jointAction.actions[agentId];
      if (action && Array.isArray(action.actionVector)) {
        combinedVector.push(...action.actionVector);
      }
    }

    let qValue = this.bias;
    const len = Math.min(combinedVector.length, this.valueWeights.length);
    for (let i = 0; i < len; i++) {
      qValue += combinedVector[i] * this.valueWeights[i];
    }

    // Sigmoid or hyperbolic tangent scaling to prevent divergence
    return Math.tanh(qValue);
  }

  /**
   * Performs a single Temporal Difference update for testing and evaluation
   */
  public updateCritic(
    obs: JointObservation,
    act: JointAction,
    reward: number,
    nextObs: JointObservation,
    nextAct: JointAction,
    done: boolean
  ): number {
    const currentQ = this.evaluateJointValue(obs, act);
    const nextQ = done ? 0 : this.evaluateJointValue(nextObs, nextAct);
    const tdTarget = reward + this.config.gamma * nextQ;
    const tdError = tdTarget - currentQ;

    // Gradient descent step
    const combinedVector = [...obs.globalStateVector];
    for (let i = 0; i < Math.min(combinedVector.length, this.valueWeights.length); i++) {
      this.valueWeights[i] += this.config.criticLearningRate * tdError * combinedVector[i];
    }
    this.bias += this.config.criticLearningRate * tdError;

    return 0.5 * tdError * tdError;
  }

  /**
   * Performs a Temporal Difference (TD) learning update step using Bellman equation:
   * TD_Target = r + gamma * Q(s', a')
   * Loss = 0.5 * (TD_Target - Q(s, a))^2
   */
  public trainOnBatch(batch: ReplayExperience[]): { averageLoss: number; tdError: number } {
    if (!batch || batch.length === 0) {
      return { averageLoss: 0, tdError: 0 };
    }

    let totalLoss = 0;
    let totalTdError = 0;

    for (const exp of batch) {
      const currentQ = this.evaluateJointValue(exp.jointObservation, exp.jointAction);
      const nextQ = exp.done ? 0 : this.evaluateJointValue(exp.nextJointObservation, exp.jointAction);
      const tdTarget = exp.jointReward + this.config.gamma * nextQ;
      const tdError = tdTarget - currentQ;

      totalLoss += 0.5 * Math.pow(tdError, 2);
      totalTdError += Math.abs(tdError);

      // Gradient descent step on weights
      const combined = [...exp.jointObservation.globalStateVector];
      const len = Math.min(combined.length, this.valueWeights.length);
      for (let i = 0; i < len; i++) {
        this.valueWeights[i] += this.config.criticLearningRate * tdError * combined[i];
      }
      this.bias += this.config.criticLearningRate * tdError;
    }

    return {
      averageLoss: totalLoss / batch.length,
      tdError: totalTdError / batch.length,
    };
  }

  public getWeights(): number[] {
    return [...this.valueWeights];
  }
}
