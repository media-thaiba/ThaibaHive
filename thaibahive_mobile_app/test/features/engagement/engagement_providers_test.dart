import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile_app/features/engagement/application/engagement_providers.dart';

void main() {
  group('EngagementFeedNotifier Test Suite', () {
    test('should initialize and load notifications', () async {
      final notifier = EngagementFeedNotifier();
      await notifier.loadNotifications();

      expect(notifier.state.hasValue, true);
      final items = notifier.state.value!;
      expect(items.length, 2);
      expect(items.first.title, contains('Midterm Examination'));
      expect(items.first.isRead, false);
    });

    test('should mark notification as read', () async {
      final notifier = EngagementFeedNotifier();
      await notifier.loadNotifications();

      notifier.markAsRead('msg_001');

      final items = notifier.state.value!;
      final updated = items.firstWhere((i) => i.id == 'msg_001');
      expect(updated.isRead, true);
    });
  });
}
