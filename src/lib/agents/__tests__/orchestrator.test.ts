import { AgentOrchestrator } from '../orchestrator/orchestrator';
import { AgentRegistry } from '../core/registry';
import { AgentDbStore } from '../../db/agent-store';
import { StubReasoningPort } from '../orchestrator/reasoning-port';

describe('Agent Orchestration & Crash Recovery Engine Suite (AIG-003)', () => {
  let orchestrator: AgentOrchestrator;
  let registry: AgentRegistry;
  let store: AgentDbStore;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    registry.clear();

    store = AgentDbStore.getInstance();
    store.clearMemoryStore();

    registry.register('academic-agent', 'Academic Coordinator', '1.0.0', {
      institutionId: 'inst_alpha',
      domain: 'academic',
    });

    orchestrator = new AgentOrchestrator({
      registry,
      store,
      reasoningPort: new StubReasoningPort({
        content: 'Academic plan successfully resolved.',
        toolCalls: [{ id: 'tc-1', name: 'academic.attendance.reconcile', arguments: {} }],
      }),
    });
  });

  describe('Task Delegation & Load Balancing', () => {
    it('delegates tasks to registered agents successfully', async () => {
      const result = await orchestrator.delegateTask({
        agentId: 'academic-agent',
        taskName: 'attendance.anomaly.detect',
        input: { courseId: 'crs-101' },
        institutionId: 'inst_alpha',
      });

      expect(result.status).toBe('completed');
      expect(result.output.content).toContain('Academic plan successfully resolved');
      expect(result.attempts).toBe(1);
    });

    it('handles delegation to non-registered or wrong-tenant agent', async () => {
      const result = await orchestrator.delegateTask({
        agentId: 'academic-agent',
        taskName: 'attendance.anomaly.detect',
        input: {},
        institutionId: 'inst_beta', // Wrong tenant
      });

      expect(result.status).toBe('failed');
      expect(result.error).toContain('not registered');
    });

    it('escalates to HITL when LLM execution fails repeatedly', async () => {
      const failingPort = {
        reason: jest.fn().mockRejectedValue(new Error('Persistent LLM outage')),
      };
      orchestrator.setReasoningPort(failingPort as any);

      const result = await orchestrator.delegateTask({
        agentId: 'academic-agent',
        taskName: 'exam.conflict.solve',
        input: {},
        institutionId: 'inst_alpha',
        maxRetries: 1,
      });

      expect(result.status).toBe('escalated_to_hitl');
      expect(result.error).toContain('Persistent LLM outage');
      expect(result.attempts).toBe(2);
    });
  });

  describe('Boot-Time Crash Recovery Scan', () => {
    it('identifies stuck running runs and resets them to pending with recovery context', async () => {
      const wf = await store.createWorkflow({
        institutionId: 'inst_alpha',
        name: 'Semester Audit',
        definitionJson: '{}',
      });

      const run1 = await store.createWorkflowRun({
        workflowId: wf.id,
        institutionId: 'inst_alpha',
        status: 'running', // Stuck run
      });

      const run2 = await store.createWorkflowRun({
        workflowId: wf.id,
        institutionId: 'inst_alpha',
        status: 'completed', // Healthy run
      });

      const recovery = await orchestrator.recoverStuckRuns('inst_alpha');
      expect(recovery.recoveredCount).toBe(1);
      expect(recovery.resumedRunIds).toContain(run1.id);

      const updatedRun1 = await store.getWorkflowRunById(run1.id, 'inst_alpha');
      expect(updatedRun1?.status).toBe('pending');
      expect(updatedRun1?.contextJson).toContain('Boot-time crash recovery scan');

      const unchangedRun2 = await store.getWorkflowRunById(run2.id, 'inst_alpha');
      expect(unchangedRun2?.status).toBe('completed');
    });
  });
});
