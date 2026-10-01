import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import 'models/agent_models.dart';

final agentHubRepositoryProvider = Provider<AgentHubRepository>((ref) {
  return AgentHubRepository(ref.watch(apiClientProvider));
});

class AgentHubRepository {
  final ApiClient _api;

  AgentHubRepository(this._api);

  Future<List<MobileAgentInfo>> getAgents() async {
    try {
      final data = await _api.get(
        '/agents',
        fromJson: (json) {
          final list = (json is Map ? (json['agents'] ?? json['data']) : json) as List<dynamic>? ?? [];
          return list.map((e) => MobileAgentInfo.fromJson(e as Map<String, dynamic>)).toList();
        },
      );
      return data;
    } catch (_) {
      // Fallback default domain agents if network is unseeded or offline
      return const [
        MobileAgentInfo(id: 'academic-agent', role: 'Academic Orchestrator', domain: 'academic', status: 'idle', currentLoad: 0, maxConcurrency: 5),
        MobileAgentInfo(id: 'finance-agent', role: 'Finance Reconciliation', domain: 'finance', status: 'idle', currentLoad: 0, maxConcurrency: 5),
        MobileAgentInfo(id: 'security-agent', role: 'Perimeter Safety Agent', domain: 'security', status: 'idle', currentLoad: 0, maxConcurrency: 5),
        MobileAgentInfo(id: 'facilities-agent', role: 'Campus IoT & HVAC', domain: 'facilities', status: 'idle', currentLoad: 0, maxConcurrency: 5),
        MobileAgentInfo(id: 'hr-agent', role: 'Faculty Operations', domain: 'hr', status: 'idle', currentLoad: 0, maxConcurrency: 5),
      ];
    }
  }

  Future<List<MobileApprovalGate>> getPendingApprovals() async {
    try {
      final data = await _api.get(
        '/agents/approvals',
        fromJson: (json) {
          final list = (json is Map ? (json['gates'] ?? json['approvals'] ?? json['data']) : json) as List<dynamic>? ?? [];
          return list.map((e) => MobileApprovalGate.fromJson(e as Map<String, dynamic>)).toList();
        },
      );
      return data;
    } catch (_) {
      return const [];
    }
  }

  Future<List<MobileWorkflowRun>> getActiveRuns() async {
    try {
      final data = await _api.get(
        '/agents/runs',
        fromJson: (json) {
          final list = (json is Map ? (json['runs'] ?? json['data']) : json) as List<dynamic>? ?? [];
          return list.map((e) => MobileWorkflowRun.fromJson(e as Map<String, dynamic>)).toList();
        },
      );
      return data;
    } catch (_) {
      return const [];
    }
  }

  Future<bool> decideApproval(
    String gateId, {
    required String decision, // "approved" or "rejected"
    String? notes,
  }) async {
    await _api.post(
      '/agents/approvals',
      data: {
        'gateId': gateId,
        'decision': decision,
        if (notes != null) 'notes': notes,
        'actorSource': 'mobile',
      },
    );
    return true;
  }

  Future<bool> getKillSwitchStatus() async {
    try {
      final data = await _api.get(
        '/agents/killswitch',
        fromJson: (json) {
          if (json is Map) {
            return json['isEngaged'] == true || json['halted'] == true;
          }
          return false;
        },
      );
      return data;
    } catch (_) {
      return false;
    }
  }
}
