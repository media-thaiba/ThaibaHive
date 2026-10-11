import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/agent_hub/data/models/agent_models.dart';

void main() {
  group('AIGENT-OS Mobile Data Models Tests (MOB-001)', () {
    test('MobileAgentInfo parses JSON and serializes correctly', () {
      final json = {
        'id': 'academic-agent',
        'role': 'Academic Orchestrator',
        'domain': 'academic',
        'status': 'busy',
        'currentLoad': 2,
        'maxConcurrency': 10,
        'capabilities': ['timetable', 'exam', 'grading'],
        'lastActiveAt': '2026-10-01T12:00:00.000Z',
      };

      final agent = MobileAgentInfo.fromJson(json);

      expect(agent.id, 'academic-agent');
      expect(agent.role, 'Academic Orchestrator');
      expect(agent.domain, 'academic');
      expect(agent.status, 'busy');
      expect(agent.currentLoad, 2);
      expect(agent.maxConcurrency, 10);
      expect(agent.capabilities, contains('grading'));
      expect(agent.lastActiveAt, '2026-10-01T12:00:00.000Z');

      final serialized = agent.toJson();
      expect(serialized['id'], 'academic-agent');
      expect(serialized['status'], 'busy');
    });

    test('MobileApprovalGate parses JSON and evaluates severity helpers', () {
      final criticalJson = {
        'id': 'gate-101',
        'runId': 'run-202',
        'requiredPermission': 'finance:fee:reconcile',
        'severity': 'critical',
        'status': 'pending',
        'actionType': 'Post Reconciled Ledger',
        'payload': {'amount': 500000},
        'createdAt': '2026-10-01T12:30:00.000Z',
      };

      final gate = MobileApprovalGate.fromJson(criticalJson);

      expect(gate.id, 'gate-101');
      expect(gate.runId, 'run-202');
      expect(gate.isCritical, true);
      expect(gate.isHigh, false);
      expect(gate.actionType, 'Post Reconciled Ledger');
      expect(gate.payload?['amount'], 500000);

      final serialized = gate.toJson();
      expect(serialized['id'], 'gate-101');
      expect(serialized['severity'], 'critical');
    });

    test('MobileWorkflowRun parses JSON correctly', () {
      final json = {
        'id': 'run-999',
        'workflowId': 'wf-auto-attendance',
        'workflowName': 'Automated Daily Attendance',
        'status': 'running',
        'currentStep': 3,
        'totalSteps': 5,
        'startedAt': '2026-10-01T08:00:00.000Z',
        'durationMs': 1250,
      };

      final run = MobileWorkflowRun.fromJson(json);

      expect(run.id, 'run-999');
      expect(run.workflowId, 'wf-auto-attendance');
      expect(run.workflowName, 'Automated Daily Attendance');
      expect(run.status, 'running');
      expect(run.currentStep, 3);
      expect(run.totalSteps, 5);
      expect(run.durationMs, 1250);
    });

    test('MobileAgentPlugin parses JSON with capabilities and granted permissions', () {
      final json = {
        'id': 'plug-1',
        'pluginKey': 'thaiba.finance.reconciler',
        'displayName': 'Finance Reconciler Plugin',
        'summary': 'Automated 3-way matching and ledger reconciler',
        'version': '1.2.0',
        'category': 'finance',
        'ratingAvg': 4.8,
        'ratingCount': 24,
        'installedCount': 120,
        'capabilities': ['reconcile', 'export_csv'],
        'manifest': {'entrypoint': 'index.js'},
        'isInstalled': true,
        'enabled': true,
        'grantedPermissions': ['finance:ledger:read', 'finance:ledger:write'],
        'authorVerified': true,
        'scope': 'institution',
      };

      final plugin = MobileAgentPlugin.fromJson(json);

      expect(plugin.id, 'plug-1');
      expect(plugin.pluginKey, 'thaiba.finance.reconciler');
      expect(plugin.displayName, 'Finance Reconciler Plugin');
      expect(plugin.ratingAvg, 4.8);
      expect(plugin.capabilities, contains('reconcile'));
      expect(plugin.isInstalled, true);
      expect(plugin.isEnabled, true);
      expect(plugin.grantedPermissions, contains('finance:ledger:write'));
      expect(plugin.authorVerified, true);
      expect(plugin.scope, 'institution');

      final serialized = plugin.toJson();
      expect(serialized['id'], 'plug-1');
      expect(serialized['pluginKey'], 'thaiba.finance.reconciler');
    });

    test('MobileLiveSnippet parses transcript and hazard segments', () {
      final json = {
        'id': 'snip-10',
        'sessionId': 'session-xyz',
        'speaker': 'gemini_live',
        'text': 'The library room shows an open fire exit door.',
        'hazardType': 'fire_exit_breach',
        'severity': 'high',
        'timestamp': '2026-10-11T12:00:00.000Z',
      };

      final snippet = MobileLiveSnippet.fromJson(json);

      expect(snippet.id, 'snip-10');
      expect(snippet.speaker, 'gemini_live');
      expect(snippet.isHazard, true);
      expect(snippet.hazardType, 'fire_exit_breach');
      expect(snippet.severity, 'high');

      final serialized = snippet.toJson();
      expect(serialized['hazardType'], 'fire_exit_breach');
    });
  });
}
