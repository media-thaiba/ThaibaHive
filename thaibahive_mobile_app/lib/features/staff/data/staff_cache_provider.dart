import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/offline_cache_service.dart';
import 'staff_provider.dart';

import '../../../models/staff_model.dart';

class CachedStaffState {
  final List<dynamic> staffList;
  final bool isOffline;
  final String? error;
  final String searchQuery;
  final String departmentFilter;

  const CachedStaffState({
    this.staffList = const [],
    this.isOffline = false,
    this.error,
    this.searchQuery = '',
    this.departmentFilter = '',
  });

  List<StaffModel> get parsedStaffList {
    return staffList.map((e) {
      if (e is StaffModel) return e;
      if (e is Map<String, dynamic>) return StaffModel.fromJson(e);
      if (e is Map) return StaffModel.fromJson(Map<String, dynamic>.from(e));
      return null;
    }).whereType<StaffModel>().toList();
  }

  CachedStaffState copyWith({
    List<dynamic>? staffList,
    bool? isOffline,
    String? error,
    String? searchQuery,
    String? departmentFilter,
  }) => CachedStaffState(
    staffList: staffList ?? this.staffList,
    isOffline: isOffline ?? this.isOffline,
    error: error,
    searchQuery: searchQuery ?? this.searchQuery,
    departmentFilter: departmentFilter ?? this.departmentFilter,
  );
}

class StaffCacheNotifier extends StateNotifier<AsyncValue<CachedStaffState>> {
  static const String cacheKey = 'cache_staff_directory_v1';
  final ApiClient _apiClient = ApiClient();

  StaffCacheNotifier() : super(const AsyncValue.loading()) {
    fetchStaffDirectory();
  }

  Future<void> fetchStaffDirectory({String? search, String? department}) async {
    // 1. Instant return from local Hive cache if available (Stale-While-Revalidate)
    final cachedData = await offlineCacheService.getCache(cacheKey, maxAge: const Duration(hours: 24));
    if (cachedData != null && cachedData is List) {
      state = AsyncValue.data(CachedStaffState(
        staffList: cachedData,
        isOffline: false,
        searchQuery: search ?? '',
        departmentFilter: department ?? '',
      ));
    }

    // 2. Fetch fresh network data in background
    try {
      final queryParams = <String, dynamic>{};
      if (search != null && search.isNotEmpty) queryParams['search'] = search;
      if (department != null && department.isNotEmpty) queryParams['department'] = department;
      
      final response = await _apiClient.dio.get('/staff', queryParameters: queryParams);
      if (response.statusCode == 200) {
        final List<dynamic> freshList = response.data['staff'] ?? response.data ?? [];
        await offlineCacheService.saveCache(cacheKey, freshList);

        state = AsyncValue.data(CachedStaffState(
          staffList: freshList,
          isOffline: false,
          searchQuery: search ?? '',
          departmentFilter: department ?? '',
        ));
      }
    } catch (e) {
      // 3. Network failed: Fallback to Hive cache if present
      final fallbackData = await offlineCacheService.getCache(cacheKey);
      if (fallbackData != null && fallbackData is List) {
        state = AsyncValue.data(CachedStaffState(
          staffList: fallbackData,
          isOffline: true,
          searchQuery: search ?? '',
          departmentFilter: department ?? '',
        ));
      } else {
        state = AsyncValue.error(e, StackTrace.current);
      }
    }
  }
}

final cachedStaffDirectoryProvider =
    StateNotifierProvider<StaffCacheNotifier, AsyncValue<CachedStaffState>>((ref) {
  return StaffCacheNotifier();
});
