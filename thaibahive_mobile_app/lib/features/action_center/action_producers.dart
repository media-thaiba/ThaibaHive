import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/network/providers.dart';
import '../../core/services/fcm_service.dart';
import '../../core/services/sse_service.dart';
import 'action_mapper.dart';
import 'controller.dart';

/// Returns the mapped items for a pull source, `[]` when the source is
/// legitimately empty (e.g. 403 for a role without the permission), or `null`
/// on failure — a failed source keeps its existing items untouched.
typedef PullFetcher = Future<List<ActionItem>?> Function();

// ---------------------------------------------------------------------------
// Pure pull reconciliation (unit-tested without HTTP)
// ---------------------------------------------------------------------------

/// Replaces pull-derived items per source prefix ([sources] keys are dedupe
/// key prefixes such as `task:`), merges back live SSE/FCM arrivals from the
/// in-flight window, then runs TTL reconcile + pending-ack retry.
///
/// [lateArrivals] is read AFTER the fetches complete, so callers must pass the
/// live buffer (not a snapshot) for the pull↔live race merge-back to work.
Future<void> reconcilePull({
  required ActionCenterController controller,
  required Map<String, PullFetcher> sources,
  List<ActionItem> lateArrivals = const [],
}) async {
  final results = <String, List<ActionItem>?>{};
  final entries = sources.entries.toList();
  await Future.wait(entries.map((e) async {
    List<ActionItem>? value;
    try {
      value = await e.value();
    } catch (_) {
      value = null;
    }
    results[e.key] = value;
  }));

  for (final entry in results.entries) {
    final items = entry.value;
    if (items == null) continue; // failed source: keep existing items
    controller.removeWhere((item) =>
        item.source == ActionSource.pull && item.dedupeKey.startsWith(entry.key));
    controller.queueActions(items);
  }

  // Pull↔live race: SSE/FCM items enqueued while the flight ran may have been
  // removed above when they shared a dedupe key with a stale pull item —
  // re-queue them (enqueue dedupes, so this is idempotent).
  for (final live in lateArrivals) {
    final present =
        controller.items.any((item) => item.dedupeKey == live.dedupeKey);
    if (!present) controller.queueAction(live);
  }

  controller.reconcile();
  await controller.retryPendingAcks();
}

// ---------------------------------------------------------------------------
// HTTP fetchers (401/403 → empty, other errors → null)
// ---------------------------------------------------------------------------

List<Map<String, dynamic>>? _asList(dynamic data, String key) {
  final list = data is Map ? data[key] ?? data['data'] : data;
  if (list is! List) return null;
  return list
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .toList();
}

bool _isForbidden(DioException e) {
  final code = e.response?.statusCode;
  return code == 401 || code == 403;
}

/// GET /api/notifications → `{notifications, unreadCount}` (read skipped).
Future<List<ActionItem>?> fetchNotificationActions(Dio dio) async {
  try {
    final res = await dio.get('/notifications');
    final list = _asList(res.data, 'notifications');
    if (list == null) return null;
    return list
        .map(ActionMapper.fromNotificationJson)
        .whereType<ActionItem>()
        .toList();
  } on DioException catch (e) {
    return _isForbidden(e) ? const [] : null;
  } catch (_) {
    return null;
  }
}

/// GET /api/tasks → `{tasks, …}` (completed/cancelled skipped).
Future<List<ActionItem>?> fetchTaskActions(Dio dio) async {
  try {
    final res = await dio.get('/tasks', queryParameters: {'page': 1, 'limit': 50});
    final list = _asList(res.data, 'tasks');
    if (list == null) return null;
    return list
        .map((j) => ActionMapper.fromTaskJson(j))
        .whereType<ActionItem>()
        .toList();
  } on DioException catch (e) {
    return _isForbidden(e) ? const [] : null;
  } catch (_) {
    return null;
  }
}

