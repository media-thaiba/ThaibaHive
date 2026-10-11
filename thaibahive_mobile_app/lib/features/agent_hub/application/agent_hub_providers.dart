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
  final List<MobileAgentPlugin> installedPlugins;
  final List<MobileAgentPlugin> marketplacePlugins;
  final List<MobileLiveSnippet> liveSnippets;
  final int activeRunsCount;
  final bool isKillSwitchEngaged;
  final bool isLoading;
  final bool isOfflineCached;
  final String? errorMessage;
  final String? selectedGateId;

  const MobileAgentHubState({
    required this.agents,
    required this.pendingApprovals,
    required this.recentRuns,
    this.installedPlugins = const [],
    this.marketplacePlugins = const [],
    this.liveSnippets = const [],
    required this.activeRunsCount,
    required this.isKillSwitchEngaged,
    required this.isLoading,
    this.isOfflineCached = false,
    this.errorMessage,
    this.selectedGateId,
  });

  MobileAgentHubState copyWith({
    List<MobileAgentInfo>? agents,
    List<MobileApprovalGate>? pendingApprovals,
    List<MobileWorkflowRun>? recentRuns,
    List<MobileAgentPlugin>? installedPlugins,
    List<MobileAgentPlugin>? marketplacePlugins,
    List<MobileLiveSnippet>? liveSnippets,
    int? activeRunsCount,
    bool? isKillSwitchEngaged,
    bool? isLoading,
    bool? isOfflineCached,
    String? errorMessage,
    String? selectedGateId,
  }) {
    return MobileAgentHubState(
      agents: agents ?? this.agents,
      pendingApprovals: pendingApprovals ?? this.pendingApprovals,
      recentRuns: recentRuns ?? this.recentRuns,
      installedPlugins: installedPlugins ?? this.installedPlugins,
      marketplacePlugins: marketplacePlugins ?? this.marketplacePlugins,
      liveSnippets: liveSnippets ?? this.liveSnippets,
      activeRunsCount: activeRunsCount ?? this.activeRunsCount,
      isKillSwitchEngaged: isKillSwitchEngaged ?? this.isKillSwitchEngaged,
      isLoading: isLoading ?? this.isLoading,
      isOfflineCached: isOfflineCached ?? this.isOfflineCached,
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
          installedPlugins: [],
          marketplacePlugins: [],
          liveSnippets: [],
          activeRunsCount: 0,
          isKillSwitchEngaged: false,
          isLoading: false,
          isOfflineCached: false,
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

        // Live multimodal SSE transcript/hazard snippet ingestion
        if (event.type == 'transcript' || event.type == 'hazard' || event.type == 'tool_call') {
          _handleLiveStreamEvent(event);
          return;
        }

        if (kDebugMode) print('[AgentHubNotifier] Actionable SSE Event received: ${event.type}');
        refreshHub();
      });
    }
  }

  void _handleLiveStreamEvent(AgentStreamEvent event) {
    try {
      final snippet = MobileLiveSnippet(
        id: event.data['id']?.toString() ?? 'evt-${event.sequenceNumber}-${DateTime.now().millisecondsSinceEpoch}',
        sessionId: event.data['sessionId']?.toString() ?? 'live-stream',
        speaker: event.data['speaker']?.toString() ?? (event.type == 'hazard' ? 'hazard_sensor' : 'gemini_live'),
        text: event.data['text']?.toString() ?? event.data['description']?.toString() ?? '',
        hazardType: event.data['hazardType']?.toString(),
        severity: event.data['severity']?.toString(),
        timestamp: event.timestamp,
      );

      final updated = [snippet, ...state.liveSnippets];
      // Keep only recent 50 snippets for memory efficiency
      if (updated.length > 50) {
        state = state.copyWith(liveSnippets: updated.sublist(0, 50));
      } else {
        state = state.copyWith(liveSnippets: updated);
      }
    } catch (_) {}
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
        _repository.getInstalledPlugins().catchError((_) => <MobileAgentPlugin>[]),
        _repository.getMarketplacePlugins().catchError((_) => <MobileAgentPlugin>[]),
      ]);

      final agents = results[0] as List<MobileAgentInfo>;
      final approvals = results[1] as List<MobileApprovalGate>;
      final runs = results[2] as List<MobileWorkflowRun>;
      final killSwitch = results[3] as bool;
      final installedPlugins = results[4] as List<MobileAgentPlugin>;
      final marketplacePlugins = results[5] as List<MobileAgentPlugin>;

      state = state.copyWith(
        agents: agents,
        pendingApprovals: approvals,
        recentRuns: runs,
        installedPlugins: installedPlugins,
        marketplacePlugins: marketplacePlugins,
        activeRunsCount: runs.where((r) => r.status == 'running' || r.status == 'paused').length,
        isKillSwitchEngaged: killSwitch,
        isLoading: false,
        isOfflineCached: false,
      );
    } catch (e) {
      if (kDebugMode) print('[AgentHubNotifier] Load error: $e');

      // Try offline cached installed plugins on total network failure
      try {
        final cached = await _repository.getInstalledPlugins(useCacheFallback: true);
        if (cached.isNotEmpty) {
          state = state.copyWith(
            installedPlugins: cached,
            isOfflineCached: true,
            isLoading: false,
          );
          return;
        }
      } catch (_) {}

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

  // ============================================
  // Phase 10: Marketplace & Workflow Actions
  // ============================================

  Future<bool> togglePlugin(String pluginId, bool enabled) async {
    final previous = state.installedPlugins;
    // Optimistic toggle
    state = state.copyWith(
      installedPlugins: state.installedPlugins.map((p) {
        if (p.id == pluginId) return p.copyWith(isEnabled: enabled);
        return p;
      }).toList(),
    );

    try {
      await _repository.togglePluginEnabled(pluginId, enabled);
      return true;
    } catch (e) {
      // Revert on failure
      state = state.copyWith(
        installedPlugins: previous,
        errorMessage: 'Failed to update plugin state: ${e.toString().replaceAll('Exception:', '').trim()}',
      );
      return false;
    }
  }

  Future<bool> installPlugin(String pluginId, {List<String>? requestedPermissions}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repository.installPlugin(pluginId, requestedPermissions: requestedPermissions);
      // Reload installed & marketplace plugins
      final installed = await _repository.getInstalledPlugins();
      state = state.copyWith(installedPlugins: installed, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to install plugin: ${e.toString().replaceAll('Exception:', '').trim()}',
      );
      return false;
    }
  }

  Future<bool> uninstallPlugin(String pluginId) async {
    final previous = state.installedPlugins;
    state = state.copyWith(
      installedPlugins: state.installedPlugins.where((p) => p.id != pluginId).toList(),
      isLoading: true,
      errorMessage: null,
    );

    try {
      await _repository.uninstallPlugin(pluginId);
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(
        installedPlugins: previous,
        isLoading: false,
        errorMessage: 'Failed to uninstall plugin: ${e.toString().replaceAll('Exception:', '').trim()}',
      );
      return false;
    }
  }

  Future<bool> triggerWorkflowRun(String workflowId, {Map<String, dynamic>? inputs}) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final runData = await _repository.triggerWorkflowRun(workflowId, inputs: inputs);
      final newRun = MobileWorkflowRun.fromJson(runData);
      state = state.copyWith(
        recentRuns: [newRun, ...state.recentRuns],
        activeRunsCount: state.activeRunsCount + 1,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to trigger workflow: ${e.toString().replaceAll('Exception:', '').trim()}',
      );
      return false;
    }
  }

  void addLiveSnippet(MobileLiveSnippet snippet) {
    final updated = [snippet, ...state.liveSnippets];
    if (updated.length > 50) {
      state = state.copyWith(liveSnippets: updated.sublist(0, 50));
    } else {
      state = state.copyWith(liveSnippets: updated);
    }
  }

  void clearLiveSnippets() {
    state = state.copyWith(liveSnippets: []);
  }
}

final agentHubProvider = StateNotifierProvider<AgentHubNotifier, MobileAgentHubState>((ref) {
  final repository = ref.watch(agentHubRepositoryProvider);
  final streamService = ref.watch(agentStreamServiceProvider);
  return AgentHubNotifier(repository, streamService: streamService);
});
