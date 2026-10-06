import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';

import '../../core/network/providers.dart';
import 'action_state_machine.dart';

/// Where an action originated — used for dedupe + pull reconciliation.
enum ActionSource { pull, sse, fcm, local }

/// Represents an action item in the Action Center
class ActionItem {
  final String id;
  final String title;
  final String description;
  final String capability; // Required capability to perform this action
  final String route; // Route to navigate when tapped
  final DateTime createdAt;
  final ActionPriority priority;
  final ActionStatus status;
  final String dedupeKey;
  final ActionSource source;
  final String? institutionId;
  final DateTime? expiresAt;
  final DateTime? snoozeUntil;
  final DateTime updatedAt;

  const ActionItem({
    required this.id,
    required this.title,
    required this.description,
    required this.capability,
    required this.route,
    required this.createdAt,
    this.priority = ActionPriority.normal,
    this.status = ActionStatus.pending,
    String? dedupeKey,
    this.source = ActionSource.local,
    this.institutionId,
    this.expiresAt,
    this.snoozeUntil,
    DateTime? updatedAt,
  })  : dedupeKey = dedupeKey ?? 'action:$id',
        updatedAt = updatedAt ?? createdAt;

  bool get isVisible => kVisibleStatuses.contains(status);
  bool get isBadgeCounted => kBadgeStatuses.contains(status);

  ActionItem copyWith({
    String? title,
    String? description,
    String? route,
    ActionPriority? priority,
    ActionStatus? status,
    ActionSource? source,
    DateTime? expiresAt,
    DateTime? snoozeUntil,
    bool clearSnooze = false,
    DateTime? updatedAt,
  }) {
    return ActionItem(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      capability: capability,
      route: route ?? this.route,
      createdAt: createdAt,
      priority: priority ?? this.priority,
      status: status ?? this.status,
      dedupeKey: dedupeKey,
      source: source ?? this.source,
      institutionId: institutionId,
      expiresAt: expiresAt ?? this.expiresAt,
      snoozeUntil: clearSnooze ? null : (snoozeUntil ?? this.snoozeUntil),
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'capability': capability,
        'route': route,
        'createdAt': createdAt.toIso8601String(),
        'priority': priority.name,
        'status': status.name,
        'dedupeKey': dedupeKey,
        'source': source.name,
        'institutionId': institutionId,
        'expiresAt': expiresAt?.toIso8601String(),
        'snoozeUntil': snoozeUntil?.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory ActionItem.fromJson(Map<String, dynamic> json) => ActionItem(
        id: json['id'] as String,
        title: json['title'] as String? ?? '',
        description: json['description'] as String? ?? '',
        capability: json['capability'] as String? ?? '',
        route: json['route'] as String? ?? '/',
        createdAt: DateTime.parse(json['createdAt'] as String),
        priority: ActionPriority.values.firstWhere(
          (p) => p.name == json['priority'],
          orElse: () => ActionPriority.normal,
        ),
        status: ActionStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => ActionStatus.pending,
        ),
        dedupeKey: json['dedupeKey'] as String?,
        source: ActionSource.values.firstWhere(
          (s) => s.name == json['source'],
          orElse: () => ActionSource.local,
        ),
        institutionId: json['institutionId'] as String?,
        expiresAt: json['expiresAt'] != null
            ? DateTime.parse(json['expiresAt'] as String)
            : null,
        snoozeUntil: json['snoozeUntil'] != null
            ? DateTime.parse(json['snoozeUntil'] as String)
            : null,
        updatedAt: json['updatedAt'] != null
            ? DateTime.parse(json['updatedAt'] as String)
            : null,
      );
}

enum ActionPriority { low, normal, high, urgent }

/// Hive persistence for the Action Center (Phase 2 D1 — client-first).
/// Plain (untyped) box storing JSON maps keyed by `dedupeKey` — no TypeAdapter
/// codegen required. A `__meta` record carries the schema version; on mismatch
/// the box is discarded and rebuilt from server state on next pull.
class ActionCenterStore {
  static const String boxName = 'action_center';
  static const int schemaVersion = 1;
  static const String metaKey = '__meta';
  static const String pendingAcksKey = '__pending_acks';

