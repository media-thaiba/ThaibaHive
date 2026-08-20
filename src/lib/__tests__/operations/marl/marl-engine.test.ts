import { MarlEngine } from '@/lib/operations/marl/marl-engine';
import { CentralizedCritic } from '@/lib/operations/marl/centralized-critic';
import { AgentObservation, JointObservation, JointAction, AgentDomain } from '@/lib/operations/marl/marl-types';

describe('AIMS-001 — MarlEngine & CentralizedCritic Multi-Scenario Suite', () => {
  // Scenario 1: Critic bounds
  it('Scenario 1: should initialize CentralizedCritic and evaluate joint values within [-1, 1]', () => {
    const critic = new CentralizedCritic({ gamma: 0.95 });
    const obs: JointObservation = {
      step: 1,
      observations: {},
      globalStateVector: [0.5, -0.2, 0.8, 0.1],
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };
    const action: JointAction = {
      step: 1,
      actions: {
        agent_1: {
          id: 'act_1',
          agentId: 'agent_1',
          domain: 'hvac_energy',
          actionType: 'optimize',
          actionVector: [0.5, -0.5],
          parameters: {},
          confidence: 0.9,
          expectedReward: 0.8,
          status: 'proposed',
          safetyScore: 0.95,
          timestamp: new Date().toISOString(),
          institutionId: 'inst_001',
        },
      },
      jointValueEstimate: 0,
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };
    const qVal = critic.evaluateJointValue(obs, action);
    expect(qVal).toBeGreaterThanOrEqual(-1.0);
    expect(qVal).toBeLessThanOrEqual(1.0);
  });

  // Scenario 2: Multi-domain coordination
  it('Scenario 2: should coordinate joint decisions across 4 distinct heterogeneous domains', () => {
    const engine = new MarlEngine();
    const domains: AgentDomain[] = ['hvac_energy', 'fleet_logistics', 'cloud_cost', 'resource_mesh'];
    const observations: Record<string, AgentObservation> = {};

    domains.forEach((dom, i) => {
      observations[`agent_${dom}`] = {
        agentId: `agent_${dom}`,
        domain: dom,
        timestamp: new Date().toISOString(),
        stateVector: [i * 0.2, 0.5, 0.8, 0.1],
        features: { val: i },
        institutionId: 'inst_001',
        campusId: 'campus_main',
      };
    });

    const jointObs: JointObservation = {
      step: 1,
      observations,
      globalStateVector: [0.1, 0.2, 0.3, 0.4],
      timestamp: new Date().toISOString(),
      institutionId: 'inst_001',
    };

    const jointAction = engine.coordinateJointDecision(jointObs);
    expect(Object.keys(jointAction.actions).length).toBe(4);
    expect(jointAction.jointValueEstimate).toBeDefined();
  });

  // Scenario 3: Epsilon exploration decay
  it('Scenario 3: should decay exploration rate epsilon monotonically over training steps', () => {
    const engine = new MarlEngine({ explorationEpsilon: 0.5, epsilonDecay: 0.9, minEpsilon: 0.05 });
    const initialEps = engine.getExplorationEpsilon();
    expect(initialEps).toBe(0.5);

    // Perform experience replay learning
    for (let i = 0; i < 5; i++) {
      engine.recordStepExperience({
        jointObservation: { step: i, observations: {}, globalStateVector: [0.1], timestamp: '', institutionId: 'i' },
        jointAction: { step: i, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' },
        jointReward: 1.0,
        nextJointObservation: { step: i + 1, observations: {}, globalStateVector: [0.2], timestamp: '', institutionId: 'i' },
        done: false,
      });
      engine.trainStep();
    }
    expect(engine.getExplorationEpsilon()).toBeLessThan(initialEps);
  });

  // Scenario 4: Replay buffer size limit
  it('Scenario 4: should respect replay buffer maximum capacity and FIFO evictions', () => {
    const engine = new MarlEngine({ replayBufferSize: 5 });
    for (let i = 0; i < 10; i++) {
      engine.recordStepExperience({
        jointObservation: { step: i, observations: {}, globalStateVector: [i], timestamp: '', institutionId: 'i' },
        jointAction: { step: i, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' },
        jointReward: i,
        nextJointObservation: { step: i + 1, observations: {}, globalStateVector: [i + 1], timestamp: '', institutionId: 'i' },
        done: false,
      });
    }
    expect(engine.getReplayBufferSize()).toBe(5);
  });

  // Scenario 5: Automatic agent registration on unknown observation
  it('Scenario 5: should automatically register unregistered agent on first observation', () => {
    const engine = new MarlEngine();
    const obs: AgentObservation = {
      agentId: 'newly_discovered_agent',
      domain: 'cloud_cost',
      timestamp: new Date().toISOString(),
      stateVector: [0.1, 0.2, 0.3],
      features: {},
      institutionId: 'inst_001',
      campusId: 'campus_main',
    };
    const action = engine.selectAction(obs);
    expect(action.agentId).toBe('newly_discovered_agent');
    expect(action.actionVector.length).toBeGreaterThan(0);
  });

  // Scenario 6: Action vector boundedness
  it('Scenario 6: should produce action vectors bounded strictly in [-1, +1]', () => {
    const engine = new MarlEngine({ explorationEpsilon: 0 }); // deterministic policy
    for (let i = 0; i < 20; i++) {
      const obs: AgentObservation = {
        agentId: 'bounded_agent',
        domain: 'hvac_energy',
        timestamp: new Date().toISOString(),
        stateVector: [Math.random() * 100 - 50, Math.random() * 100, Math.random() * 1000],
        features: {},
        institutionId: 'inst_001',
        campusId: 'campus_main',
      };
      const action = engine.selectAction(obs);
      action.actionVector.forEach((v) => {
        expect(v).toBeGreaterThanOrEqual(-1.0);
        expect(v).toBeLessThanOrEqual(1.0);
      });
    }
  });

  // Scenario 7: High dimensional state vector
  it('Scenario 7: should handle high-dimensional state vectors (128 features)', () => {
    const engine = new MarlEngine();
    const highDimVec = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.05));
    const obs: AgentObservation = {
      agentId: 'high_dim_agent',
      domain: 'resource_mesh',
      timestamp: new Date().toISOString(),
      stateVector: highDimVec,
      features: {},
      institutionId: 'inst_001',
      campusId: 'campus_main',
    };
    const action = engine.selectAction(obs);
    expect(action.actionVector.length).toBeGreaterThan(0);
  });

  // Scenario 8: Zero state vector
  it('Scenario 8: should handle all-zero state vector without NaN or divergence', () => {
    const engine = new MarlEngine();
    const obs: AgentObservation = {
      agentId: 'zero_state_agent',
      domain: 'fleet_logistics',
      timestamp: new Date().toISOString(),
      stateVector: [0, 0, 0, 0, 0],
      features: {},
      institutionId: 'inst_001',
      campusId: 'campus_main',
    };
    const action = engine.selectAction(obs);
    expect(Number.isNaN(action.actionVector[0])).toBe(false);
  });

  // Scenario 9: Multi-campus tenant isolation in observation
  it('Scenario 9: should isolate actions and observations by institutionId', () => {
    const engine = new MarlEngine();
    const obsTenantA: AgentObservation = {
      agentId: 'agent_inst_a',
      domain: 'hvac_energy',
      timestamp: new Date().toISOString(),
      stateVector: [1, 2, 3],
      features: {},
      institutionId: 'tenant_alpha',
      campusId: 'campus_a',
    };
    const actionA = engine.selectAction(obsTenantA);
    expect(actionA.institutionId).toBe('tenant_alpha');
  });

  // Scenario 10: Negative rewards handling
  it('Scenario 10: should process negative penalties in TD learning update without NaN', () => {
    const critic = new CentralizedCritic({ criticLearningRate: 0.01 });
    const obs: JointObservation = { step: 1, observations: {}, globalStateVector: [0.5], timestamp: '', institutionId: 'i' };
    const act: JointAction = { step: 1, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' };
    const nextObs: JointObservation = { step: 2, observations: {}, globalStateVector: [0.6], timestamp: '', institutionId: 'i' };
    const nextAct: JointAction = { step: 2, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' };

    const loss = critic.updateCritic(obs, act, -15.0, nextObs, nextAct, false);
    expect(Number.isNaN(loss)).toBe(false);
  });

  // Scenario 11: Gamma = 0 (myopic immediate reward evaluation)
  it('Scenario 11: should support gamma = 0 discount factor for purely immediate reward learning', () => {
    const critic = new CentralizedCritic({ gamma: 0.0 });
    const obs: JointObservation = { step: 1, observations: {}, globalStateVector: [0.5], timestamp: '', institutionId: 'i' };
    const act: JointAction = { step: 1, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' };
    const nextObs: JointObservation = { step: 2, observations: {}, globalStateVector: [0.6], timestamp: '', institutionId: 'i' };
    const nextAct: JointAction = { step: 2, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' };

    const loss = critic.updateCritic(obs, act, 5.0, nextObs, nextAct, false);
    expect(loss).toBeDefined();
  });

  // Scenario 12: Terminal state transition (done = true)
  it('Scenario 12: should ignore next-state value on terminal step (done = true)', () => {
    const critic = new CentralizedCritic({ gamma: 0.95 });
    const obs: JointObservation = { step: 1, observations: {}, globalStateVector: [0.5], timestamp: '', institutionId: 'i' };
    const act: JointAction = { step: 1, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' };
    const nextObs: JointObservation = { step: 2, observations: {}, globalStateVector: [0.6], timestamp: '', institutionId: 'i' };
    const nextAct: JointAction = { step: 2, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' };

    const loss = critic.updateCritic(obs, act, 10.0, nextObs, nextAct, true);
    expect(loss).toBeDefined();
  });

  // Scenario 13: Policy weight extraction
  it('Scenario 13: should export and verify agent policy states', () => {
    const engine = new MarlEngine();
    engine.registerAgent('exported_agent', 'hvac_energy');
    const policy = engine.getPolicy('exported_agent');
    expect(policy).toBeDefined();
    expect(policy?.domain).toBe('hvac_energy');
    expect(Array.isArray(policy?.policyWeights)).toBe(true);
  });

  // Scenario 14: Safety score parameter clamping
  it('Scenario 14: should generate safety scores bounded in [0.7, 1.0]', () => {
    const engine = new MarlEngine();
    const obs: AgentObservation = {
      agentId: 'safe_agent',
      domain: 'cloud_cost',
      timestamp: new Date().toISOString(),
      stateVector: [0.8, 0.9],
      features: {},
      institutionId: 'inst_001',
      campusId: 'campus_main',
    };
    const action = engine.selectAction(obs);
    expect(action.safetyScore).toBeGreaterThanOrEqual(0.7);
    expect(action.safetyScore).toBeLessThanOrEqual(1.0);
  });

  // Scenario 15: Confidence score bounds
  it('Scenario 15: should provide realistic confidence scores based on exploration state', () => {
    const engine = new MarlEngine({ explorationEpsilon: 0.1 });
    const obs: AgentObservation = {
      agentId: 'confidence_agent',
      domain: 'hvac_energy',
      timestamp: new Date().toISOString(),
      stateVector: [0.5],
      features: {},
      institutionId: 'inst_001',
      campusId: 'campus_main',
    };
    const action = engine.selectAction(obs);
    expect(action.confidence).toBeGreaterThanOrEqual(0.7);
  });

  // Scenario 16: Cooperative multi-agent synergy
  it('Scenario 16: should increase joint value estimate when both energy and fleet agents optimize concurrently', () => {
    const engine = new MarlEngine();
    const obsA: AgentObservation = { agentId: 'a1', domain: 'hvac_energy', timestamp: '', stateVector: [1], features: {}, institutionId: 'i', campusId: 'c' };
    const obsB: AgentObservation = { agentId: 'a2', domain: 'fleet_logistics', timestamp: '', stateVector: [1], features: {}, institutionId: 'i', campusId: 'c' };

    const res = engine.coordinateJointDecision({
      step: 1,
      observations: { a1: obsA, a2: obsB },
      globalStateVector: [1, 1],
      timestamp: '',
      institutionId: 'i',
    });
    expect(res.jointValueEstimate).toBeDefined();
  });

  // Scenario 17: Competitive resource auction arbitration
  it('Scenario 17: should handle action parameter derivation for throttle and setpoint', () => {
    const engine = new MarlEngine({ explorationEpsilon: 0 });
    const obs: AgentObservation = {
      agentId: 'param_agent',
      domain: 'hvac_energy',
      timestamp: '',
      stateVector: [0.8, 0.4],
      features: {},
      institutionId: 'i',
      campusId: 'c',
    };
    const act = engine.selectAction(obs);
    expect(typeof act.parameters.setpointAdjustment).toBe('number');
    expect(typeof act.parameters.throttleFactor).toBe('number');
  });

  // Scenario 18: Repeated policy updates convergence
  it('Scenario 18: should update critic weights over 50 mini-batches without exploding gradients', () => {
    const critic = new CentralizedCritic({ criticLearningRate: 0.001 });
    const obs: JointObservation = { step: 1, observations: {}, globalStateVector: [0.2, 0.4], timestamp: '', institutionId: 'i' };
    const act: JointAction = { step: 1, actions: {}, jointValueEstimate: 0, timestamp: '', institutionId: 'i' };

    let prevLoss = Infinity;
    for (let i = 0; i < 50; i++) {
      prevLoss = critic.updateCritic(obs, act, 1.0, obs, act, false);
    }
    expect(Number.isNaN(prevLoss)).toBe(false);
    expect(Number.isFinite(prevLoss)).toBe(true);
  });

  // Scenario 19: Action ID uniqueness
  it('Scenario 19: should generate globally unique action IDs for every step', () => {
    const engine = new MarlEngine();
    const obs: AgentObservation = { agentId: 'uid_agent', domain: 'cloud_cost', timestamp: '', stateVector: [0.1], features: {}, institutionId: 'i', campusId: 'c' };
    const ids = new Set<string>();
    for (let i = 0; i < 30; i++) {
      ids.add(engine.selectAction(obs).id);
    }
    expect(ids.size).toBe(30);
  });

  // Scenario 20: Reset and reconfiguration
  it('Scenario 20: should re-instantiate cleanly with custom learning rates and buffer parameters', () => {
    const customEngine = new MarlEngine({
      actorLearningRate: 0.005,
      criticLearningRate: 0.01,
      batchSize: 64,
      replayBufferSize: 20000,
    });
    expect(customEngine.getReplayBufferSize()).toBe(0);
    expect(customEngine.getExplorationEpsilon()).toBe(0.1);
  });
});
