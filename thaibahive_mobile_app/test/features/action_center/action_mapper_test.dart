import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/services/fcm_service.dart';
import 'package:thaibahive_mobile/features/action_center/action_mapper.dart';
import 'package:thaibahive_mobile/features/action_center/action_state_machine.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';

void main() {
  group('ActionMapper — SSE frames', () {
    test('canonical {type:new, notification:{…}} frame maps fully', () {
      final item = ActionMapper.fromSsePayload({
        'type': 'new',
        'notification': {
          'id': 'n42',
          'type': 'leave',
          'referenceType': 'leaveRequest',
          'referenceId': 'lr-9',
          'title': 'Leave approved',
          'message': 'Your leave was approved',
          'isRead': false,
          'createdAt': '2026-10-06T08:00:00.000Z',
        },
      });
      expect(item, isNotNull);
      expect(item!.dedupeKey, 'notification:n42');
      expect(item.route, '/leaves/lr-9');
      expect(item.priority, ActionPriority.urgent);
      expect(item.source, ActionSource.sse);
      expect(item.title, 'Leave approved');
    });

    test('legacy {type:new_notification, notificationId, …} frame maps best-effort',
        () {
      final item = ActionMapper.fromSsePayload({
        'type': 'new_notification',
        'notificationId': 'legacy-1',
        'title': 'Heads up',
        'message': 'Something happened',
      });
      expect(item, isNotNull);
      expect(item!.dedupeKey, 'notification:legacy-1');
      expect(item.route, '/notifications');
      expect(item.priority, ActionPriority.normal);
      expect(item.source, ActionSource.sse);
    });

    test('refresh / unknown frames are not actions', () {
      expect(ActionMapper.fromSsePayload({'type': 'refresh'}), isNull);
      expect(ActionMapper.fromSsePayload({'type': 'heartbeat'}), isNull);
      expect(ActionMapper.fromSsePayload({'type': 'new'}), isNull);
      expect(
        ActionMapper.fromSsePayload({
          'type': 'new_notification',
          'title': 'no id',
        }),
        isNull,
      );
    });
  });

  group('ActionMapper — FCM', () {
    test('data payload with type routes through the allowlist', () {
      final item = ActionMapper.fromFcmData(
        {'type': 'leave', 'id': 'lr-7'},
        title: 'Leave decision',
        body: 'Approved',
      );
      expect(item, isNotNull);
      expect(item!.route, '/leaves/lr-7');
      expect(item.priority, ActionPriority.urgent);
      expect(item.source, ActionSource.fcm);
      expect(item.dedupeKey, 'notification:lr-7');
    });

    test('circular type routes to /circulars (allowlist extended in step 5)',
        () {
      final item = ActionMapper.fromFcmData({'type': 'circular', 'id': 'c1'});
      expect(item!.route, '/circulars');
    });

    test('unknown type never falls to a dead route', () {
      final item = ActionMapper.fromFcmData({'type': 'mystery', 'id': 'x1'});
      expect(item!.route, '/notifications');
    });

    test('missing notification id yields no action', () {
      expect(ActionMapper.fromFcmData({'type': 'general'}), isNull);
      expect(ActionMapper.fromFcmData(const {}), isNull);
      expect(
        ActionMapper.fromFcmData({'type': 'general', 'id': 'g1'}),
        isNotNull,
        reason: 'data.id is a valid fallback notification id',
      );
    });

    test('route allowlist neutralizes unknown paths', () {
      expect(FCMService.validateAndWhitelistRoute('/evil'), '/');
      expect(FCMService.validateAndWhitelistRoute('/tasks'), '/tasks');
      expect(FCMService.validateAndWhitelistRoute('/circulars'), '/circulars');
    });
  });

  group('ActionMapper — pull: notifications', () {
    test('camelCase unread notification maps; read is skipped', () {
      final item = ActionMapper.fromNotificationJson({
        'id': 'n1',
        'type': 'announcement',
        'title': 'Sports day',
        'message': 'Friday',
        'referenceId': 'ann-5',
        'isRead': false,
        'createdAt': '2026-10-06T09:00:00.000Z',
      });
      expect(item, isNotNull);
      expect(item!.dedupeKey, 'notification:n1');
      expect(item.route, '/announcements/ann-5');
      expect(item.source, ActionSource.pull);

      expect(
        ActionMapper.fromNotificationJson({'id': 'n2', 'isRead': true}),
        isNull,
      );
    });

    test('snake_case fallback parses (is_read/created_at/related_id)', () {
      final item = ActionMapper.fromNotificationJson({
        'id': 'n3',
        'type': 'task',
        'title': 'T',
        'is_read': false,
        'related_id': 't-9',
        'created_at': '2026-10-05T10:00:00.000Z',
      });
      expect(item, isNotNull);
      expect(item!.route, '/tasks/t-9');
      expect(item.priority, ActionPriority.high);
    });
  });

  group('ActionMapper — pull: tasks / tickets / approvals', () {
    test('completed task skipped; overdue task is high, far-future normal', () {
      expect(
        ActionMapper.fromTaskJson({'id': 't1', 'status': 'completed'}),
        isNull,
      );
      expect(
        ActionMapper.fromTaskJson({'id': 't2', 'status': 'cancelled'}),
        isNull,
      );

      final overdue = ActionMapper.fromTaskJson({
        'id': 't3',
        'title': 'Pay fees',
        'status': 'todo',
        'dueDate': '2026-10-05',
      }, now: DateTime(2026, 10, 6));
      expect(overdue!.priority, ActionPriority.high);
      expect(overdue.dedupeKey, 'task:t3');

      final later = ActionMapper.fromTaskJson({
        'id': 't4',
        'title': 'Later',
        'status': 'todo',
        'dueDate': '2026-12-01',
      }, now: DateTime(2026, 10, 6));
      expect(later!.priority, ActionPriority.normal);
    });

    test('resolved/closed tickets skipped; open ticket is high', () {
      expect(
        ActionMapper.fromTicketJson({'id': 'h1', 'status': 'resolved'}),
        isNull,
      );
      expect(
        ActionMapper.fromTicketJson({'id': 'h2', 'status': 'closed'}),
        isNull,
      );
      final open = ActionMapper.fromTicketJson({
        'id': 'h3',
        'title': 'Wi-Fi down',
        'status': 'open',
        'description': 'Hostel',
      });
      expect(open!.priority, ActionPriority.high);
      expect(open.dedupeKey, 'helpdesk:h3');
      expect(open.route, '/help-desk');
    });

    test('only pending approvals are urgent actions', () {
      final pending = ActionMapper.fromApprovalJson({
        'id': 'lr-1',
        'type': 'leave',
        'title': 'Leave Request',
        'submittedBy': 'Ravi K',
        'status': 'pending',
        'submittedAt': '2026-10-06T07:00:00.000Z',
      });
      expect(pending, isNotNull);
      expect(pending!.priority, ActionPriority.urgent);
      expect(pending.dedupeKey, 'approval:leave:lr-1');
      expect(pending.route, '/approvals');
      expect(pending.description, 'From Ravi K');

      expect(
        ActionMapper.fromApprovalJson({
          'id': 'lr-2',
          'type': 'leave',
          'status': 'approved',
        }),
        isNull,
      );
      expect(
        ActionMapper.fromApprovalJson({'id': 'x'}),
        isNull,
        reason: 'missing type',
      );
    });
  });
}
