import { GET as getPlaybooks, POST as createPlaybook } from '@/app/api/admin/security/soar/playbooks/route';
import { GET as getExecutions } from '@/app/api/admin/security/soar/executions/route';
import { POST as triggerExecution } from '@/app/api/admin/security/soar/executions/trigger/route';
import { GET as getApprovals } from '@/app/api/admin/security/soar/approvals/route';
import { POST as resolveApproval } from '@/app/api/admin/security/soar/approvals/[id]/route';
import { GET as getMetrics, POST as toggleKillswitch } from '@/app/api/admin/security/soar/metrics/route';
import { approvalQueue } from '@/lib/security/soar/approval-queue';
import { soarOrchestrator } from '@/lib/security/soar/orchestrator';

// Mock verifySession from @thaiba/auth to test real requireAuth guard behavior
let currentMockSession: any = { staffId: 'admin_user', userId: 'admin_user', role: 'super_admin' };

jest.mock('@thaiba/auth', () => {
  const actual = jest.requireActual('@thaiba/auth');
  return {
    ...actual,
    verifySession: jest.fn(async () => currentMockSession),
  };
});

jest.mock('@/lib/identity/dpop-middleware', () => ({
  withDPoP: (handler: any) => handler,
}));

describe('SOAR Admin REST APIs & Authorization Guard Tests', () => {
  beforeEach(() => {
    currentMockSession = { staffId: 'admin_user', userId: 'admin_user', role: 'super_admin' };
    approvalQueue.clear();
    soarOrchestrator.clearHistory();
    soarOrchestrator.setEngineEnabled(true);
  });

  describe('Unauthenticated & Unauthorized Access Paths', () => {
    it('returns 401 Unauthorized when session is missing', async () => {
      currentMockSession = null;
      const req = new Request('http://localhost/api/admin/security/soar/playbooks', { method: 'GET' });
      const res = await (getPlaybooks as any)(req, {});
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toMatch(/Not authenticated/i);
    });

    it('returns 403 Forbidden when user has insufficient permissions (e.g., role: staff)', async () => {
      currentMockSession = { staffId: 'staff_1', userId: 'staff_1', role: 'staff' };
      const req = new Request('http://localhost/api/admin/security/soar/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }),
      });
      const res = await (createPlaybook as any)(req, {});
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toMatch(/Forbidden/i);
    });
  });

  describe('Authenticated Super-Admin Operations', () => {
    it('GET /playbooks should return list of security playbooks', async () => {
      const req = new Request('http://localhost/api/admin/security/soar/playbooks', { method: 'GET' });
      const res = await (getPlaybooks as any)(req, {});
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.playbooks)).toBe(true);
      expect(data.playbooks.length).toBeGreaterThan(0);
    });

    it('POST /executions/trigger should trigger a manual playbook execution', async () => {
      const req = new Request('http://localhost/api/admin/security/soar/executions/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playbook_id: 'pb-ip-quarantine-auto',
          target_type: 'IP',
          target_value: '203.0.113.55',
          payload: { indicator_value: '203.0.113.55' },
        }),
      });

      const res = await (triggerExecution as any)(req, {});
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.execution.target_entity.value).toBe('203.0.113.55');
    });

    it('GET /executions should query active and historical executions', async () => {
      const req = new Request('http://localhost/api/admin/security/soar/executions', { method: 'GET' });
      const res = await (getExecutions as any)(req, {});
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data.history)).toBe(true);
    });

    it('GET and POST /approvals should manage pending approval items', async () => {
      const item = approvalQueue.enqueue(
        'exec-appr-api',
        'pb-subnet-cidr-containment',
        'Subnet Containment',
        { type: 'SUBNET', value: '10.0.0.0/24' },
        70,
        { subnet_cidr: '10.0.0.0/24' }
      );

      const getReq = new Request('http://localhost/api/admin/security/soar/approvals', { method: 'GET' });
      const getRes = await (getApprovals as any)(getReq, {});
      expect(getRes.status).toBe(200);
      const getData = await getRes.json();
      expect(getData.total_pending).toBe(1);

      const resolveReq = new Request(`http://localhost/api/admin/security/soar/approvals/${item.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'APPROVED', reason: 'Admin confirmed attack' }),
      });

      const resolveRes = await (resolveApproval as any)(resolveReq, { params: Promise.resolve({ id: item.id }) });
      expect(resolveRes.status).toBe(200);
      const resolveData = await resolveRes.json();
      expect(resolveData.success).toBe(true);
      expect(resolveData.approval.status).toBe('APPROVED');
    });

    it('GET and POST /metrics should return metrics and toggle emergency killswitch', async () => {
      const metricsReq = new Request('http://localhost/api/admin/security/soar/metrics', { method: 'GET' });
      const metricsRes = await (getMetrics as any)(metricsReq, {});
      expect(metricsRes.status).toBe(200);
      const metricsData = await metricsRes.json();
      expect(metricsData.metrics.engineEnabled).toBe(true);

      const killswitchReq = new Request('http://localhost/api/admin/security/soar/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: false }),
      });

      const killswitchRes = await (toggleKillswitch as any)(killswitchReq, {});
      expect(killswitchRes.status).toBe(200);
      const killswitchData = await killswitchRes.json();
      expect(killswitchData.engineEnabled).toBe(false);
    });
  });
});
