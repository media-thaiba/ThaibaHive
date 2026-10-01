import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/offline_queue.dart';
import 'finance_models.dart';
import 'finance_repository.dart';

// ---------------------------------------------------------------------------
// Purchase approvals
// ---------------------------------------------------------------------------

class FinanceApprovalsState {
  final List<PurchaseApprovalModel> approvals;
  final bool isLoading;
  final String? error;
  final String? notice;
  final String statusFilter;
  final List<String> actingIds;
  final String? verifyingId;
  final AuditVerification? verification;
  final List<ApprovalLogModel> logs;

  const FinanceApprovalsState({
    this.approvals = const [],
    this.isLoading = false,
    this.error,
    this.notice,
    this.statusFilter = 'all',
    this.actingIds = const [],
    this.verifyingId,
    this.verification,
    this.logs = const [],
  });

  FinanceApprovalsState copyWith({
    List<PurchaseApprovalModel>? approvals,
    bool? isLoading,
    String? error,
    String? notice,
    String? statusFilter,
    List<String>? actingIds,
    String? verifyingId,
    AuditVerification? verification,
    List<ApprovalLogModel>? logs,
    bool clearError = false,
    bool clearNotice = false,
    bool clearVerification = false,
  }) =>
      FinanceApprovalsState(
        approvals: approvals ?? this.approvals,
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        notice: clearNotice ? null : (notice ?? this.notice),
        statusFilter: statusFilter ?? this.statusFilter,
        actingIds: actingIds ?? this.actingIds,
        verifyingId: clearVerification ? null : (verifyingId ?? this.verifyingId),
        verification: clearVerification ? null : (verification ?? this.verification),
        logs: clearVerification ? const [] : (logs ?? this.logs),
      );
}

class FinanceApprovalsNotifier extends StateNotifier<FinanceApprovalsState> {
  final FinanceRepository _repository;