/// GET /api/help-desk → `{tickets}` (resolved/closed skipped).
Future<List<ActionItem>?> fetchTicketActions(Dio dio) async {
  try {
    final res = await dio.get('/help-desk', queryParameters: {'page': 1});
    final list = _asList(res.data, 'tickets');
    if (list == null) return null;
    return list
        .map(ActionMapper.fromTicketJson)
        .whereType<ActionItem>()
        .toList();
  } on DioException catch (e) {
    return _isForbidden(e) ? const [] : null;
  } catch (_) {
    return null;
  }
}

/// GET /api/approvals → `{approvals}` (non-pending skipped, 403 → empty).
Future<List<ActionItem>?> fetchApprovalActions(Dio dio) async {
  try {
    final res = await dio.get('/approvals');
    final list = _asList(res.data, 'approvals');
    if (list == null) return null;
    return list
        .map(ActionMapper.fromApprovalJson)
        .whereType<ActionItem>()
        .toList();
  } on DioException catch (e) {
    return _isForbidden(e) ? const [] : null;
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bootstrap: wires pull + SSE + FCM producers into the controller
// ---------------------------------------------------------------------------

class ActionCenterBootstrap {
  ActionCenterBootstrap(this.ref);

  final Ref ref;

  bool _started = false;
  bool _pullInFlight = false;
  final List<ActionItem> _liveArrivals = [];
  DateTime? _lastRefreshPull;
  static const _refreshThrottle = Duration(seconds: 10);

  ActionCenterController get _controller =>
      ref.read(actionCenterProvider.notifier);

  /// Idempotent; called once when the Action Center is first watched.
  void start() {
    if (_started) return;
    _started = true;

    _controller.reconcile(); // apply TTL/snooze wake to hydrated state
    unawaited(_controller.retryPendingAcks());

    ref.listen<SSEServiceState>(sseServiceProvider, _onSseState);
    FCMService.onForegroundMessage = _onFcmMessage;

    unawaited(pullAll());
  }

  // -------------------------------------------------------------------------
  // Pull
  // -------------------------------------------------------------------------

  /// Pulls every source in parallel; failed sources keep their items.
  Future<void> pullAll() async {
    final dio = ref.read(dioProvider);
    _pullInFlight = true;
    _liveArrivals.clear();
    try {
      await reconcilePull(
        controller: _controller,
        sources: {
          'notification:': () => fetchNotificationActions(dio),
          'task:': () => fetchTaskActions(dio),
          'helpdesk:': () => fetchTicketActions(dio),
          'approval:': () => fetchApprovalActions(dio),
        },
        lateArrivals: _liveArrivals,
      );
    } finally {
      _pullInFlight = false;
      _liveArrivals.clear();
    }
  }

  // -------------------------------------------------------------------------
  // SSE
  // -------------------------------------------------------------------------

  void _onSseState(SSEServiceState? previous, SSEServiceState next) {
    final payload = next.lastPayload;
    if (payload == null) return;
    if (identical(previous?.lastPayload, payload)) return;

    final frameType = payload['type']?.toString();
    if (frameType == 'refresh') {
      _maybeRefreshPull();
      return;
    }

    final item = ActionMapper.fromSsePayload(payload);
    if (item != null) _enqueueLive(item);
  }

  void _maybeRefreshPull() {
    final now = DateTime.now();
    final last = _lastRefreshPull;
    if (last != null && now.difference(last) < _refreshThrottle) return;
    _lastRefreshPull = now;
    unawaited(pullAll());
  }

  // -------------------------------------------------------------------------
  // FCM
  // -------------------------------------------------------------------------

  void _onFcmMessage(Map<String, dynamic> data, {String? title, String? body}) {
    final item = ActionMapper.fromFcmData(data, title: title, body: body);
    if (item != null) _enqueueLive(item);
  }

  void _enqueueLive(ActionItem item) {
    _controller.queueAction(item);
    if (_pullInFlight) _liveArrivals.add(item);
  }
}

/// Watched once (Today/shell) — starts SSE, the FCM hook, and the first pull.
final actionCenterBootstrapProvider = Provider<ActionCenterBootstrap>((ref) {
  final bootstrap = ActionCenterBootstrap(ref)..start();
  ref.onDispose(() {
    FCMService.onForegroundMessage = null;
  });
  return bootstrap;
});
