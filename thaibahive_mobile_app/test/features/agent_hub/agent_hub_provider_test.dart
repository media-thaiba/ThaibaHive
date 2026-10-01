import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/features/agent_hub/application/agent_hub_providers.dart';
import 'package:thaibahive_mobile/features/agent_hub/data/agent_hub_repository.dart';

class FakeAgentHubRepository extends AgentHubRepository {
  FakeAgentHubRepository() : super(ApiClient());

  @override
  Future<List<MobileAgentInfo>> getAgents() async {
    return const [
      MobileAgentInfo(
        id: 'academic-agent',
        role: 'Academic Orchestrator',
        domain: 'academic',
        status: 'idle',
        currentLoad: 0,
        maxConcurrency: 5,
      ),
    ];
  }

  @override
  Future<List<MobileApprovalGate>> getPendingApprovals() async {
    return const [
      MobileApprovalGate(
        id: 'gate-1',
        runId: 'run-1',
        requiredPermission: 'agent:workflows:approve',
        severity: 'low',
        status: 'pending',
        createdAt: '2026-10-01T12:00:00.000Z',
      ),
    ];
  }

  @override
  Future<List<MobileWorkflowRun>> getActiveRuns() async {
    return const [
      MobileWorkflowRun(
        id: 'run-1',
        workflowId: 'wf-1',
        workflowName: 'Test Workflow',
        status: 'running',
        currentStep: 1,
        totalSteps: 3,
        startedAt: '2026-10-01T12:00:00.000Z',
      ),
    ];
  }

  @override
  Future<bool> getKillSwitchStatus() async {
    return false;
  }

  @override
  Future<bool> decideApproval(
    String gateId, {
    required String decision,
    String? reason,
  }) async {
    return true;
  }
}

void main() {
  group('AgentHubNotifier & Repository Unit Tests (MOB-003 / MOB-004)', () {
    late AgentHubRepository repository;
    late AgentHubNotifier notifier;

    setUp(() {
      repository = FakeAgentHubRepository();
      notifier = AgentHubNotifier(repository);
    });

    test('loadHub loads data into state successfully', () async {
      await notifier.loadHub();

      expect(notifier.state.isLoading, false);
      expect(notifier.state.agents.length, 1);
      expect(notifier.state.agents.first.id, 'academic-agent');
      expect(notifier.state.pendingApprovals.length, 1);
      expect(notifier.state.pendingApprovals.first.id, 'gate-1');
      expect(notifier.state.recentRuns.length, 1);
      expect(notifier.state.isKillSwitchEngaged, false);
    });

    test('decideApproval dismisses gate optimistically on success', () async {
      await notifier.loadHub();
      expect(notifier.state.pendingApprovals.length, 1);

      final gate = notifier.state.pendingApprovals.first;
      final result = await notifier.decideApproval(gate, decision: 'approved');

      expect(result, true);
      expect(notifier.state.pendingApprovals.isEmpty, true);
    });
  });
}
