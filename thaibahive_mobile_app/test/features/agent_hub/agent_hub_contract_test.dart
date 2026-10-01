import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/network/api_exception.dart';
import 'package:thaibahive_mobile/features/agent_hub/data/agent_hub_repository.dart';
import 'package:thaibahive_mobile/features/agent_hub/data/models/agent_models.dart';

class CapturingApiClient extends ApiClient {
  String? lastGetPath;
  String? lastPostPath;
  dynamic lastPostData;

  int? mockStatusCode;
  dynamic mockResponseData;

  CapturingApiClient() : super(baseUrl: 'http://localhost');

  @override
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    lastGetPath = path;

    if (mockStatusCode != null && mockStatusCode! >= 400) {
      throw AppException(
        message: 'HTTP Error $mockStatusCode',
        statusCode: mockStatusCode,
      );
    }

    final data = mockResponseData;
    return fromJson != null ? fromJson(data) : data as T;
  }

  @override
  Future<T> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? fromJson,
  }) async {
    lastPostPath = path;
    lastPostData = data;

    if (mockStatusCode != null && mockStatusCode! >= 400) {
      throw AppException(
        message: 'Approval conflict: gate has already been resolved or expired.',
        statusCode: mockStatusCode,
      );
    }

    final res = mockResponseData ?? {'result': {'success': true}};
    return fromJson != null ? fromJson(res) : res as T;
  }
}

void main() {
  group('AIGENT-OS Server Contract Alignment Tests', () {
    late CapturingApiClient capturingApi;
    late AgentHubRepository repository;

    setUp(() {
      capturingApi = CapturingApiClient();
      repository = AgentHubRepository(capturingApi);
    });

    test('getPendingApprovals hits /agents/approvals and parses {approvalGates: [...]}', () async {
      capturingApi.mockResponseData = {
        'approvalGates': [
          {
            'id': 'gate_srv_001',
            'runId': 'run_srv_001',
            'requiredPermission': 'finance:fees:write',
            'severity': 'critical',
            'status': 'pending',
            'createdAt': '2026-10-01T15:00:00.000Z',
          }
        ],
        'total': 1,
      };

      final gates = await repository.getPendingApprovals();

      expect(capturingApi.lastGetPath, '/agents/approvals');
      expect(gates.length, 1);
      expect(gates.first.id, 'gate_srv_001');
      expect(gates.first.requiredPermission, 'finance:fees:write');
      expect(gates.first.isCritical, true);
    });

    test('decideApproval hits /agents/approvals/{id}/decide with {decision, reason}', () async {
      final success = await repository.decideApproval(
        'gate_srv_001',
        decision: 'approved',
        reason: 'Supervisor approved from mobile device',
      );

      expect(success, true);
      expect(capturingApi.lastPostPath, '/agents/approvals/gate_srv_001/decide');
      expect(capturingApi.lastPostData, {
        'decision': 'approved',
        'reason': 'Supervisor approved from mobile device',
      });
    });

    test('decideApproval surfaces 409 as ApprovalConflictException (D14)', () async {
      capturingApi.mockStatusCode = 409;

      expect(
        () => repository.decideApproval('gate_srv_001', decision: 'rejected'),
        throwsA(isA<ApprovalConflictException>().having(
          (e) => e.message,
          'message',
          contains('Approval conflict'),
        )),
      );
    });

    test('getKillSwitchStatus hits /agents/guardrails/killswitch and parses {engaged: true}', () async {
      capturingApi.mockResponseData = {
        'engaged': true,
        'tenantId': 'inst_alpha',
      };

      final isEngaged = await repository.getKillSwitchStatus();

      expect(capturingApi.lastGetPath, '/agents/guardrails/killswitch');
      expect(isEngaged, true);
    });

    test('getAgents hits /agents and parses {agents: [...]}', () async {
      capturingApi.mockResponseData = {
        'agents': [
          {
            'id': 'finance-agent',
            'role': 'Finance Reconciliation',
            'domain': 'finance',
            'status': 'busy',
            'currentLoad': 3,
            'maxConcurrency': 5,
          }
        ]
      };

      final agents = await repository.getAgents();

      expect(capturingApi.lastGetPath, '/agents');
      expect(agents.length, 1);
      expect(agents.first.id, 'finance-agent');
      expect(agents.first.currentLoad, 3);
    });
  });
}
