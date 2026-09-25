// Flutter unit tests for SafeCampus OS & Vision Shield Providers (VISION-022)

import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/vision/application/vision_providers.dart';

void main() {
  group('SafeCampus OS & Vision Shield Mobile State Models', () {
    test('CampusSafetyStatus should parse from JSON correctly', () {
      final json = {
        'safetyLevel': 'normal',
        'activeIncidentsCount': 0,
        'guardsOnDuty': 6,
        'isLockdownActive': false,
        'lastAuditTimestamp': '2026-08-21T10:00:00Z',
      };

      final status = CampusSafetyStatus.fromJson(json);
      expect(status.safetyLevel, 'normal');
      expect(status.activeIncidentsCount, 0);
      expect(status.guardsOnDuty, 6);
      expect(status.isLockdownActive, false);
    });

    test('GuardPatrolNotifier should update dispatch task status', () {
      final notifier = GuardPatrolNotifier();
      expect(notifier.state.length, 1);
      expect(notifier.state.first.status, 'dispatched');

      notifier.updateTaskStatus('dsp_01', 'on_scene');
      expect(notifier.state.first.status, 'on_scene');
    });

    test('SafeWalkNotifier should transition escort state accurately', () {
      final notifier = SafeWalkNotifier();
      expect(notifier.state.isRequested, false);

      notifier.requestEscort('Library', 'North Dorm');
      expect(notifier.state.isRequested, true);
      expect(notifier.state.pickupLocation, 'Library');
      expect(notifier.state.assignedGuardCallSign, 'Alpha-Patrol');

      notifier.completeEscort();
      expect(notifier.state.isRequested, false);
      expect(notifier.state.status, 'completed');
    });
  });
}
