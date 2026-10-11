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

  @override
  Future<List<MobileAgentPlugin>> getInstalledPlugins({
    dynamic storage,
    bool useCacheFallback = true,
  }) async {
    return const [
      MobileAgentPlugin(
        id: 'plug-1',
        pluginKey: 'thaiba.finance.reconciler',
        displayName: 'Finance Reconciler',
        summary: 'Reconcile ledgers',
        version: '1.0.0',
        category: 'finance',
        isInstalled: true,
        isEnabled: true,
      ),
    ];
  }

  @override
  Future<List<MobileAgentPlugin>> getMarketplacePlugins() async {
    return const [
      MobileAgentPlugin(
        id: 'plug-2',
        pluginKey: 'thaiba.security.guard',
        displayName: 'Perimeter Guard Plugin',
        summary: 'Radar anomaly alerts',
        version: '2.0.0',
        category: 'security',
        isInstalled: false,
      ),
    ];
  }

  @override
  Future<bool> togglePluginEnabled(String pluginId, bool enabled) async {
    return true;
  }

  @override
  Future<bool> installPlugin(String pluginId, {List<String>? requestedPermissions}) async {
    return true;
  }

  @override
  Future<bool> uninstallPlugin(String pluginId) async {
    return true;
  }

  @override
  Future<Map<String, dynamic>> triggerWorkflowRun(
    String workflowId, {
    Map<String, dynamic>? inputs,
  }) async {
    return {
      'id': 'run-new-1',
      'workflowId': workflowId,
      'workflowName': 'Triggered Workflow',
      'status': 'running',
      'currentStep': 0,
      'totalSteps': 2,
      'startedAt': '2026-10-11T12:00:00.000Z',
    };
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
      expect(notifier.state.installedPlugins.length, 1);
      expect(notifier.state.installedPlugins.first.id, 'plug-1');
      expect(notifier.state.marketplacePlugins.length, 1);
      expect(notifier.state.marketplacePlugins.first.id, 'plug-2');
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

    test('togglePlugin updates plugin enabled state optimistically', () async {
      await notifier.loadHub();
      expect(notifier.state.installedPlugins.first.isEnabled, true);

      final result = await notifier.togglePlugin('plug-1', false);
      expect(result, true);
      expect(notifier.state.installedPlugins.first.isEnabled, false);
    });

    test('triggerWorkflowRun prepends new run to recentRuns', () async {
      await notifier.loadHub();
      final initialCount = notifier.state.recentRuns.length;

      final ok = await notifier.triggerWorkflowRun('wf-custom-sync');
      expect(ok, true);
      expect(notifier.state.recentRuns.length, initialCount + 1);
      expect(notifier.state.recentRuns.first.workflowId, 'wf-custom-sync');
    });

    test('addLiveSnippet prepends live multimodal snippets up to 50 items', () {
      const snippet = MobileLiveSnippet(
        id: 'snip-1',
        sessionId: 'sess-1',
        speaker: 'gemini_live',
        text: 'Hazard detected in corridor B',
        hazardType: 'slip_hazard',
        severity: 'high',
        timestamp: '2026-10-11T12:00:00.000Z',
      );

      notifier.addLiveSnippet(snippet);
      expect(notifier.state.liveSnippets.length, 1);
      expect(notifier.state.liveSnippets.first.isHazard, true);

      notifier.clearLiveSnippets();
      expect(notifier.state.liveSnippets.isEmpty, true);
    });
  });
}
