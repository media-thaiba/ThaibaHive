import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/services/offline_cache_service.dart';
import 'package:thaibahive_mobile/models/event_model.dart';

class CachedEventsState {
  final List<EventModel> events;
  final bool isOffline;
  final String? error;

  const CachedEventsState({
    this.events = const [],
    this.isOffline = false,
    this.error,
  });

  CachedEventsState copyWith({
    List<EventModel>? events,
    bool? isOffline,
    String? error,
  }) => CachedEventsState(
    events: events ?? this.events,
    isOffline: isOffline ?? this.isOffline,
    error: error,
  );
}

class EventsCacheNotifier extends StateNotifier<AsyncValue<CachedEventsState>> {
  static const String cacheKey = 'events_cache';
  final ApiClient _apiClient = ApiClient();

  EventsCacheNotifier() : super(const AsyncValue.loading()) {
    fetchEvents();
  }

  Future<void> fetchEvents() async {
    // 1. Instant return from local Hive cache if available (Stale-While-Revalidate)
    final cachedData = await offlineCacheService.getCache(cacheKey, maxAge: const Duration(hours: 6));
    if (cachedData != null && cachedData is List) {
      final events = (cachedData as List)
          .map((e) => EventModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(CachedEventsState(
        events: events,
        isOffline: false,
      ));
    }

    // 2. Fetch fresh network data in background
    try {
      final response = await _apiClient.dio.get('/events');
      if (response.statusCode == 200) {
        final data = response.data;
        final List<dynamic> freshList = data is Map 
            ? (data['events'] ?? data['data'] ?? data) as List? ?? []
            : data as List? ?? [];
        final events = freshList
            .map((e) => EventModel.fromJson(e as Map<String, dynamic>))
            .toList();
        await offlineCacheService.saveCache(cacheKey, freshList);

        state = AsyncValue.data(CachedEventsState(
          events: events,
          isOffline: false,
        ));
      }
    } catch (e) {
      // 3. Network failed: Fallback to Hive cache if present
      final fallbackData = await offlineCacheService.getCache(cacheKey);
      if (fallbackData != null && fallbackData is List) {
        final events = (fallbackData as List)
            .map((e) => EventModel.fromJson(e as Map<String, dynamic>))
            .toList();
        state = AsyncValue.data(CachedEventsState(
          events: events,
          isOffline: true,
        ));
      } else {
        state = AsyncValue.error(e, StackTrace.current);
      }
    }
  }
}

final cachedEventsProvider =
    StateNotifierProvider<EventsCacheNotifier, AsyncValue<CachedEventsState>>((ref) {
  return EventsCacheNotifier();
});