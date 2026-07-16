import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/event_model.dart';

final eventsRepositoryProvider = Provider<EventsRepository>((ref) {
  return EventsRepository(ref.watch(apiClientProvider));
});

class EventsRepository {
  final ApiClient _api;

  EventsRepository(this._api);

  Future<List<EventModel>> getEvents({int page = 1}) async {
    final data = await _api.get(
      '/events',
      queryParameters: {'page': page},
      fromJson: (json) {
        final list = json['data'] as List<dynamic>;
        return list
            .map((e) => EventModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<EventModel> createEvent(Map<String, dynamic> data) async {
    return _api.post(
      '/events',
      data: data,
      fromJson: (json) => EventModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> rsvp(String id) async {
    await _api.post('/events/$id/rsvp');
  }
}
