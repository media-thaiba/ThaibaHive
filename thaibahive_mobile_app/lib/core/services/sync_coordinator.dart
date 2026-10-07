import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox.dart';
import 'package:thaibahive_mobile/features/media/data/media_providers.dart';
import 'offline_queue.dart';

/// Sync action → entity/mutationType map (mirrors server SYNC_ACTION_ENTITY_MAP).
/// Must stay in sync with server for payload v2 compliance.
const _syncActionEntityMap = {
  'leave_apply': {'entityType': 'leave', 'mutationType': 'CREATE'},
  'leave_cancel': {'entityType': 'leave', 'mutationType': 'UPDATE'},
  'task_create': {'entityType': 'task', 'mutationType': 'CREATE'},
  'task_update': {'entityType': 'task', 'mutationType': 'UPDATE'},
  'task_delete': {'entityType': 'task', 'mutationType': 'DELETE'},
  'expense_create': {'entityType': 'expense', 'mutationType': 'CREATE'},
  'attendance_nfc_checkin': {'entityType': 'attendance', 'mutationType': 'CREATE'},
  'attendance_punch': {'entityType': 'attendance', 'mutationType': 'UPDATE'},
  'approval_approve': {'entityType': 'approval', 'mutationType': 'UPDATE'},
  'approval_reject': {'entityType': 'approval', 'mutationType': 'UPDATE'},
  'finance_purchase_action': {'entityType': 'purchase', 'mutationType': 'UPDATE'},
  'finance_reconciliation_match': {'entityType': 'reconciliation_item', 'mutationType': 'UPDATE'},
};

/// State for the sync coordinator
class SyncCoordinatorState {
  const SyncCoordinatorState({
    this.isSyncing = false,
    this.lastSyncAttempt,
    this.lastSuccessfulSync,
    this.lastOnlineAt,
    this.lastAppResumeAt,
    this.pendingConflictCount = 0,
    this.lastError,
  });

  final bool isSyncing;
  final DateTime? lastSyncAttempt;
  final DateTime? lastSuccessfulSync;
  final DateTime? lastOnlineAt;
  final DateTime? lastAppResumeAt;
  final int pendingConflictCount;
  final String? lastError;

  SyncCoordinatorState copyWith({
    bool? isSyncing,
    DateTime? lastSyncAttempt,
    DateTime? lastSuccessfulSync,
    DateTime? lastOnlineAt,
    DateTime? lastAppResumeAt,
    int? pendingConflictCount,
    String? lastError,
  }) {
    return SyncCoordinatorState(
      isSyncing: isSyncing ?? this.isSyncing,
      lastSyncAttempt: lastSyncAttempt ?? this.lastSyncAttempt,
      lastSuccessfulSync: lastSuccessfulSync ?? this.lastSuccessfulSync,
      lastOnlineAt: lastOnlineAt ?? this.lastOnlineAt,
      lastAppResumeAt: lastAppResumeAt ?? this.lastAppResumeAt,
      pendingConflictCount: pendingConflictCount ?? this.pendingConflictCount,
      lastError: lastError ?? this.lastError,
    );
  }
}

/// Sync coordinator that manages exactly-once drain triggers and
/// payload v2 compliant sync with conflict handling.
class SyncCoordinator extends StateNotifier<SyncCoordinatorState> {
  SyncCoordinator({
    required this.offlineQueue,
    required this.connectivity,
    required this.ref,
    Duration? resumeGracePeriod,
  }) : _deviceId = '',
       _resumeGracePeriod = resumeGracePeriod ?? const Duration(seconds: 60),
       super(const SyncCoordinatorState()) {
    _init();
  }

  final OfflineQueue offlineQueue;
  final Connectivity connectivity;
  final Ref ref;
  String _deviceId = '';
  final Duration _resumeGracePeriod;

  Timer? _startupTimer;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  StreamSubscription<void>? _lifecycleSub;
  bool _hasDoneStartupSync = false;

  String get deviceId => _deviceId;

