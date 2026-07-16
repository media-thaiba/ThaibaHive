import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/leave_balance_model.dart';
import '../../../models/leave_request_model.dart';
import '../../../models/leave_type_model.dart';
import 'leaves_repository.dart';

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

  Future<void> applyLeave(Map<String, dynamic> data) async {
    final repo = ref.watch(leavesRepositoryProvider);
    await repo.createLeave(data);
    await refresh();
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