  Box? _box;
  bool _hydrated = false;

  Box get box => _box!;

  Future<Box> open() async {
    _box ??= await Hive.openBox(boxName);
    return _box!;
  }

  bool get hydrated => _hydrated;

  void markHydrated() => _hydrated = true;

  Future<void> resetForTests(Box box) async {
    _box = box;
    _hydrated = false;
  }
}

final actionCenterStore = ActionCenterStore();

/// Riverpod controller for the Action Center state machine.
///
/// - Pure transitions via [nextStatus] (illegal events are ignored)
/// - Dedupe on enqueue (`dedupeKey`, unified id spellings handled by mappers)
/// - TTL expiry + snooze wake applied lazily (reconcile on hydrate/read/resume)
/// - Hive persistence debounced 300ms; terminal items purged after retention
/// - Failed server acks tracked for retry on next pull/app resume
class ActionCenterController extends StateNotifier<List<ActionItem>> {
  ActionCenterController(
      {ActionCenterStore? store,
      this.serverAckFn,
      this.serverMarkAllFn,
      bool autoHydrate = true})
      : _store = store ?? actionCenterStore,
        super([]) {
    if (autoHydrate) {
      unawaited(hydrate());
    }
  }

  final ActionCenterStore _store;

  /// Best-effort server acknowledgement for a single notification
  /// (`PATCH /api/notifications` `{id}`) — injected by the producers layer.
  final Future<bool> Function(String notificationId)? serverAckFn;

  /// Best-effort mark-all-read (`PATCH /api/notifications` without id).
  final Future<bool> Function()? serverMarkAllFn;

  Timer? _persistTimer;
  static const Duration _persistDebounce = Duration(milliseconds: 300);

  List<ActionItem> get _all => state;

  /// Read-only snapshot of all items (public accessor — `state` is @protected
  /// on StateNotifier and unreadable from producers/tests).
  List<ActionItem> get items => state;

  // ---------------------------------------------------------------------------
  // Hydration & reconciliation
  // ---------------------------------------------------------------------------

  Future<void> hydrate() async {
    try {
      final box = await _store.open();
      final meta = box.get(ActionCenterStore.metaKey);
      if (meta is! Map || meta['schemaVersion'] != ActionCenterStore.schemaVersion) {
        await box.clear();
        await box.put(ActionCenterStore.metaKey, {
          'schemaVersion': ActionCenterStore.schemaVersion,
        });
        state = [];
        _store.markHydrated();
        return;
      }

      final items = <ActionItem>[];
      final now = DateTime.now();
      final purgeBefore = now.subtract(kTerminalRetention);

      for (final key in box.keys.toList()) {
        if (key is! String || key.startsWith('__')) continue;
        final raw = box.get(key);
        if (raw is! Map) continue;
        try {
          final parsed = ActionItem.fromJson(Map<String, dynamic>.from(raw));
          final item = _reconcileItem(parsed, now);
          if (item == null) continue; // purged terminal
          if (item.status == ActionStatus.expired ||
              (isTerminalStatus(item.status) && item.updatedAt.isBefore(purgeBefore))) {
            await box.delete(key);
            continue;
          }
          items.add(item);
        } catch (_) {
          await box.delete(key); // malformed entry — rebuild from server
        }
      }

      state = items;
      _store.markHydrated();
      await loadAckBookkeeping();
    } catch (_) {
      // Hive unavailable (tests without init) — run in-memory.
      state = [];
      _store.markHydrated();
    }
  }

