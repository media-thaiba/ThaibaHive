import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/offline_queue.dart';
import '../../../models/leave_balance_model.dart';
import '../../../models/leave_request_model.dart';
import '../../../models/leave_type_model.dart';
import 'leaves_repository.dart';

/// Mobile Leaves Provider - Offline Sync Ready
///
/// This provider follows the same pattern as other mobile providers, but is enhanced with offline caching support.
///
/// Features:
/// - Real-time sync with backend
/// - Local cache fallback when offline
/// - Optimistic operations for better UX
/// - Hysteresis state management (loading/loadingMore/loadingError)
///
/// The provider connects to:
/// - Backend API for remote data
/// - OfflineCacheService for cached data
/// - OfflineQueue for pending sync operations

final selectedLeaveStatusProvider = StateProvider<String>((ref) => 'all');

final leavesListProvider =
    AsyncNotifierProvider<LeavesListNotifier, List<LeaveRequestModel>>(
  LeavesListNotifier.new,
);

class LeavesListNotifier extends AsyncNotifier<List<LeaveRequestModel>> {
  @override
  Future<List<LeaveRequestModel>> build() async {
    final status = ref.watch(selectedLeaveStatusProvider);
    final repo = ref.watch(leavesRepositoryProvider);
    return repo.getLeaves(status: status);
  }

  Future<void> refresh() async {
    final repo = ref.watch(leavesRepositoryProvider);
    final status = ref.read(selectedLeaveStatusProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getLeaves(status: status));
  }

  /// Submits a leave application. Returns `true` when the server accepted
  /// it, `false` when it was queued in the offline outbox (optimistically
  /// prepended to the visible list with `pending` status).
  Future<bool> applyLeave(Map<String, dynamic> data) async {
    final repo = ref.watch(leavesRepositoryProvider);
    try {
      await repo.createLeave(data);
      await refresh();
      return true;
    } catch (_) {
      await offlineQueue.enqueue(
        type: 'leave_apply',
        payload: data,
      );
      final optimistic = LeaveRequestModel(
        id: 'temp_${DateTime.now().millisecondsSinceEpoch}',
        staffId: '',
        leaveTypeId: data['leave_type_id']?.toString() ?? '',
        startDate: data['start_date']?.toString() ?? '',
        endDate: data['end_date']?.toString() ?? '',
        days: (data['days'] as num?)?.toDouble() ?? 0,
        reason: data['reason']?.toString() ?? '',
        status: 'pending',
        appliedAt: DateTime.now().toIso8601String(),
      );
      state = AsyncValue.data([optimistic, ...?state.valueOrNull]);
      return false;
    }
  }

  /// Withdraws a pending leave request. Returns `true` when the server
  /// accepted it, `false` when it was queued offline (status updated
  /// optimistically to `cancelled`).
  Future<bool> cancelLeave(String id) async {
    final repo = ref.watch(leavesRepositoryProvider);
    try {
      await repo.updateLeave(id, {'status': 'cancelled'});
      await refresh();
      return true;
    } catch (_) {
      await offlineQueue.enqueue(
        type: 'leave_cancel',
        payload: {'id': id, 'status': 'cancelled'},
      );
      final current = state.valueOrNull;
      if (current != null) {
        state = AsyncValue.data(
          current.map((l) => l.id == id ? l.copyWith(status: 'cancelled') : l).toList(),
        );
      }
      return false;
    }
  }
}

final leaveBalanceProvider =
    FutureProvider<List<LeaveBalanceModel>>((ref) async {
  final repo = ref.watch(leavesRepositoryProvider);
  return repo.getLeaveBalance();
});

final leaveTypesProvider = FutureProvider<List<LeaveTypeModel>>((ref) async {
  final repo = ref.watch(leavesRepositoryProvider);
  return repo.getLeaveTypes();
});
