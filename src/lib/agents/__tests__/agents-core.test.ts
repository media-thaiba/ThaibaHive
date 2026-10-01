import { AgentRegistry } from '../core/registry';
import { StubReasoningPort, FallbackReasoningChain } from '../orchestrator/reasoning-port';

describe('Agent Core Tenancy, Capabilities & ReasoningPort Suite (AIG-001)', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.clear();
  });

  describe('AgentRegistry Tenancy & Capabilities', () => {
    it('registers and filters agents by tenancy and capabilities', () => {
      registry.register('agent-academic-1', 'Academic Coordinator', '1.0.0', {
        institutionId: 'inst_alpha',
        domain: 'academic',
        capabilities: ['academic.attendance', 'academic.grades'],
        permissionScopes: ['agent:workflows:view', 'agent:workflows:approve'],
      });

      registry.register('agent-finance-1', 'Financial Auditor', '1.0.0', {
        institutionId: 'inst_alpha',
        domain: 'finance',
        capabilities: ['finance.fees.reconcile'],
        permissionScopes: ['agent:workflows:approve'],
      });

      registry.register('agent-security-beta', 'Security Overseer', '1.0.0', {
        institutionId: 'inst_beta',
        domain: 'security',
        capabilities: ['security.lockdown'],
      });

      // Tenant isolated queries
      const alphaAgents = registry.listAgents({ institutionId: 'inst_alpha' });
      expect(alphaAgents.length).toBe(2);

      const betaAgents = registry.listAgents({ institutionId: 'inst_beta' });
      expect(betaAgents.length).toBe(1);
      expect(betaAgents[0].id).toBe('agent-security-beta');

      // Capability discovery
      const attendanceAgents = registry.findAgentsByCapability('academic.attendance', 'inst_alpha');
      expect(attendanceAgents.length).toBe(1);
      expect(attendanceAgents[0].id).toBe('agent-academic-1');

      // Domain filtering
      const financeAgents = registry.listAgents({ domain: 'finance' });
      expect(financeAgents.length).toBe(1);
      expect(financeAgents[0].id).toBe('agent-finance-1');
    });

    it('tracks heartbeat and load adjustments', () => {
      registry.register('agent-1', 'Worker', '1.0.0', { institutionId: 'inst_alpha' });
      const initial = registry.getAgent('agent-1', 'inst_alpha');
      expect(initial?.currentLoad).toBe(0);

      registry.adjustLoad('agent-1', 2);
      expect(registry.getAgent('agent-1', 'inst_alpha')?.currentLoad).toBe(2);

      registry.adjustLoad('agent-1', -1);
      expect(registry.getAgent('agent-1', 'inst_alpha')?.currentLoad).toBe(1);
    });
  });

  describe('ReasoningPort Abstraction & Fallback Chain', () => {
    it('executes deterministic reasoning with StubReasoningPort', async () => {
      const stub = new StubReasoningPort({
        content: 'Plan: Step 1 -> Step 2',
        toolCalls: [{ id: 'tc-1', name: 'academic.grades.post', arguments: { classId: 'cls-10' } }],
      });

      const response = await stub.reason({ prompt: 'Generate grade reconciliation plan' });
      expect(response.provider).toBe('stub');
      expect(response.content).toContain('Plan:');
      expect(response.toolCalls?.length).toBe(1);
      expect(response.tokenUsage?.totalTokens).toBeGreaterThan(0);
    });

    it('fails over to fallback reasoning port when primary fails', async () => {
      let fallbackTriggered = false;
      const failingPrimary = {
        reason: jest.fn().mockRejectedValue(new Error('LLM Provider connection timeout')),
      };
      const fallbackPort = new StubReasoningPort({
        content: 'Fallback deterministic plan',
      });

      const chain = new FallbackReasoningChain(
        failingPrimary as any,
        fallbackPort,
        () => { fallbackTriggered = true; }
      );

      const response = await chain.reason({ prompt: 'Execute autonomous task' });
      expect(response.content).toBe('Fallback deterministic plan');
      expect(fallbackTriggered).toBe(true);
    });

    it('enforces token and cost budget caps on ReasoningPort', async () => {
      const stub = new StubReasoningPort({
        content: 'Long generated content',
        tokenUsage: { promptTokens: 100, completionTokens: 200, totalTokens: 300, costEstimateUsd: 0.05 },
      });

      // Token budget cap test
      await expect(
        stub.reason({ prompt: 'Test query', tokenBudgetCap: 200 })
      ).rejects.toThrow('Token budget cap exceeded');

      // Cost budget cap test
      await expect(
        stub.reason({ prompt: 'Test query', costBudgetUsd: 0.01 })
      ).rejects.toThrow('Cost budget cap exceeded');
    });
  });
});

