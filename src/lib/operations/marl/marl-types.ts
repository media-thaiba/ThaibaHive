/**
 * Multi-Agent Reinforcement Learning (MARL) Types for Smart Campus Optimization (AIMS / AutoOps)
 */

export type AgentDomain = 'hvac_energy' | 'fleet_logistics' | 'cloud_cost' | 'resource_mesh';

export type ActionStatus = 'proposed' | 'approved' | 'rejected' | 'executing' | 'completed' | 'rolled_back';

export interface AgentObservation {
  agentId: string;
  domain: AgentDomain;
  timestamp: string;
  stateVector: number[];
  features: Record<string, number | string | boolean>;
  institutionId: string;
  campusId: string;
}

export interface AgentAction {
  id: string;
  agentId: string;
  domain: AgentDomain;
  actionType: string;
  actionVector: number[];
  parameters: Record<string, any>;
  confidence: number;
  expectedReward: number;
  status: ActionStatus;
  safetyScore: number;
  timestamp: string;
  institutionId: string;
}

export interface AgentReward {
  agentId: string;
  domain: AgentDomain;
  step: number;
  rewardValue: number;
  components: {
    energyReduction?: number;
    comfortScore?: number;
    fleetTransitEfficiency?: number;
    costSavingsDollars?: number;
    carbonReductionKg?: number;
    safetyPenalty?: number;
  };
  timestamp: string;
}

export interface JointObservation {
  step: number;
  observations: Record<string, AgentObservation>;
  globalStateVector: number[];
  timestamp: string;
  institutionId: string;
}

export interface JointAction {
  step: number;
  actions: Record<string, AgentAction>;
  jointValueEstimate: number;
  timestamp: string;
  institutionId: string;
}

export interface ReplayExperience {
  jointObservation: JointObservation;
  jointAction: JointAction;
  jointReward: number;
  nextJointObservation: JointObservation;
  done: boolean;
}

export interface MarlPolicyConfig {
  gamma: number; // Discount factor (default 0.95)
  actorLearningRate: number; // e.g. 0.001
  criticLearningRate: number; // e.g. 0.005
  explorationEpsilon: number; // e.g. 0.1
  epsilonDecay: number; // e.g. 0.995
  minEpsilon: number; // e.g. 0.01
  replayBufferSize: number; // e.g. 10000
  batchSize: number; // e.g. 32
}

export interface AgentPolicyState {
  agentId: string;
  domain: AgentDomain;
  policyWeights: number[][];
  stepCount: number;
  totalReward: number;
  lastUpdated: string;
}
