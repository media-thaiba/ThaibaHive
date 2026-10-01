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
  });
}
