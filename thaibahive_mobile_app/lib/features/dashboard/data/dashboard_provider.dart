import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/dashboard_model.dart';
import 'dashboard_repository.dart';

class DashboardState {
  final bool isLoading;
  final String? error;
  final DashboardStatsModel? stats;

  const DashboardState({
    this.isLoading = false,
    this.error,
    this.stats,
  });

  DashboardState copyWith({
    bool? isLoading,
    String? error,
    DashboardStatsModel? stats,
  }) {
    return DashboardState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      stats: stats ?? this.stats,
    );
  }
}

class DashboardNotifier extends StateNotifier<DashboardState> {
  final DashboardRepository _repository;

  DashboardNotifier(this._repository) : super(const DashboardState()) {
    fetchStats();
  }

  Future<void> fetchStats() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final stats = await _repository.getStats();
      state = DashboardState(isLoading: false, stats: stats);
    } catch (e) {
      state = DashboardState(
        isLoading: false,
        error: 'Failed to load dashboard data: $e',
        stats: state.stats,
      );
    }
  }

  Future<void> refresh() async {
    await fetchStats();
  }
}

final dashboardProvider =
    StateNotifierProvider<DashboardNotifier, DashboardState>((ref) {
  return DashboardNotifier(ref.watch(dashboardRepositoryProvider));
});
