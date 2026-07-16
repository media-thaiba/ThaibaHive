import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/approval_item_model.dart';
import 'approvals_repository.dart';

final approvalsListProvider =
    AsyncNotifierProvider<ApprovalsListNotifier, List<ApprovalItemModel>>(
  ApprovalsListNotifier.new,
);

class ApprovalsListNotifier extends AsyncNotifier<List<ApprovalItemModel>> {
  @override
  Future<List<ApprovalItemModel>> build() async {
    final repo = ref.watch(approvalsRepositoryProvider);
    return repo.getApprovals();
  }

  Future<void> refresh() async {
    final repo = ref.watch(approvalsRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getApprovals());
  }

  Future<void> approve(String type, String id, {String? notes}) async {
    final repo = ref.watch(approvalsRepositoryProvider);
    await repo.updateApproval(type, id, action: 'approve', notes: notes);
    await refresh();
  }

  Future<void> reject(String type, String id, {String? notes}) async {
    final repo = ref.watch(approvalsRepositoryProvider);
    await repo.updateApproval(type, id, action: 'reject', notes: notes);
    await refresh();
  }
}
