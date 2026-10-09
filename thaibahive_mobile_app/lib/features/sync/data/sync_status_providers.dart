import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/core/services/offline_queue_providers.dart';
import 'package:thaibahive_mobile/core/services/sync_coordinator.dart';

class SyncConflictModel {
  final String id;
  final String? clientEventId;
  final String entityType;
  final String? mutationType;
  final String status;
  final List<String> fields;
  final Map<String, dynamic> payload;
  final String? clientTimestamp;
  final String? createdAt;
  final String? userId;

  const SyncConflictModel({
    required this.id,
    this.clientEventId,
    required this.entityType,
    this.mutationType,
    required this.status,
    required this.fields,
    this.payload = const {},
    this.clientTimestamp,
    this.createdAt,
    this.userId,
  });

  factory SyncConflictModel.fromJson(Map<String, dynamic> json) {
    return SyncConflictModel(
      id: json['id'] as String? ?? '',
      clientEventId: json['clientEventId'] as String?,
      entityType: json['entityType'] as String? ?? 'unknown',
      mutationType: json['mutationType'] as String?,
      status: json['status'] as String? ?? 'CONFLICT',
      fields: (json['fields'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          const [],
      payload: (json['payload'] as Map<String, dynamic>?) ?? const {},
      clientTimestamp: json['clientTimestamp'] as String?,
      createdAt: json['createdAt'] as String?,
      userId: json['userId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'clientEventId': clientEventId,
        'entityType': entityType,
        'mutationType': mutationType,
        'status': status,
        'fields': fields,
        'payload': payload,
        'clientTimestamp': clientTimestamp,
        'createdAt': createdAt,
        'userId': userId,
      };
}

class SyncStatusState {
  final bool isLoading;
  final bool isResolving;
  final String? error;
  final List<SyncConflictModel> conflicts;
  final List<OfflineEvent> dlqEvents;
  final List<OfflineEvent> conflictEvents;
  final List<OfflineEvent> pendingEvents;
  final int completedReceiptsCount;
  final DateTime? lastSyncedAt;

  const SyncStatusState({
    this.isLoading = false,
    this.isResolving = false,
    this.error,
    this.conflicts = const [],
    this.dlqEvents = const [],
    this.conflictEvents = const [],
    this.pendingEvents = const [],
    this.completedReceiptsCount = 0,
    this.lastSyncedAt,
  });

  int get totalIssuesCount =>
      dlqEvents.length + conflicts.length + conflictEvents.length;

  SyncStatusState copyWith({
    bool? isLoading,
    bool? isResolving,
    String? error,
    bool clearError = false,
    List<SyncConflictModel>? conflicts,
    List<OfflineEvent>? dlqEvents,
    List<OfflineEvent>? conflictEvents,
    List<OfflineEvent>? pendingEvents,
    int? completedReceiptsCount,
    DateTime? lastSyncedAt,
  }) {
    return SyncStatusState(
      isLoading: isLoading ?? this.isLoading,
      isResolving: isResolving ?? this.isResolving,
      error: clearError ? null : (error ?? this.error),
      conflicts: conflicts ?? this.conflicts,
      dlqEvents: dlqEvents ?? this.dlqEvents,
      conflictEvents: conflictEvents ?? this.conflictEvents,
      pendingEvents: pendingEvents ?? this.pendingEvents,
      completedReceiptsCount:
          completedReceiptsCount ?? this.completedReceiptsCount,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }
}

class SyncStatusNotifier extends StateNotifier<SyncStatusState> {
  final Dio _dio;
  final Ref _ref;

  SyncStatusNotifier(this._dio, this._ref) : super(const SyncStatusState()) {
    loadStatus();
  }

  Future<void> loadStatus() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final queue = _ref.read(offlineQueueProvider);
      final dlq = queue.getFailedEvents();
      final localConflicts = queue.getConflictEvents();
      final pending = queue.getPendingEvents();
      final receipts = queue.getReceipts();

      List<SyncConflictModel> serverConflicts = [];
      try {
        final response = await _dio.get('/mobile/v1/sync/conflicts');
        if (response.statusCode == 200 && response.data is Map) {
          final data = response.data as Map<String, dynamic>;
          final list = data['conflicts'] as List<dynamic>? ?? [];
          serverConflicts = list
              .map((item) =>
                  SyncConflictModel.fromJson(item as Map<String, dynamic>))
              .toList();
        }
      } catch (e) {
        // Network errors when fetching server conflicts should not block local queue display
        debugPrintSync('[SyncStatusNotifier] Server conflict fetch skipped: $e');
      }

      state = state.copyWith(
        isLoading: false,
        isResolving: false,
        conflicts: serverConflicts,
        dlqEvents: dlq,
        conflictEvents: localConflicts,
        pendingEvents: pending,
        completedReceiptsCount: receipts.length,
        lastSyncedAt: DateTime.now(),
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load sync status: $e',
      );
    }
  }

  Future<void> refresh() async {
    await _ref
        .read(syncCoordinatorProvider.notifier)
        .syncNow(trigger: SyncTrigger.manual);
    await loadStatus();
  }

  Future<void> retryEvent(String clientEventId) async {
    final queue = _ref.read(offlineQueueProvider);
    await queue.resetToPending(clientEventId);
    await _ref
        .read(syncCoordinatorProvider.notifier)
        .syncNow(trigger: SyncTrigger.manual);
    await loadStatus();
  }

  Future<void> retryAll() async {
    final queue = _ref.read(offlineQueueProvider);
    await queue.retryFailedEvents();
    await _ref
        .read(syncCoordinatorProvider.notifier)
        .syncNow(trigger: SyncTrigger.manual);
    await loadStatus();
  }

  Future<void> discardEvent(String clientEventId) async {
    final queue = _ref.read(offlineQueueProvider);
    await queue.markCompleted(clientEventId);
    await loadStatus();
  }

  Future<bool> resolveConflict(
      String conflictId, Map<String, dynamic> fields) async {
    state = state.copyWith(isResolving: true, clearError: true);
    try {
      final response = await _dio.post(
        '/mobile/v1/sync/conflicts/$conflictId/resolve',
        data: {'fields': fields},
      );
      if (response.statusCode == 200) {
        await loadStatus();
        return true;
      } else {
        state = state.copyWith(
          isResolving: false,
          error: response.data?['error']?.toString() ?? 'Resolution failed',
        );
        return false;
      }
    } catch (e) {
      state = state.copyWith(
        isResolving: false,
        error: 'Failed to resolve conflict: $e',
      );
      return false;
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

void debugPrintSync(String message) {
  // Silent in production / test unless needed
}

final syncStatusProvider =
    StateNotifierProvider<SyncStatusNotifier, SyncStatusState>((ref) {
  final dio = ref.watch(dioProvider);
  return SyncStatusNotifier(dio, ref);
});

final syncIssuesCountProvider = Provider<int>((ref) {
  final syncState = ref.watch(syncStatusProvider);
  return syncState.totalIssuesCount;
});