  /// Lazy expiry / snooze wake for one item. Returns null if it should be
  /// dropped from the box (purged terminal).
  ActionItem? _reconcileItem(ActionItem item, DateTime now) {
    if (isTerminalStatus(item.status)) {
      return item;
    }
    if (item.expiresAt != null && now.isAfter(item.expiresAt!)) {
      final next = nextStatus(item.status, ActionEvent.expire);
      if (next != null) return item.copyWith(status: next, updatedAt: now);
    }
      if (item.status == ActionStatus.snoozed &&
        shouldWake(snoozeUntil: item.snoozeUntil, now: now)) {
      final next = nextStatus(item.status, ActionEvent.wake);
      if (next != null) {
        return item.copyWith(
          status: next,
          clearSnooze: true,
          updatedAt: now,
        );
      }
    }
    return item;
  }

  /// Re-applies TTL/snooze rules for every live item — call on app resume,
  /// tray open, and Today open. Persisted if anything changed.
  void reconcile({DateTime? now}) {
    final at = now ?? DateTime.now();
    var changed = false;
    final next = state.map((item) {
      final before = item;
      final after = _reconcileItem(item, at);
      if (after == null) return item;
      if (!identical(before, after)) changed = true;
      return after;
    }).toList();
    if (changed) {
      state = next;
      _schedulePersist();
    }
  }

  // ---------------------------------------------------------------------------
  // Enqueue (dedupe + TTL)
  // ---------------------------------------------------------------------------

  /// Adds [item], applying dedupe: terminal duplicate → dropped; live
  /// duplicate → merged (max priority, fresh data, `createdAt`/TTL unchanged).
  /// Returns true if state changed.
  bool enqueue(ActionItem item) {
    final now = DateTime.now();
    final existing = _indexOfDedupe(item.dedupeKey);

    if (existing >= 0) {
      final current = state[existing];
      if (isTerminalStatus(current.status)) return false; // drop
      final mergedPriority = item.priority.index > current.priority.index
          ? item.priority
          : current.priority;
      final merged = current.copyWith(
        title: item.title,
        description: item.description,
        route: item.route,
        priority: mergedPriority,
        updatedAt: now,
      );
      final updated = [...state];
      updated[existing] = merged;
      state = updated;
      _schedulePersist();
      return true;
    }

    final expiresAt = item.expiresAt ??
        item.createdAt.add(kTtlByPriority[item.priority.name] ?? kTtlByPriority['normal']!);
    final seeded = item.copyWith(
      status: ActionStatus.pending,
      expiresAt: expiresAt,
      updatedAt: now,
    );
    state = [...state, seeded];
    _schedulePersist();
    return true;
  }

  /// Queue a new action item (e.g., when a notification arrives)
  void queueAction(ActionItem item) => enqueue(item);

  /// Queue multiple actions at once
  void queueActions(List<ActionItem> items) {
    for (final item in items) {
      enqueue(item);
    }
  }

  /// Silently removes every item matching [test] — used by pull reconciliation
  /// to drop items the server no longer reports (not a user transition, so no
  /// ack bookkeeping and no persistence debounce change).
  void removeWhere(bool Function(ActionItem item) test) {
    final next = state.where((item) => !test(item)).toList();
    if (next.length == state.length) return;
    state = next;
    _schedulePersist();
  }

  int _indexOfDedupe(String dedupeKey) =>
      state.indexWhere((item) => item.dedupeKey == dedupeKey);

  // ---------------------------------------------------------------------------
  // Transitions
  // ---------------------------------------------------------------------------

