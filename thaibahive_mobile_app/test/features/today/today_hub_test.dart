import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/circulars/data/circulars_repository.dart';
import 'package:thaibahive_mobile/features/polls/data/polls_repository.dart';
import 'package:thaibahive_mobile/features/timeline/data/timeline_repository.dart';
import 'package:thaibahive_mobile/features/today/data/today_hub_provider.dart';
import 'package:thaibahive_mobile/models/circular_model.dart';
import 'package:thaibahive_mobile/models/notification_model.dart';
import 'package:thaibahive_mobile/models/poll_model.dart';

void main() {
  group('TodayHubManifest parsing', () {
    test('parses the real endpoint shape and orders enabled sections', () {
      final manifest = TodayHubManifest.fromJson({
        'version': 2,
        'generatedAt': '2026-10-06T08:00:00.000Z',
        'quickActions': [
          {
            'id': 'canteen.order.create',
            'label': 'Canteen',
            'icon': 'restaurant',
            'route': '/canteen',
            'capability': 'canteen.order.create',
            'tier': 1,
            'requiresWebHandoff': false,
          },
        ],
        'sections': [
          {'id': 'timeline', 'priority': 4, 'enabled': true, 'maxItems': 5},
          {'id': 'attendance', 'priority': 2, 'enabled': true},
          {
            'id': 'quick_actions',
            'priority': 3,
            'enabled': false,
            'maxItems': 4,
          },
          {'id': 'brand_new_section', 'priority': 9, 'enabled': true},
        ],
      });

      expect(manifest.version, 2);
      expect(manifest.quickActions.single.route, '/canteen');

      final ordered = manifest.orderedEnabledSections.map((s) => s.id).toList();
      expect(ordered, ['attendance', 'timeline', 'brand_new_section']);
      expect(
        ordered.contains('quick_actions'),
        isFalse,
        reason: 'disabled sections are dropped',
      );
    });

    test('malformed manifest degrades to empty, not a crash', () {
      final manifest = TodayHubManifest.fromJson(const {});
      expect(manifest.quickActions, isEmpty);
      expect(manifest.sections, isEmpty);
      expect(manifest.orderedEnabledSections, isEmpty);
    });

    test('fallback manifest matches the pre-SDUI order and routes', () {
      final ids =
          kFallbackTodayHubManifest.orderedEnabledSections.map((s) => s.id);
      expect(
        ids,
        ['urgent_actions', 'attendance', 'quick_actions', 'timeline', 'circular'],
      );
      expect(kFallbackTodayHubManifest.quickActions, hasLength(4));
      for (final action in kFallbackTodayHubManifest.quickActions) {
        expect(action.route, startsWith('/'));
        expect(action.route, isNot('/'));
      }
    });

    test('icon/color helpers resolve known entries and safe defaults', () {
      expect(quickActionIcon('restaurant'), Icons.restaurant_rounded);
      expect(quickActionIcon('nope'), Icons.apps_rounded);
      expect(
        quickActionColor('canteen.order.create'),
        const Color(0xFFF57C00),
      );
      expect(quickActionColor('unknown.id'), const Color(0xFF616161));
    });
  });

  group('P4 timeline — activity-logs envelope (D10)', () {
    test('parseLogs maps {logs, total, page, limit} rows', () {
      final items = TimelineRepository.parseLogs({
        'logs': [
          {
            'id': 42,
            'action': 'leave.approve',
            'resourceType': 'leave_request',
            'resourceId': 'lr-9',
            'details': 'Approved leave for Ravi',
            'createdAt': '2026-10-06T09:30:00.000Z',
            'staffId': 's1',
          },
          {
            'id': 43,
            'action': 'auth.login',
            'resourceType': 'session',
            'details': null,
            'createdAt': '2026-10-06T08:00:00.000Z',
          },
        ],
        'total': 2,
        'page': 1,
        'limit': 10,
      });

      expect(items, hasLength(2));
      expect(items.first.id, '42', reason: 'numeric id → String(id)');
      expect(items.first.type, 'leave.approve');
      expect(items.first.title, 'Approved leave for Ravi');
      expect(items.first.timestamp.isUtc, isTrue);

      expect(items.last.type, 'auth.login');
      expect(items.last.title, 'auth.login', reason: 'falls back to action');
    });

    test('parseLogs tolerates a bare list and garbage', () {
      expect(TimelineRepository.parseLogs([1, 2, 3]), isEmpty);
      expect(TimelineRepository.parseLogs('nope'), isEmpty);
      expect(TimelineRepository.parseLogs({'logs': 'bad'}), isEmpty);
    });
  });

  group('P5 D14* — circulars/polls envelopes', () {
    test('circulars parse {circulars:[…]} with camelCase server rows', () {
      final list = CircularsRepository.parseList({
        'circulars': [
          {
            'id': 'c1',
            'title': 'Term plan',
            'description': 'Read carefully',
            'fileUrl': 'https://files/c1.pdf',
            'fileType': 'pdf',
            'uploadedById': 's1',
            'category': 'academic',
            'createdAt': '2026-10-06T07:00:00.000Z',
          },
        ],
      });
      expect(list, hasLength(1));
      expect(list.single.title, 'Term plan');
      expect(list.single.fileUrl, 'https://files/c1.pdf');
      expect(list.single.uploadedById, 's1');
    });

    test('circulars old data/bare-list shapes still work', () {
      expect(
        CircularsRepository.parseList({
          'data': [
            {
              'id': 'c2',
              'title': 'Legacy',
              'file_url': 'f',
              'uploaded_by_id': 's',
              'created_at': '2026-10-06T07:00:00.000Z',
            },
          ],
        }),
        hasLength(1),
      );
      expect(CircularsRepository.parseList('bad'), isEmpty);
    });

    test('polls parse {polls:[…]} with camelCase rows and options', () {
      final list = PollsRepository.parseList({
        'polls': [
          {
            'id': 'p1',
            'title': 'Best day?',
            'options': [
              {'id': 'o1', 'pollId': 'p1', 'text': 'Mon', 'voteCount': 3},
            ],
            'expiresAt': '2026-10-10T00:00:00.000Z',
            'isActive': true,
            'createdById': 's1',
            'createdAt': '2026-10-06T07:00:00.000Z',
          },
        ],
      });
      expect(list, hasLength(1));
      expect(list.single.options.single.voteCount, 3);
      expect(list.single.isActive, isTrue);
    });
  });

  group('Model tolerance (camelCase server rows)', () {
    test('NotificationModel parses real notifications rows', () {
      final model = NotificationModel.fromJson({
        'id': 'n1',
        'staffId': 's9',
        'title': 'Leave decision',
        'message': 'Approved',
        'type': 'leave',
        'referenceType': 'leaveRequest',
        'referenceId': 'lr-1',
        'isRead': false,
        'createdAt': '2026-10-06T10:00:00.000Z',
      });
      expect(model.id, 'n1');
      expect(model.userId, 's9');
      expect(model.relatedId, 'lr-1');
      expect(model.relatedType, 'leaveRequest');
      expect(model.isRead, isFalse);
      expect(model.createdAt, DateTime.parse('2026-10-06T10:00:00.000Z'));
    });

    test('NotificationModel tolerates sparse/legacy payloads', () {
      final legacy = NotificationModel.fromJson({
        'id': 'n2',
        'user_id': 'u1',
        'type': 'task',
        'title': 'T',
        'is_read': true,
        'created_at': '2026-10-05T10:00:00.000Z',
      });
      expect(legacy.userId, 'u1');
      expect(legacy.isRead, isTrue);

      final sparse = NotificationModel.fromJson(const {});
      expect(sparse.id, '');
      expect(sparse.type, 'general');
      expect(sparse.createdAt, isNotNull);
    });

    test('CircularModel and PollModel parse camelCase rows', () {
      final circular = CircularModel.fromJson({
        'id': 'c1',
        'title': 'T',
        'fileUrl': 'u',
        'uploadedById': 's1',
        'createdAt': '2026-10-06T07:00:00.000Z',
      });
      expect(circular.fileUrl, 'u');
      expect(circular.uploadedById, 's1');

      final poll = PollModel.fromJson({
        'id': 'p1',
        'title': 'Q',
        'options': const [],
        'expiresAt': '2026-10-10T00:00:00.000Z',
        'isActive': false,
        'createdById': 's1',
        'createdAt': '2026-10-06T07:00:00.000Z',
      });
      expect(poll.isActive, isFalse);
      expect(poll.options, isEmpty);
    });
  });
}