  Future<void> _init() async {
    // Load or create device ID
    _deviceId = await _getOrCreateDeviceId();

    // 1. Startup sync (after brief delay to let other services initialize)
    _startupTimer = Timer(const Duration(seconds: 3), () {
      if (!_hasDoneStartupSync) {
        _hasDoneStartupSync = true;
        unawaited(syncNow(trigger: SyncTrigger.startup));
      }
    });

    // 2. Online-edge trigger (connectivity change: offline → online)
    _connectivitySub = connectivity.onConnectivityChanged.listen((results) {
      final wasOnline = state.lastOnlineAt != null &&
          DateTime.now().difference(state.lastOnlineAt!) < const Duration(seconds: 5);
      final isOnline = results.any((r) => r != ConnectivityResult.none);

      if (!wasOnline && isOnline) {
        state = state.copyWith(lastOnlineAt: DateTime.now());
        unawaited(syncNow(trigger: SyncTrigger.onlineEdge));
      }
    });

    // 3. Resume trigger (>60s background)
    _lifecycleSub = _lifecycleStream().listen((_) {
      final now = DateTime.now();
      final lastResume = state.lastAppResumeAt;
      if (lastResume != null && now.difference(lastResume) > _resumeGracePeriod) {
        state = state.copyWith(lastAppResumeAt: now);
        unawaited(syncNow(trigger: SyncTrigger.resume));
      } else {
        state = state.copyWith(lastAppResumeAt: now);
      }
    });

    // 4. Crash recovery: reset any stuck 'syncing' events to pending
    _recoverStuckEvents();
  }

  /// Recover events stuck in 'syncing' state from a previous crash.
  Future<void> _recoverStuckEvents() async {
    try {
      final allEvents = offlineQueue.getAllEvents();
      final stuck = allEvents.where((e) => e.status == QueueStatus.syncing).toList();
      for (final event in stuck) {
        await offlineQueue.resetToPending(event.clientEventId);
      }
      if (stuck.isNotEmpty) {
        debugPrint('[SyncCoordinator] Recovered ${stuck.length} stuck syncing events');
      }
    } catch (_) {
      // Ignore recovery failures
    }
  }

  /// Creates a stream that emits when the app resumes from background.
  Stream<void> _lifecycleStream() {
    final controller = StreamController<void>.broadcast();
    void listener(AppLifecycleState state) {
      if (state == AppLifecycleState.resumed) {
        controller.add(null);
      }
    }
    WidgetsBinding.instance.addObserver(_LifecycleObserver(listener));
    controller.onCancel = () {
      // Note: WidgetsBinding.instance.removeObserver doesn't work with function references
      // This is a simplified approach; in production you'd use a proper observer class
    };
    return controller.stream;
  }

