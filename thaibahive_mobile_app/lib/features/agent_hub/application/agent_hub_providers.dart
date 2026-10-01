// Flutter Riverpod Providers for Agentic Workflows & Multi-Agent Cockpit (AIG-023)

import 'package:flutter_riverpod/flutter_riverpod.dart';

class MobileAgentInfo {
  final String id;
  final String role;
  final String domain;
  final String status;
  final int currentLoad;
  final int maxConcurrency;

  const MobileAgentInfo({
    required this.id,
    required this.role,
    required this.domain,
    required this.status,
    required this.currentLoad,
    required this.maxConcurrency,
  });

  factory MobileAgentInfo.fromJson(Map<String, dynamic> json) {
    return MobileAgentInfo(
      id: json['id'] ?? '',
      role: json['role'] ?? '',
      domain: json['domain'] ?? '',
      status: json['status'] ?? 'idle',
      currentLoad: json['currentLoad'] ?? 0,
      maxConcurrency: json['maxConcurrency'] ?? 5,
    );
  }
}

class MobileApprovalGate {
  final String id;
  final String runId;
  final String requiredPermission;
  final String severity;
  final String status;
  final String createdAt;

  const MobileApprovalGate({
    required this.id,
    required this.runId,
    required this.requiredPermission,
    required this.severity,
    required this.status,
    required this.createdAt,
  });

  factory MobileApprovalGate.fromJson(Map<String, dynamic> json) {
    return MobileApprovalGate(
      id: json['id'] ?? '',
      runId: json['runId'] ?? '',
      requiredPermission: json['requiredPermission'] ?? 'agent:workflows:approve',
      severity: json['severity'] ?? 'medium',
      status: json['status'] ?? 'pending',
      createdAt: json['createdAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class MobileAgentHubState {
  final List<MobileAgentInfo> agents;
  final List<MobileApprovalGate> pendingApprovals;
  final int activeRunsCount;
  final bool isKillSwitchEngaged;
  final bool isLoading;
  final String? errorMessage;

  const MobileAgentHubState({
    required this.agents,
    required this.pendingApprovals,
    required this.activeRunsCount,
    required this.isKillSwitchEngaged,
    required this.isLoading,
    this.errorMessage,
  });

  MobileAgentHubState copyWith({
    List<MobileAgentInfo>? agents,
    List<MobileApprovalGate>? pendingApprovals,
    int? activeRunsCount,
    bool? isKillSwitchEngaged,
    bool? isLoading,
    String? errorMessage,
  }) {
    return MobileAgentHubState(
      agents: agents ?? this.agents,
      pendingApprovals: pendingApprovals ?? this.pendingApprovals,
      activeRunsCount: activeRunsCount ?? this.activeRunsCount,
      isKillSwitchEngaged: isKillSwitchEngaged ?? this.isKillSwitchEngaged,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class AgentHubNotifier extends StateNotifier<MobileAgentHubState> {
  AgentHubNotifier()
      : super(const MobileAgentHubState(
          agents: [
            MobileAgentInfo(id: 'academic-agent', role: 'Academic Orchestrator', domain: 'academic', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'finance-agent', role: 'Finance Reconciliation', domain: 'finance', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'security-agent', role: 'Perimeter Safety Agent', domain: 'security', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'facilities-agent', role: 'Campus IoT & HVAC', domain: 'facilities', status: 'idle', currentLoad: 0, maxConcurrency: 5),
            MobileAgentInfo(id: 'hr-agent', role: 'Faculty Operations', domain: 'hr', status: 'idle', currentLoad: 0, maxConcurrency: 5),
          ],
          pendingApprovals: [],
          activeRunsCount: 0,
          isKillSwitchEngaged: false,
          isLoading: false,
        ));

  Future<void> refreshHub() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    await Future.delayed(const Duration(milliseconds: 300));
    state = state.copyWith(isLoading: false);
  }

  Future<bool> decideApproval(String gateId, String decision) async {
    state = state.copyWith(isLoading: true);
    await Future.delayed(const Duration(milliseconds: 250));
    final updated = state.pendingApprovals.where((g) => g.id != gateId).toList();
    state = state.copyWith(pendingApprovals: updated, isLoading: false);
    return true;
  }
}

final agentHubProvider = StateNotifierProvider<AgentHubNotifier, MobileAgentHubState>((ref) {
  return AgentHubNotifier();
});