  /// Applies [event] to the item with [id]; ignores illegal transitions.
  /// Returns the updated item, or null if nothing changed.
  ActionItem? apply(String id, ActionEvent event, {DateTime? now, DateTime? snoozeUntil}) {
    final at = now ?? DateTime.now();
    final index = state.indexWhere((item) => item.id == id);
    if (index < 0) return null;
    final current = state[index];
    final target = nextStatus(current.status, event);
    if (target == null) return null;

    var updated = current.copyWith(
      status: target,
      updatedAt: at,
      snoozeUntil:
          event == ActionEvent.snooze ? (snoozeUntil ?? at.add(const Duration(hours: 2))) : null,
      clearSnooze: event != ActionEvent.snooze,
    );

    // Server ack bookkeeping: dismissing/completing a notification-derived
    // action is best-effort server-acked; failures are retried later.
    if (event == ActionEvent.dismiss || event == ActionEvent.complete) {
      updated = _registerAckIfNeeded(updated, success: false);
    }

    final next = [...state];
    next[index] = updated;
    state = next;
    _schedulePersist();
    return updated;
  }

  ActionItem _registerAckIfNeeded(ActionItem item, {required bool success}) {
    if (!item.dedupeKey.startsWith('notification:')) return item;
    if (success) return item;
    _pendingAcks.add(item.dedupeKey.substring('notification:'.length));
    _schedulePersist();
    return item;
  }

  /// Acknowledge an action (visible → acknowledged).
  void acknowledge(String id) => apply(id, ActionEvent.acknowledge);

  /// Snooze an action until [until] (defaults to +2h). Wakes lazily.
  void snooze(String id, {DateTime? until}) =>
      apply(id, ActionEvent.snooze, snoozeUntil: until);

  /// Mark an action completed (e.g. its server state is already final).
  void completeAction(String actionId) => apply(actionId, ActionEvent.complete);

  /// Dismiss an action — server-acked best-effort for notifications.
  void dismiss(String actionId) => apply(actionId, ActionEvent.dismiss);

  /// Clear all visible actions (best-effort server mark-all-read).
  void clearAll() {
    final now = DateTime.now();
    final notificationDerived =
        state.any((i) => i.isVisible && i.dedupeKey.startsWith('notification:'));
    final next = state.map((item) {
      if (!item.isVisible) return item;
      final target = nextStatus(item.status, ActionEvent.dismiss);
      if (target == null) return item;
      return item.copyWith(status: target, updatedAt: now);
    }).toList();
    state = next;
    if (notificationDerived) {
      _pendingMarkAll = true;
    }
    _schedulePersist();
    unawaited(_runServerAcks());
  }

  // ---------------------------------------------------------------------------
  // Server ack retry (reconciled on pull / app resume)
  // ---------------------------------------------------------------------------

  final Set<String> _pendingAcks = {};
  bool _pendingMarkAll = false;

  Set<String> get pendingAcks => Set.unmodifiable(_pendingAcks);
  bool get hasPendingMarkAll => _pendingMarkAll;

  /// Retries failed server acks; call on pull + app resume. Failures are
  /// retained for the next attempt (never blocks local state).
  Future<void> retryPendingAcks() => _runServerAcks();

  Future<void> _runServerAcks() async {
    if (_pendingMarkAll) {
      final fn = serverMarkAllFn;
      if (fn != null) {
        try {
          if (await fn()) _pendingMarkAll = false;
        } catch (_) {/* keep pending */}
      }
    }
    final fn = serverAckFn;
    if (fn == null || _pendingAcks.isEmpty) {
      _schedulePersist();
      return;
    }
    final failed = <String>{};
    for (final notificationId in Set<String>.from(_pendingAcks)) {
      try {
        if (!await fn(notificationId)) failed.add(notificationId);
      } catch (_) {
        failed.add(notificationId);
      }
    }
    _pendingAcks
      ..clear()
      ..addAll(failed);
    _schedulePersist();
  }

  // ---------------------------------------------------------------------------
  // Counts
  // ---------------------------------------------------------------------------

  /// Badge count definition: pending + snoozed only (acknowledged excluded).
  int get pendingCount => state.where((a) => a.isBadgeCounted).length;

  /// Urgent subset of the badge count.
  int get urgentCount => state
      .where((a) => a.isBadgeCounted && a.priority == ActionPriority.urgent)
      .length;

