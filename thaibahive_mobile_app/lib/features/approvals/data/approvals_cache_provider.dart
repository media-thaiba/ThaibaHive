import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../core/services/offline_cache_service.dart';
import '../../../core/services/offline_queue.dart';
import '../../../models/approval_item_model.dart';
import 'approvals_repository.dart';

class CachedApprovalsState {
  final List<ApprovalItemModel> approvals;
  final bool isOffline;
  final String? error;

  const CachedApprovalsState({
    this.approvals = const [],
    this.isOffline = false,
    this.error,
  });

  CachedApprovalsState copyWith({
    List<ApprovalItemModel>? approvals,
    bool? isOffline,
    String? error,
  }) {
    return CachedApprovalsState(
      approvals: approvals ?? this.approvals,
      isOffline: isOffline ?? this.isOffline,
      error: error,
    );
  }
}

class ApprovalsCacheNotifier extends StateNotifier<AsyncValue<CachedApprovalsState>> {
  static const String approvalsCacheKey = 'cache_approvals_v1';
  final ApprovalsRepository _repository;
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _wasOffline = false;

  ApprovalsCacheNotifier(this._repository) : super(const AsyncValue.loading()) {
    fetchApprovals();
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (results) async {
        final isOnline = results.any((r) => r != ConnectivityResult.none);
        if (!_wasOffline && !isOnline) {
          _wasOffline = true;
        } else if (_wasOffline && isOnline) {
          _wasOffline = false;
          await fetchApprovals();
        }
      },
      onError: (error) {
        print('[ApprovalsCacheNotifier] Connectivity listener error: $error');
      },
    );
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> fetchApprovals({int page = 1}) async {
    state = const AsyncValue.loading();

    final cacheKey = '${approvalsCacheKey}_page_$page';

    final cachedApprovals = await offlineCacheService.getCache(
      cacheKey,
      maxAge: const Duration(minutes: 15),
    );

    if (cachedApprovals is List) {
      state = AsyncValue.data(CachedApprovalsState(
        approvals: cachedApprovals
            .map((e) => ApprovalItemModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        isOffline: false,
      ));
    }

    try {
      final data = await _repository.getApprovals(page: page);

      await offlineCacheService.saveCache(
          cacheKey, data.map((a) => a.toJson()).toList());

      state = AsyncValue.data(CachedApprovalsState(
        approvals: data,
        isOffline: false,
      ));
    } catch (e, st) {
      final fallback = await offlineCacheService.getCache(cacheKey);
      if (fallback is List) {
        state = AsyncValue.data(CachedApprovalsState(
          approvals: fallback
              .map((e) => ApprovalItemModel.fromJson(e as Map<String, dynamic>))
              .toList(),
          isOffline: true,
          error: 'Showing cached data',
        ));
      } else {
        state = AsyncValue.error(e, st);
      }
    }
  }

  Future<void> approve(String type, String id, {String? notes}) async {
    try {
      await _repository.updateApproval(type, id, action: 'approve', notes: notes);
      await offlineCacheService.invalidateCache(approvalsCacheKey);
      await fetchApprovals();
    } catch (e) {
      // Enqueue for offline sync
      await offlineQueue.enqueue(
        type: 'approval_approve',
        payload: {'type': type, 'id': id, 'action': 'approve', if (notes != null) 'notes': notes},
      );
      state = AsyncValue.data(CachedApprovalsState(
        approvals: state.valueOrNull?.approvals ?? [],
        error: 'Queued for offline sync: $e',
      ));
    }
  }

  Future<void> reject(String type, String id, {String? notes}) async {
    try {
      await _repository.updateApproval(type, id, action: 'reject', notes: notes);
      await offlineCacheService.invalidateCache(approvalsCacheKey);
      await fetchApprovals();
    } catch (e) {
      // Enqueue for offline sync
      await offlineQueue.enqueue(
        type: 'approval_reject',
        payload: {'type': type, 'id': id, 'action': 'reject', if (notes != null) 'notes': notes},
      );
      state = AsyncValue.data(CachedApprovalsState(
        approvals: state.valueOrNull?.approvals ?? [],
        error: 'Queued for offline sync: $e',
      ));
    }
  }

  Future<void> refresh() async {
    await fetchApprovals(page: 1);
  }
}

final cachedApprovalsProvider = StateNotifierProvider<ApprovalsCacheNotifier,
    AsyncValue<CachedApprovalsState>>((ref) {
  return ApprovalsCacheNotifier(ref.watch(approvalsRepositoryProvider));
});