  FinanceApprovalsNotifier(this._repository) : super(const FinanceApprovalsState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true, clearNotice: true);
    try {
      final approvals = await _repository.getPurchaseApprovals();
      state = state.copyWith(approvals: approvals, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  /// Record an approval decision.
  ///
  /// On transport/permission failure the mutation is enqueued into the
  /// encrypted Hive outbox for idempotent replay when connectivity returns.
  Future<void> act({
    required String id,
    required String action,
    String? comments,
    int? tierLevel,
  }) async {
    state = state.copyWith(
      actingIds: [...state.actingIds, id],
      clearNotice: true,
      clearError: true,
    );
    try {
      await _repository.actOnPurchaseApproval(
        purchaseRequestId: id,
        action: action,
        comments: comments,
        tierLevel: tierLevel,
      );
      state = state.copyWith(actingIds: state.actingIds.where((e) => e != id).toList());
      await load();
    } catch (e) {
      await offlineQueue.enqueue(
        type: 'finance_purchase_action',
        payload: {
          'purchaseRequestId': id,
          'action': action,
          if (comments != null && comments.isNotEmpty) 'comments': comments,
          if (tierLevel != null) 'tierLevel': tierLevel,
        },
      );

      // Optimistic local state so the inbox reflects the queued decision.
      final optimistic = state.approvals.map((p) {
        if (p.id != id) return p;
        return PurchaseApprovalModel(
          id: p.id,
          requesterId: p.requesterId,
          itemName: p.itemName,
          quantity: p.quantity,
          estimatedCost: p.estimatedCost,
          justification: p.justification,
          status: action == 'approve' ? 'approved' : 'rejected',
          notes: p.notes,
          createdAt: p.createdAt,
          updatedAt: DateTime.now(),
        );
      }).toList();

      state = state.copyWith(
        approvals: optimistic,
        actingIds: state.actingIds.where((e) => e != id).toList(),
        notice: 'Offline — decision queued for sync',
      );
    }
  }

  void setStatusFilter(String status) {
    state = state.copyWith(statusFilter: status);
  }

  void clearNotice() {
    state = state.copyWith(clearNotice: true);
  }

  Future<void> verifyAuditTrail(String purchaseRequestId) async {
    state = state.copyWith(verifyingId: purchaseRequestId, clearVerification: true);
    try {
      final result = await _repository.verifyPurchaseAuditTrail(purchaseRequestId);
      state = state.copyWith(
        verifyingId: null,
        verification: result.verification,
        logs: result.logs,
      );
    } catch (e) {
      state = state.copyWith(verifyingId: null, error: e.toString(), clearVerification: true);
    }
  }

  void clearVerification() {
    state = state.copyWith(clearVerification: true);
  }
}

final financeApprovalsProvider =
    StateNotifierProvider<FinanceApprovalsNotifier, FinanceApprovalsState>((ref) {
  return FinanceApprovalsNotifier(ref.watch(financeRepositoryProvider));
});

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

class FinanceReconciliationState {
  final List<ReconciliationSessionModel> sessions;
  final bool isLoading;
  final String? error;
  final String? notice;
  final ReconciliationSessionModel? detailSession;
  final List<ReconciliationItemModel> detailItems;
  final bool detailLoading;
  final String? detailError;
  final List<String> actingIds;

  const FinanceReconciliationState({
    this.sessions = const [],
    this.isLoading = false,
    this.error,
    this.notice,
    this.detailSession,
    this.detailItems = const [],
    this.detailLoading = false,
    this.detailError,
    this.actingIds = const [],
  });

  FinanceReconciliationState copyWith({
    List<ReconciliationSessionModel>? sessions,
    bool? isLoading,
    String? error,
    String? notice,
    ReconciliationSessionModel? detailSession,
    List<ReconciliationItemModel>? detailItems,
    bool? detailLoading,
    String? detailError,
    List<String>? actingIds,
    bool clearError = false,
    bool clearNotice = false,
    bool clearDetail = false,
    bool clearDetailError = false,
  }) =>
      FinanceReconciliationState(
        sessions: sessions ?? this.sessions,
        isLoading: isLoading ?? this.isLoading,
        error: clearError ? null : (error ?? this.error),
        notice: clearNotice ? null : (notice ?? this.notice),
        detailSession: clearDetail ? null : (detailSession ?? this.detailSession),
        detailItems: clearDetail ? const [] : (detailItems ?? this.detailItems),
        detailLoading: detailLoading ?? this.detailLoading,
        detailError: clearDetailError ? null : (detailError ?? this.detailError),
        actingIds: actingIds ?? this.actingIds,
      );
}

class FinanceReconciliationNotifier extends StateNotifier<FinanceReconciliationState> {
  final FinanceRepository _repository;

  FinanceReconciliationNotifier(this._repository)
      : super(const FinanceReconciliationState());

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true, clearNotice: true);
    try {
      final sessions = await _repository.getReconciliations();
      state = state.copyWith(sessions: sessions, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadDetail(String id) async {
    state = state.copyWith(detailLoading: true, clearDetailError: true);
    try {
      final result = await _repository.getReconciliation(id);
      state = state.copyWith(
        detailSession: result.session,
        detailItems: result.items,
        detailLoading: false,
      );
    } catch (e) {
      state = state.copyWith(detailLoading: false, detailError: e.toString());
    }
  }

  void clearDetail() {
    state = state.copyWith(clearDetail: true, clearDetailError: true);
  }

  /// Manual match/override; falls back to the offline outbox on failure.
  Future<void> matchItem({
    required ReconciliationItemModel item,
    required String matchStatus,
    String? matchedWithId,
    double varianceAmount = 0,
    String? resolutionNotes,
  }) async {
    state = state.copyWith(
      actingIds: [...state.actingIds, item.id],
      clearNotice: true,
      clearDetailError: true,
    );
    try {
      await _repository.matchReconciliationItem(
        itemId: item.id,
        matchStatus: matchStatus,
        matchedWithId: matchedWithId,
        varianceAmount: varianceAmount,
        resolutionNotes: resolutionNotes,
      );
      state = state.copyWith(actingIds: state.actingIds.where((e) => e != item.id).toList());
      if (state.detailSession != null) await loadDetail(state.detailSession!.id);
      await load();
    } catch (e) {
      await offlineQueue.enqueue(
        type: 'finance_reconciliation_match',
        payload: {
          'itemId': item.id,
          'matchStatus': matchStatus,
          if (matchedWithId != null && matchedWithId.isNotEmpty)
            'matchedWithId': matchedWithId,
          'varianceAmount': varianceAmount,
          if (resolutionNotes != null && resolutionNotes.isNotEmpty)
            'resolutionNotes': resolutionNotes,
        },
      );

      final updated = state.detailItems.map((i) {
        if (i.id != item.id) return i;
        return ReconciliationItemModel(
          id: i.id,
          sourceType: i.sourceType,
          sourceReferenceId: i.sourceReferenceId,
          transactionDate: i.transactionDate,
          amount: i.amount,
          matchStatus: matchStatus,
          matchedWithId: matchedWithId,
          varianceAmount: varianceAmount,
          resolutionNotes: resolutionNotes,
        );
      }).toList();

      state = state.copyWith(
        detailItems: updated,
        actingIds: state.actingIds.where((e) => e != item.id).toList(),
        notice: 'Offline — match queued for sync',
      );
    }
  }
}

final financeReconciliationProvider =
    StateNotifierProvider<FinanceReconciliationNotifier, FinanceReconciliationState>(
        (ref) {
  return FinanceReconciliationNotifier(ref.watch(financeRepositoryProvider));
});
