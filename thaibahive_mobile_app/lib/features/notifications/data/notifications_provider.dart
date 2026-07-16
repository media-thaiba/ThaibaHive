import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/notification_model.dart';
import 'notifications_repository.dart';

final notificationsListProvider =
    AsyncNotifierProvider<NotificationsListNotifier, List<NotificationModel>>(
  NotificationsListNotifier.new,
);

final unreadCountProvider = FutureProvider<int>((ref) async {
  final repo = ref.watch(notificationsRepositoryProvider);
  return repo.getUnreadCount();
});

class NotificationsListNotifier
    extends AsyncNotifier<List<NotificationModel>> {
  @override
  Future<List<NotificationModel>> build() async {
    final repo = ref.watch(notificationsRepositoryProvider);
    return repo.getNotifications();
  }

  Future<void> refresh() async {
    final repo = ref.watch(notificationsRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getNotifications());
    ref.invalidate(unreadCountProvider);
  }

  Future<void> markAsRead(String id) async {
    final repo = ref.watch(notificationsRepositoryProvider);
    await repo.markAsRead(id);
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncData(
        current
            .map((n) => n.id == id ? n.copyWith(isRead: true) : n)
            .toList(),
      );
    }
    ref.invalidate(unreadCountProvider);
  }

  Future<void> markAllAsRead() async {
    final repo = ref.watch(notificationsRepositoryProvider);
    await repo.markAllAsRead();
    final current = state.valueOrNull;
    if (current != null) {
      state = AsyncData(
        current.map((n) => n.copyWith(isRead: true)).toList(),
      );
    }
    ref.invalidate(unreadCountProvider);
  }
}
