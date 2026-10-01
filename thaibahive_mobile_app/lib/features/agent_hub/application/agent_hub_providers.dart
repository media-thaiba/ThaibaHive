// Flutter Riverpod Providers for Agentic Workflows & Multi-Agent Cockpit (MOB-003 & MOB-004)

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/biometric_service.dart';
import '../data/agent_hub_repository.dart';
import '../data/models/agent_models.dart';

export '../data/models/agent_models.dart';

class MobileAgentHubState {
  final List<MobileAgentInfo> agents;
  final List<MobileApprovalGate> pendingApprovals;
  final List<MobileWorkflowRun> recentRuns;
  final int activeRunsCount;
  final bool isKillSwitchEngaged;
  final bool isLoading;
  final String? errorMessage;

  const MobileAgentHubState({
    required this.agents,
    required this.pendingApprovals,
    required this.recentRuns,
    required this.activeRunsCount,
    required this.isKillSwitchEngaged,
    required this.isLoading,
    this.errorMessage,
  });

  MobileAgentHubState copyWith({
    List<MobileAgentInfo>? agents,
    List<MobileApprovalGate>? pendingApprovals,
    List<MobileWorkflowRun>? recentRuns,
    int? activeRunsCount,
    bool? isKillSwitchEngaged,
    bool? isLoading,
    String? errorMessage,
  }) {
    return MobileAgentHubState(
      agents: agents ?? this.agents,
      pendingApprovals: pendingApprovals ?? this.pendingApprovals,
      recentRuns: recentRuns ?? this.recentRuns,
      activeRunsCount: activeRunsCount ?? this.activeRunsCount,
      isKillSwitchEngaged: isKillSwitchEngaged ?? this.isKillSwitchEngaged,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AgentHubNotifier extends StateNotifier<MobileAgentHubState> {
  final AgentHubRepository _repository;
  final BiometricService _biometricService;

  AgentHubNotifier(this._repository, {BiometricService? biometricService})
      : _biometricService = biometricService ?? BiometricService(),
        super(const MobileAgentHubState(
          agents: [
            MobileAgentInfo(id: 'academic-agent', role: 'Academic Orchestrator', domain: 'academic', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'finance-agent', role: 'Finance Reconciliation', domain: 'finance', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'security-agent', role: 'Perimeter Safety Agent', domain: 'security', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'facilities-agent', role: 'Campus IoT & HVAC', domain: 'facilities', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'hr-agent', role: 'Faculty Operations', domain: 'hr', status: 'idle', currentLoad: 0, maxConcurrency: 5),
          ],
          pendingApprovals: [],
          recentRuns: [],
          activeRunsCount: 0,
          isKillSwitchEngaged: false,
          isLoading: false,
        )) {
    loadHub();
  }

  Future<void> loadHub() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final results = await Future.wait([
        _repository.getAgents(),
        _repository.getPendingApprovals(),
        _repository.getActiveRuns(),
        _repository.getKillSwitchStatus(),
      ]);

      final agents = results[0] as List<MobileAgentInfo>;
      final approvals = results[1] as List<MobileApprovalGate>;
      final runs = results[2] as List<MobileWorkflowRun>;
      final killSwitch = results[3] as bool;

      state = state.copyWith(
        agents: agents,
        pendingApprovals: approvals,
        recentRuns: runs,
        activeRunsCount: runs.where((r) => r.status == 'running' || r.status == 'paused').length,
        isKillSwitchEngaged: killSwitch,
        isLoading: false,
      );
    } catch (e) {
      if (kDebugMode) print('[AgentHubNotifier] Load error: $e');
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to sync agent hub data. Using local cache.',
      );
    }
  }

  Future<void> refreshHub() async {
    await loadHub();
  }

  Future<bool> decideApproval(
    MobileApprovalGate gate, {
    required String decision, // "approved" or "rejected"
    String? notes,
  }) async {
    // Step 1: Biometric step-up verification for critical / high severity gates
    if (gate.isCritical || gate.isHigh) {
      final isBioAvailable = await _biometricService.isAvailable();
      if (isBioAvailable) {
        final authResult = await _biometricService.authenticate(
          localizedReason: 'Biometric authorization required to $decision high-severity workflow action: ${gate.requiredPermission}',
        );
        if (!authResult.success) {
          state = state.copyWith(errorMessage: 'Biometric authorization failed. Decision not submitted.');
          return false;
        }
      }
    }

    // Step 2: Optimistic UI dismissal
    final previousApprovals = state.pendingApprovals;
    final updated = state.pendingApprovals.where((g) => g.id != gate.id).toList();
    state = state.copyWith(pendingApprovals: updated, isLoading: true);

    try {
      await _repository.decideApproval(gate.id, decision: decision, notes: notes);
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      // Revert on error / 409 conflict
      if (kDebugMode) print('[AgentHubNotifier] Approval decision error: $e');
      state = state.copyWith(
        pendingApprovals: previousApprovals,
        isLoading: false,
        errorMessage: 'Gate decision conflict or network error. Please refresh.',
      );
      return false;
    }
  }
}

final agentHubProvider = StateNotifierProvider<AgentHubNotifier, MobileAgentHubState>((ref) {
  final repository = ref.watch(agentHubRepositoryProvider);
  return AgentHubNotifier(repository);
});
