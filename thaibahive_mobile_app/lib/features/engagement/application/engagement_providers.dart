import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/engagement_model.dart';

final engagementFeedProvider = StateNotifierProvider<EngagementFeedNotifier, AsyncValue<List<EngageMessageItem>>>((ref) {
  return EngagementFeedNotifier();
});

class EngagementFeedNotifier extends StateNotifier<AsyncValue<List<EngageMessageItem>>> {
  EngagementFeedNotifier() : super(const AsyncValue.loading()) {
    loadNotifications();
  }

  Future<void> loadNotifications() async {
    state = const AsyncValue.loading();
    try {
      // Simulate feed data or load from offline cache
      final items = [
        EngageMessageItem(
          id: 'msg_001',
          title: 'Midterm Examination Schedule Released',
          body: 'The schedule for Semester 4 Midterms is now available on the academic portal.',
          channel: 'push',
          priority: 'high',
          timestamp: DateTime.now().subtract(const Duration(minutes: 45)),
        ),
        EngageMessageItem(
          id: 'msg_002',
          title: 'Library Hours Extended for Finals',
          body: 'Central Library study halls will remain open until 23:00 starting next Monday.',
          channel: 'inapp',
          priority: 'standard',
          timestamp: DateTime.now().subtract(const Duration(hours: 3)),
        ),
      ];
      state = AsyncValue.data(items);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void markAsRead(String messageId) {
    state.whenData((items) {
      final updated = items.map((item) {
        if (item.id == messageId) {
          return EngageMessageItem(
            id: item.id,
            title: item.title,
            body: item.body,
            channel: item.channel,
            priority: item.priority,
            timestamp: item.timestamp,
            isRead: true,
            metadata: item.metadata,
          );
        }
        return item;
      }).toList();
      state = AsyncValue.data(updated);
    });
  }
}