  /// Items rendered in the tray / inline lists.
  List<ActionItem> get visibleActions =>
      state.where((a) => a.isVisible).toList()..sort(_byPriorityThenAge);

  /// Actions sorted by priority (urgent first) then by creation time.
  List<ActionItem> get sortedActions => visibleActions;

  static int _byPriorityThenAge(ActionItem a, ActionItem b) {
    const priorityOrder = {
      ActionPriority.urgent: 0,
      ActionPriority.high: 1,
      ActionPriority.normal: 2,
      ActionPriority.low: 3,
    };
    final priorityDiff = priorityOrder[a.priority]! - priorityOrder[b.priority]!;
    if (priorityDiff != 0) return priorityDiff;
    return a.createdAt.compareTo(b.createdAt);
  }

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  void _schedulePersist() {
    _persistTimer?.cancel();
    _persistTimer = Timer(_persistDebounce, () {
      unawaited(persistNow());
    });
  }

  /// Flushes current state to Hive immediately (used by tests + dispose).
  Future<void> persistNow() async {
    try {
      final box = await _store.open();
      if (box.get(ActionCenterStore.metaKey) is! Map) {
        await box.put(ActionCenterStore.metaKey, {
          'schemaVersion': ActionCenterStore.schemaVersion,
        });
      }
      await box.putAll({
        for (final item in state) item.dedupeKey: item.toJson(),
        ActionCenterStore.pendingAcksKey: {
          'acks': _pendingAcks.toList(),
          'markAll': _pendingMarkAll,
        },
      });
      // Drop keys for items no longer present (e.g. reconciled away).
      final liveKeys = state.map((i) => i.dedupeKey).toSet();
      final stale = box.keys
          .where((k) =>
              k is String &&
              !k.startsWith('__') &&
              !liveKeys.contains(k))
          .toList();
      if (stale.isNotEmpty) await box.deleteAll(stale);
    } catch (_) {
      // Hive unavailable — state stays in memory.
    }
  }

  /// Loads pending-ack bookkeeping (called from hydrate path in tests).
  Future<void> loadAckBookkeeping() async {
    try {
      final box = await _store.open();
      final raw = box.get(ActionCenterStore.pendingAcksKey);
      if (raw is Map) {
        _pendingAcks
          ..clear()
          ..addAll((raw['acks'] as List? ?? const []).map((e) => e.toString()));
        _pendingMarkAll = raw['markAll'] == true;
      }
    } catch (_) {/* ignore */}
  }

  @override
  void dispose() {
    // Cancel any pending debounced write. Tests (and critical paths) call
    // [persistNow] explicitly; auto-flushing here would race box edits made
    // after disposal in tests.
    _persistTimer?.cancel();
    super.dispose();
  }
}

/// Provider for the Action Center controller.
///
/// Server acks use the real notifications PATCH semantics: `{id}` marks one
/// read, an empty body marks all read (Phase 2 step 5).
final actionCenterProvider =
    StateNotifierProvider<ActionCenterController, List<ActionItem>>(
  (ref) {
    final api = ref.watch(apiClientProvider);
    return ActionCenterController(
      serverAckFn: (id) async {
        try {
          await api.dio.patch('/notifications', data: <String, dynamic>{'id': id});
          return true;
        } catch (_) {
          return false;
        }
      },
      serverMarkAllFn: () async {
        try {
          await api.dio.patch('/notifications', data: <String, dynamic>{});
          return true;
        } catch (_) {
          return false;
        }
      },
    );
  },
);

/// Provider for pending action count (badges: pending + snoozed only)
final pendingActionCountProvider = Provider<int>((ref) {
  return ref.watch(actionCenterProvider).where((a) => a.isBadgeCounted).length;
});

/// Provider for urgent action count (badge subset)
final urgentActionCountProvider = Provider<int>((ref) {
  return ref
      .watch(actionCenterProvider)
      .where((a) => a.isBadgeCounted && a.priority == ActionPriority.urgent)
      .length;
});