  /// Drain both offline queue and media outbox.
  Future<SyncResult> syncNow({SyncTrigger trigger = SyncTrigger.manual}) async {
    if (state.isSyncing) {
      debugPrint('[SyncCoordinator] Sync already in progress, skipping $trigger');
      return SyncResult(confirmed: 0, conflicts: 0, trigger: trigger);
    }

    state = state.copyWith(isSyncing: true, lastSyncAttempt: DateTime.now(), lastError: null);

    int confirmed = 0;
    int conflicts = 0;

    try {
      // 1. Build payload v2 mutations from offline queue
      final pendingEvents = offlineQueue.getPendingEvents();
      if (pendingEvents.isNotEmpty) {
        final mutations = pendingEvents.map((e) {
          final mapping = _syncActionEntityMap[e.type];
          return {
            'id': e.clientEventId,
            'action': e.type,
            'timestamp': e.createdAt.toIso8601String(),
            'payload': e.payload,
            'mutationType': mapping?['mutationType'],
            'entityType': mapping?['entityType'],
          };
        }).toList();

        // 2. Send to server
        final dio = ApiClient().dio;
        final response = await dio.post(
          '/mobile/v1/sync',
          data: {
            'deviceId': deviceId,
            'lastSyncedAt': DateTime.now().toIso8601String(),
            'mutations': mutations,
          },
        );

        final body = response.data;
        final processed = body is Map
            ? (body['processedMutations'] as List? ?? const [])
            : const <dynamic>[];
        final conflictList = body is Map
            ? (body['conflicts'] as List? ?? const [])
            : const <dynamic>[];
        final confirmedIds = processed.map((id) => id.toString()).toSet();

        // 3. Handle confirmations
        for (final event in pendingEvents) {
          if (confirmedIds.contains(event.clientEventId)) {
            await offlineQueue.markCompleted(event.clientEventId);
            confirmed++;
          } else {
            await offlineQueue.markFailed(
              event.clientEventId,
              'Server did not confirm mutation',
            );
          }
        }

        // 4. Track conflicts
        conflicts = conflictList.length;
        state = state.copyWith(pendingConflictCount: conflicts);
        if (conflicts > 0) {
          debugPrint('[SyncCoordinator] $conflicts conflicts detected');
        }
      }

      // 5. Drain media outbox
      final mediaDrain = ref.read(mediaDrainProvider.notifier);
      await mediaDrain.drain();

      state = state.copyWith(
        isSyncing: false,
        lastSuccessfulSync: DateTime.now(),
      );

      debugPrint('[SyncCoordinator] Sync completed (trigger: $trigger, confirmed: $confirmed, conflicts: $conflicts)');
      return SyncResult(confirmed: confirmed, conflicts: conflicts, trigger: trigger);
    } on DioException catch (e) {
      final errorMsg = e.response?.data?['error']?.toString() ?? e.message ?? 'Unknown error';
      state = state.copyWith(isSyncing: false, lastError: errorMsg);
      debugPrint('[SyncCoordinator] Sync failed ($trigger): $errorMsg');
      return SyncResult(confirmed: 0, conflicts: 0, trigger: trigger, error: errorMsg);
    } catch (e) {
      state = state.copyWith(isSyncing: false, lastError: e.toString());
      debugPrint('[SyncCoordinator] Sync error ($trigger): $e');
      return SyncResult(confirmed: 0, conflicts: 0, trigger: trigger, error: e.toString());
    }
  }

  /// Called when NFC attendance check-in is queued — immediate sync attempt.
  Future<void> nfcTriggerSync() async {
    await syncNow(trigger: SyncTrigger.nfc);
  }

  /// Retry failed events (resets to pending and triggers sync)
  Future<void> retryFailed() async {
    await offlineQueue.retryFailedEvents();
    await syncNow(trigger: SyncTrigger.manual);
  }

  @override
  void dispose() {
    _startupTimer?.cancel();
    _connectivitySub?.cancel();
    _lifecycleSub?.cancel();
    super.dispose();
  }
}

/// Result of a sync operation
class SyncResult {
  const SyncResult({
    required this.confirmed,
    required this.conflicts,
    required this.trigger,
    this.error,
  });

  final int confirmed;
  final int conflicts;
  final SyncTrigger trigger;
  final String? error;

  bool get hasError => error != null;
}

enum SyncTrigger {
  startup,
  onlineEdge,
  resume,
  nfc,
  manual,
}

/// Provider for the sync coordinator
final syncCoordinatorProvider = StateNotifierProvider<SyncCoordinator, SyncCoordinatorState>((ref) {
  final connectivity = Connectivity();
  return SyncCoordinator(
    offlineQueue: offlineQueue,
    connectivity: connectivity,
    ref: ref,
  );
});

/// Generate a stable device ID (stored in secure storage)
Future<String> _getOrCreateDeviceId() async {
  const storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  const key = 'sync_device_id';
  String? id = await storage.read(key: key);
  if (id == null) {
    final random = Random.secure();
    final bytes = List<int>.generate(16, (_) => random.nextInt(256));
    id = base64Url.encode(bytes);
    await storage.write(key: key, value: id);
  }
  return id;
}

/// Observer for app lifecycle changes.
class _LifecycleObserver extends WidgetsBindingObserver {
  _LifecycleObserver(this._onStateChange);

  final void Function(AppLifecycleState) _onStateChange;

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _onStateChange(state);
  }
}