import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/services/offline_cache_service.dart';
import 'package:thaibahive_mobile/models/announcement_model.dart';

class CachedAnnouncementsState {
  final List<AnnouncementModel> announcements;
  final bool isOffline;
  final String? error;
  final String priorityFilter;

  const CachedAnnouncementsState({
    this.announcements = const [],
    this.isOffline = false,
    this.error,
    this.priorityFilter = 'all',
  });

  CachedAnnouncementsState copyWith({
    List<AnnouncementModel>? announcements,
    bool? isOffline,
    String? error,
    String? priorityFilter,
  }) => CachedAnnouncementsState(
    announcements: announcements ?? this.announcements,
    isOffline: isOffline ?? this.isOffline,
    error: error,
    priorityFilter: priorityFilter ?? this.priorityFilter,
  );
}

class AnnouncementsCacheNotifier extends StateNotifier<AsyncValue<CachedAnnouncementsState>> {
  static const String cacheKey = 'announcements_cache';
  final ApiClient _apiClient = ApiClient();

  AnnouncementsCacheNotifier() : super(const AsyncValue.loading()) {
    fetchAnnouncements();
  }

  Future<void> fetchAnnouncements({String priority = 'all'}) async {
    // 1. Instant return from local Hive cache if available (Stale-While-Revalidate)
    final cachedData = await offlineCacheService.getCache(cacheKey, maxAge: const Duration(hours: 6));
    if (cachedData != null && cachedData is List) {
      final announcements = (cachedData as List)
          .map((e) => AnnouncementModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(CachedAnnouncementsState(
        announcements: announcements,
        isOffline: false,
        priorityFilter: priority,
      ));
    }

    // 2. Fetch fresh network data in background
    try {
      final params = <String, dynamic>{};
      if (priority != 'all' && priority.isNotEmpty) {
        params['priority'] = priority;
      }
      
      final response = await _apiClient.dio.get('/announcements', queryParameters: params);
      if (response.statusCode == 200) {
        final data = response.data;
        final List<dynamic> freshList = data is Map 
            ? (data['announcements'] ?? data['data'] ?? data) as List? ?? []
            : data as List? ?? [];
        final announcements = freshList
            .map((e) => AnnouncementModel.fromJson(e as Map<String, dynamic>))
            .toList();
        await offlineCacheService.saveCache(cacheKey, freshList);

        state = AsyncValue.data(CachedAnnouncementsState(
          announcements: announcements,
          isOffline: false,
          priorityFilter: priority,
        ));
      }
    } catch (e) {
      // 3. Network failed: Fallback to Hive cache if present
      final fallbackData = await offlineCacheService.getCache(cacheKey);
      if (fallbackData != null && fallbackData is List) {
        final announcements = (fallbackData as List)
            .map((e) => AnnouncementModel.fromJson(e as Map<String, dynamic>))
            .toList();
        state = AsyncValue.data(CachedAnnouncementsState(
          announcements: announcements,
          isOffline: true,
          priorityFilter: priority,
        ));
      } else {
        state = AsyncValue.error(e, StackTrace.current);
      }
    }
  }
}

final cachedAnnouncementsProvider =
    StateNotifierProvider<AnnouncementsCacheNotifier, AsyncValue<CachedAnnouncementsState>>((ref) {
  return AnnouncementsCacheNotifier();
});