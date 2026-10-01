// Flutter Riverpod Providers for Agentic Workflows & Multi-Agent Cockpit (MOB-003 & MOB-004)

import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/biometric_service.dart';
import '../data/agent_hub_repository.dart';
import '../data/agent_stream_service.dart';
import '../data/models/agent_models.dart';

export '../data/models/agent_models.dart';
export '../data/agent_hub_repository.dart' show ApprovalConflictException;
export '../data/agent_stream_service.dart' show AgentStreamEvent, AgentStreamService;

final agentStreamServiceProvider = Provider<AgentStreamService>((ref) {
  final service = AgentStreamService();
  ref.onDispose(() => service.dispose());
  return service;
});

class MobileAgentHubState {
  final List<MobileAgentInfo> agents;
  final List<MobileApprovalGate> pendingApprovals;
  final List<MobileWorkflowRun> recentRuns;
  final int activeRunsCount;
  final bool isKillSwitchEngaged;
  final bool isLoading;
  final String? errorMessage;
  final String? selectedGateId;

  const MobileAgentHubState({
    required this.agents,
    required this.pendingApprovals,
    required this.recentRuns,
    required this.activeRunsCount,
    required this.isKillSwitchEngaged,
    required this.isLoading,
    this.errorMessage,
    this.selectedGateId,
  });

  MobileAgentHubState copyWith({
    List<MobileAgentInfo>? agents,
    List<MobileApprovalGate>? pendingApprovals,
    List<MobileWorkflowRun>? recentRuns,
    int? activeRunsCount,
    bool? isKillSwitchEngaged,
    bool? isLoading,
    String? errorMessage,
    String? selectedGateId,
  }) {
    return MobileAgentHubState(
      agents: agents ?? this.agents,
      pendingApprovals: pendingApprovals ?? this.pendingApprovals,
      recentRuns: recentRuns ?? this.recentRuns,
      activeRunsCount: activeRunsCount ?? this.activeRunsCount,
      isKillSwitchEngaged: isKillSwitchEngaged ?? this.isKillSwitchEngaged,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      selectedGateId: selectedGateId ?? this.selectedGateId,
    );
  }
}

class AgentHubNotifier extends StateNotifier<MobileAgentHubState> {
  final AgentHubRepository _repository;
  final BiometricService _biometricService;
  final AgentStreamService? _streamService;
  StreamSubscription<AgentStreamEvent>? _streamSubscription;

  AgentHubNotifier(
    this._repository, {
    BiometricService? biometricService,
    AgentStreamService? streamService,
  })  : _biometricService = biometricService ?? BiometricService(),
        _streamService = streamService,
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
    _initStream();
  }

  void _initStream() {
    if (_streamService != null) {
      _streamService!.connect();
      _streamSubscription = _streamService!.eventStream.listen((event) {
        if (event.isHeartbeatOrSystem) {
          // Ignore heartbeat, ping, and initial connection frames to avoid superfluous API refetches
          return;
        }
        if (kDebugMode) print('[AgentHubNotifier] Actionable SSE Event received: ${event.type}');
        refreshHub();
      });
    }
  }

  @override
  void dispose() {
    _streamSubscription?.cancel();
    super.dispose();
  }

  void selectGate(String? gateId) {
    state = state.copyWith(selectedGateId: gateId);
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
        errorMessage: e.toString().contains('403')
            ? 'Agentic Workflows are currently disabled or restricted for your role.'
            : 'Unable to sync agent hub: ${e.toString().replaceAll('Exception:', '').trim()}',
      );
    }
  }

  Future<void> refreshHub() async {
    await loadHub();
  }

  Future<bool> decideApproval(
    MobileApprovalGate gate, {
    required String decision, // "approved" or "rejected"
    String? reason,
  }) async {
    // Step 1: Biometric step-up verification for critical / high severity gates
    if (gate.isCritical || gate.isHigh) {
      final isBioAvailable = await _biometricService.isAvailable();
      if (isBioAvailable) {
        final authResult = await _biometricService.authenticate(
          localizedReason: 'Biometric authorization required to $decision high-severity workflow action: ${gate.requiredPermission}',
        );
        if (!authResult.success) {
          state = state.copyWith(errorMessage: 'Biometric authorization cancelled or failed. Decision not submitted.');
          return false;
        }
      }
    }

    // Step 2: Optimistic UI dismissal
    final previousApprovals = state.pendingApprovals;
    final updated = state.pendingApprovals.where((g) => g.id != gate.id).toList();
    state = state.copyWith(pendingApprovals: updated, isLoading: true, errorMessage: null);

    try {
      await _repository.decideApproval(gate.id, decision: decision, reason: reason);
      state = state.copyWith(isLoading: false);
      return true;
    } on ApprovalConflictException catch (conflict) {
      // Revert on D14 409 conflict
      if (kDebugMode) print('[AgentHubNotifier] D14 Conflict: ${conflict.message}');
      state = state.copyWith(
        pendingApprovals: previousApprovals,
        isLoading: false,
        errorMessage: conflict.message,
      );
      return false;
    } catch (e) {
      // Revert on generic error
      if (kDebugMode) print('[AgentHubNotifier] Approval decision error: $e');
      state = state.copyWith(
        pendingApprovals: previousApprovals,
        isLoading: false,
        errorMessage: 'Decision failed: ${e.toString().replaceAll('Exception:', '').trim()}',
      );
      return false;
    }
  }
}

final agentHubProvider = StateNotifierProvider<AgentHubNotifier, MobileAgentHubState>((ref) {
  final repository = ref.watch(agentHubRepositoryProvider);
  final streamService = ref.watch(agentStreamServiceProvider);
  return AgentHubNotifier(repository, streamService: streamService);
});
