import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/offline_cache_service.dart';

class CachedLeavesState {
  final List<dynamic> leaveRequests;
  final Map<String, dynamic> balances;
  final bool isOffline;

  const CachedLeavesState({
    this.leaveRequests = const [],
    this.balances = const {},
    this.isOffline = false,
  });
}

class LeavesCacheNotifier extends StateNotifier<AsyncValue<CachedLeavesState>> {
  static const String requestsCacheKey = 'cache_leave_requests_v1';
  static const String balancesCacheKey = 'cache_leave_balances_v1';
  final ApiClient _apiClient = ApiClient();

  LeavesCacheNotifier() : super(const AsyncValue.loading()) {
    fetchLeaveHistory();
  }

  Future<void> fetchLeaveHistory() async {
    // 1. Instant return from local Hive cache if available (Stale-While-Revalidate)
    final cachedRequests = offlineCacheService.getCache(requestsCacheKey, maxAge: const Duration(hours: 1));
    final cachedBalances = offlineCacheService.getCache(balancesCacheKey, maxAge: const Duration(hours: 1));

    if (cachedRequests != null && cachedRequests is List) {
      state = AsyncValue.data(CachedLeavesState(
        leaveRequests: cachedRequests,
        balances: (cachedBalances as Map<String, dynamic>?) ?? {},
        isOffline: false,
      ));
    }

    // 2. Fetch fresh network data in background
    try {
      final reqRes = await _apiClient.dio.get('/leaves');
      final balRes = await _apiClient.dio.get('/leaves/balance');

      if (reqRes.statusCode == 200) {
        final List<dynamic> freshRequests = reqRes.data['leaves'] ?? reqRes.data ?? [];
        final Map<String, dynamic> freshBalances = balRes.data ?? {};

        await offlineCacheService.saveCache(requestsCacheKey, freshRequests);
        await offlineCacheService.saveCache(balancesCacheKey, freshBalances);

        state = AsyncValue.data(CachedLeavesState(
          leaveRequests: freshRequests,
          balances: freshBalances,
          isOffline: false,
        ));
      }
    } catch (e) {
      // 3. Network failed: Fallback to Hive cache if present
      final fallbackRequests = offlineCacheService.getCache(requestsCacheKey);
      final fallbackBalances = offlineCacheService.getCache(balancesCacheKey);

      if (fallbackRequests != null && fallbackRequests is List) {
        state = AsyncValue.data(CachedLeavesState(
          leaveRequests: fallbackRequests,
          balances: (fallbackBalances as Map<String, dynamic>?) ?? {},
          isOffline: true,
        ));
      } else {
        state = AsyncValue.error(e, StackTrace.current);
      }
    }
  }
}

final cachedLeavesProvider =
    StateNotifierProvider<LeavesCacheNotifier, AsyncValue<CachedLeavesState>>((ref) {
  return LeavesCacheNotifier();
});
