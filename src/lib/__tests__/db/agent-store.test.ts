import { AgentDbStore } from '../../db/agent-store';

describe('AgentDbStore Unit & Tenant Isolation Suite (AIG-014)', () => {
  let store: AgentDbStore;

  beforeEach(() => {
    store = AgentDbStore.getInstance();
    store.clearMemoryStore();
  });

  describe('Workflows CRUD & Tenancy', () => {
    it('creates and retrieves a workflow within tenant scope', async () => {
      const wf = await store.createWorkflow({
        institutionId: 'inst_alpha',
        name: 'Semester Closing',
        definitionJson: JSON.stringify({ steps: [] }),
      });

      expect(wf.id).toBeDefined();
      expect(wf.name).toBe('Semester Closing');

      const foundAlpha = await store.getWorkflowById(wf.id, 'inst_alpha');
      expect(foundAlpha).not.toBeNull();
      expect(foundAlpha?.id).toBe(wf.id);

      // Negative assertion: cross-tenant isolation
      const foundBeta = await store.getWorkflowById(wf.id, 'inst_beta');
      expect(foundBeta).toBeNull();
    });

    it('updates and deletes workflows safely', async () => {
      const wf = await store.createWorkflow({
        institutionId: 'inst_alpha',
        name: 'Fee Audit',
        definitionJson: '{}',
      });

      const updated = await store.updateWorkflow(wf.id, { name: 'Fee Audit V2' }, 'inst_alpha');
      expect(updated?.name).toBe('Fee Audit V2');

      const deleted = await store.deleteWorkflow(wf.id, 'inst_alpha');
      expect(deleted).toBe(true);

      const check = await store.getWorkflowById(wf.id, 'inst_alpha');
      expect(check).toBeNull();
    });
  });

  describe('Workflow Runs & Steps', () => {
    it('creates run and tracks steps', async () => {
      const wf = await store.createWorkflow({
        institutionId: 'inst_alpha',
        name: 'Exam Schedule Sync',
        definitionJson: '{}',
      });

      const run = await store.createWorkflowRun({
        workflowId: wf.id,
        institutionId: 'inst_alpha',
        status: 'running',
        traceId: 'trace-123',
      });

      const step1 = await store.createWorkflowStep({
        runId: run.id,
        institutionId: 'inst_alpha',
        stepKey: 'step-validate',
        agentId: 'academic-agent',
        status: 'completed',
        outputJson: JSON.stringify({ valid: true }),
      });

      expect(step1.id).toBeDefined();
      const steps = await store.listWorkflowStepsByRun(run.id, 'inst_alpha');
      expect(steps.length).toBe(1);
      expect(steps[0].stepKey).toBe('step-validate');
    });
  });

  describe('Approval Gates & Memory Entries', () => {
    it('manages approval gates with status transitions', async () => {
      const gate = await store.createApprovalGate({
        runId: 'run_test_1',
        institutionId: 'inst_alpha',
        requiredPermission: 'agent:workflows:approve',
        severity: 'high',
      });

      expect(gate.status).toBe('pending');
      const approved = await store.updateApprovalGate(
        gate.id,
        { status: 'approved', approverId: 'staff_admin', decisionReason: 'Audited and verified' },
        'inst_alpha'
      );
      expect(approved?.status).toBe('approved');
      expect(approved?.approverId).toBe('staff_admin');
    });

    it('stores and queries memory entries with text matching and pruning', async () => {
      await store.createMemoryEntry({
        agentId: 'academic-agent',
        institutionId: 'inst_alpha',
        scope: 'episodic',
        contentJson: JSON.stringify({ text: 'High absenteeism detected in Grade 10-A' }),
        importance: 0.9,
      });

      await store.createMemoryEntry({
        agentId: 'finance-agent',
        institutionId: 'inst_alpha',
        scope: 'semantic',
        contentJson: JSON.stringify({ text: 'Fee reconciliation policy threshold is INR 5000' }),
        importance: 0.8,
      });

      const results = await store.queryMemoryEntries('inst_alpha', undefined, undefined, 'absenteeism');
      expect(results.length).toBe(1);
      expect(results[0].agentId).toBe('academic-agent');

      // Negative assertion: cross-tenant isolation on memory
      const betaResults = await store.queryMemoryEntries('inst_beta', undefined, undefined, 'absenteeism');
      expect(betaResults.length).toBe(0);
    });
  });

  describe('Outbox & Merkle Audit Log Chaining', () => {
    it('enqueues and prioritizes outbox messages', async () => {
      await store.enqueueMessage({
        institutionId: 'inst_alpha',
        topic: 'sync.academic',
        senderAgentId: 'academic-agent',
        payloadJson: '{}',
        priority: 0,
      });

      await store.enqueueMessage({
        institutionId: 'inst_alpha',
        topic: 'alert.security',
        senderAgentId: 'security-agent',
        payloadJson: '{}',
        priority: 2, // critical
      });

      const batch = await store.dequeuePendingMessages('inst_alpha', 2);
      expect(batch.length).toBe(2);
      expect(batch[0].topic).toBe('alert.security'); // Higher priority first
    });

    it('records tool invocations and tracks latest audit hash', async () => {
      const genesis = await store.getLatestAuditHash('inst_alpha');
      expect(genesis).toContain('GENESIS_HASH');

      const inv1 = await store.recordToolInvocation({
        agentId: 'academic-agent',
        toolName: 'academic.grades.post',
        institutionId: 'inst_alpha',
        status: 'success',
        inputHash: 'hash_in_1',
        auditHash: 'hash_audit_1',
        prevAuditHash: genesis,
      });

      const latest = await store.getLatestAuditHash('inst_alpha');
      expect(latest).toBe('hash_audit_1');
    });
  });
});
