import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/notification_model.dart';

final notificationsRepositoryProvider =
    Provider<NotificationsRepository>((ref) {
  return NotificationsRepository(ref.watch(apiClientProvider));
});

class NotificationsRepository {
  final ApiClient _api;

  NotificationsRepository(this._api);

  Future<List<NotificationModel>> getNotifications({int page = 1}) async {
    final data = await _api.get(
      '/notifications',
      queryParameters: {'page': page},
      fromJson: (json) {
        final list = json['data'] as List<dynamic>;
        return list
            .map((e) =>
                NotificationModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<void> markAsRead(String id) async {
    await _api.put('/notifications/$id/read');
  }

  Future<void> markAllAsRead() async {
    await _api.put('/notifications/read-all');
  }

  Future<int> getUnreadCount() async {
    final data = await _api.get(
      '/notifications/unread-count',
      fromJson: (json) => json as Map<String, dynamic>,
    );
    return data['count'] as int;
  }
}
