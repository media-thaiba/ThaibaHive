import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

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

  // ============================================
  // Phase 10: Agent Marketplace & Live Multimodal Extensions
  // ============================================

  Future<List<MobileAgentPlugin>> getInstalledPlugins({
    FlutterSecureStorage? storage,
    bool useCacheFallback = true,
  }) async {
    final secureStorage = storage ?? const FlutterSecureStorage();
    const cacheKey = 'cache_installed_plugins';

    try {
      final data = await _api.get(
        '/agent-plugins/installations',
        fromJson: (json) {
          final list = (json is Map ? (json['installations'] ?? json['data']) : json) as List<dynamic>? ?? [];
          return list.map((item) {
            final map = item as Map<String, dynamic>;
            final plugin = map['plugin'] as Map<String, dynamic>? ?? {};
            return MobileAgentPlugin.fromJson({
              ...plugin,
              'installationId': map['id'],
              'isInstalled': true,
              'enabled': map['enabled'],
              'grantedToolPermissions': map['grantedToolPermissionsJson'] is String
                  ? (map['grantedToolPermissionsJson'] as String).isNotEmpty
                      ? (jsonDecode(map['grantedToolPermissionsJson']) as List)
                      : []
                  : (map['grantedToolPermissions'] ?? map['grantedPermissions']),
            });
          }).toList();
        },
      );

      // Save to offline cache
      try {
        final serialized = jsonEncode(data.map((p) => p.toJson()).toList());
        await secureStorage.write(key: cacheKey, value: serialized);
      } catch (_) {}

      return data;
    } catch (e) {
      if (useCacheFallback) {
        try {
          final cached = await secureStorage.read(key: cacheKey);
          if (cached != null && cached.isNotEmpty) {
            final decoded = jsonDecode(cached) as List<dynamic>;
            return decoded
                .map((m) => MobileAgentPlugin.fromJson(m as Map<String, dynamic>))
                .toList();
          }
        } catch (_) {}
      }
      rethrow;
    }
  }

  Future<List<MobileAgentPlugin>> getMarketplacePlugins() async {
    final data = await _api.get(
      '/agent-plugins',
      fromJson: (json) {
        final list = (json is Map ? (json['plugins'] ?? json['data']) : json) as List<dynamic>? ?? [];
        return list.map((e) => MobileAgentPlugin.fromJson(e as Map<String, dynamic>)).toList();
      },
    );
    return data;
  }

  Future<bool> togglePluginEnabled(String pluginId, bool enabled) async {
    await _api.post(
      '/agent-plugins/$pluginId/install',
      data: {'enabled': enabled},
    );
    return true;
  }

  Future<bool> installPlugin(String pluginId, {List<String>? requestedPermissions}) async {
    await _api.post(
      '/agent-plugins/$pluginId/install',
      data: {
        'requestedPermissions': requestedPermissions,
        'enabled': true,
      },
    );
    return true;
  }

  Future<bool> uninstallPlugin(String pluginId) async {
    await _api.delete('/agent-plugins/$pluginId/install');
    return true;
  }

  Future<Map<String, dynamic>> triggerWorkflowRun(
    String workflowId, {
    Map<String, dynamic>? inputs,
  }) async {
    final data = await _api.post(
      '/agents/runs',
      data: {
        'workflowId': workflowId,
        'input': inputs ?? {},
      },
      fromJson: (json) => json is Map<String, dynamic> ? json : <String, dynamic>{},
    );
    return data;
  }

  Future<List<MobileLiveSnippet>> getLiveSnippets(String sessionId) async {
    final data = await _api.get(
      '/live/sessions/$sessionId',
      fromJson: (json) {
        if (json is Map) {
          final session = json['session'] as Map<String, dynamic>? ?? json;
          final segments = session['segments'] as List<dynamic>? ?? [];
          return segments.map((s) {
            final seg = s as Map<String, dynamic>;
            final payload = seg['payload'] as Map<String, dynamic>? ?? {};
            return MobileLiveSnippet(
              id: seg['id']?.toString() ?? '',
              sessionId: sessionId,
              speaker: payload['speaker']?.toString() ?? seg['segmentType']?.toString() ?? 'system',
              text: payload['text']?.toString() ?? payload['description']?.toString() ?? '',
              hazardType: payload['hazardType']?.toString(),
              severity: payload['severity']?.toString(),
              timestamp: seg['createdAt']?.toString() ?? DateTime.now().toIso8601String(),
            );
          }).toList();
        }
        return <MobileLiveSnippet>[];
      },
    );
    return data;
  }
}

class ApprovalConflictException implements Exception {
  final String message;
  const ApprovalConflictException(this.message);

  @override
  String toString() => message;
}
