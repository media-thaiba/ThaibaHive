import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/announcement_model.dart';

final announcementsRepositoryProvider =
    Provider<AnnouncementsRepository>((ref) {
  return AnnouncementsRepository(ref.watch(apiClientProvider));
});

class AnnouncementsRepository {
  final ApiClient _api;

  AnnouncementsRepository(this._api);

  Future<List<AnnouncementModel>> getAnnouncements({
    String? priority,
    int page = 1,
  }) async {
    final params = <String, dynamic>{'page': page};
    if (priority != null && priority.isNotEmpty && priority != 'all') {
      params['priority'] = priority;
    }
    final data = await _api.get(
      '/announcements',
      queryParameters: params,
      fromJson: (json) {
        final list = json['data'] as List<dynamic>;
        return list
            .map(
                (e) => AnnouncementModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<AnnouncementModel> createAnnouncement(
      Map<String, dynamic> data) async {
    return _api.post(
      '/announcements',
      data: data,
      fromJson: (json) =>
          AnnouncementModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> markAsRead(String id) async {
    await _api.post('/announcements/$id/read');
  }
}
