import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/network/providers.dart';
import 'models/agent_models.dart';

final agentHubRepositoryProvider = Provider<AgentHubRepository>((ref) {
  return AgentHubRepository(ref.watch(apiClientProvider));
});

class AgentHubRepository {
  final ApiClient _api;

  AgentHubRepository(this._api);

  Future<List<MobileAgentInfo>> getAgents() async {
    final data = await _api.get(
      '/agents',
      fromJson: (json) {
        final list = (json is Map ? (json['agents'] ?? json['data']) : json) as List<dynamic>? ?? [];
        return list.map((e) => MobileAgentInfo.fromJson(e as Map<String, dynamic>)).toList();
      },
    );
    return data;
  }

  Future<List<MobileApprovalGate>> getPendingApprovals() async {
    final data = await _api.get(
      '/agents/approvals',
      fromJson: (json) {
        final list = (json is Map
            ? (json['approvalGates'] ?? json['gates'] ?? json['approvals'] ?? json['data'])
            : json) as List<dynamic>? ?? [];
        return list.map((e) => MobileApprovalGate.fromJson(e as Map<String, dynamic>)).toList();
      },
    );
    return data;
  }

  Future<List<MobileWorkflowRun>> getActiveRuns() async {
    final data = await _api.get(
      '/agents/runs',
      fromJson: (json) {
        final list = (json is Map ? (json['runs'] ?? json['data']) : json) as List<dynamic>? ?? [];
        return list.map((e) => MobileWorkflowRun.fromJson(e as Map<String, dynamic>)).toList();
      },
    );
    return data;
  }

  Future<bool> decideApproval(
    String gateId, {
    required String decision, // "approved" or "rejected"
    String? reason,
  }) async {
    try {
      await _api.post(
        '/agents/approvals/$gateId/decide',
        data: {
          'decision': decision,
          'reason': reason ?? 'Decided via ThaibaHive mobile companion',
        },
      );
      return true;
    } on AppException catch (e) {
      if (e.statusCode == 409) {
        throw ApprovalConflictException(
          e.message.isNotEmpty
              ? e.message
              : 'Approval conflict (D14): gate has already been resolved or expired.',
        );
      }
      rethrow;
    }
  }

  Future<bool> getKillSwitchStatus() async {
    try {
      final data = await _api.get(
        '/agents/guardrails/killswitch',
        fromJson: (json) {
          if (json is Map) {
            return json['engaged'] == true || json['isEngaged'] == true || json['halted'] == true;
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

class ApprovalConflictException implements Exception {
  final String message;
  const ApprovalConflictException(this.message);

  @override
  String toString() => message;
}
