import 'package:thaibahive_mobile/core/services/fcm_service.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';

/// Single place that turns notification-like payloads (pull, SSE, FCM) into
/// [ActionItem]s — one `type → route` map shared with FCM deep-link handling,
/// always passed through the FCM route allowlist.
class ActionMapper {
  ActionMapper._();

  // ---------------------------------------------------------------------------
  // Type → route
  // ---------------------------------------------------------------------------

  /// Resolves a route for a notification type. Unknown types deliberately go
  /// to `/notifications` (the in-app notification list) — never a silent `/`.
  static String routeForType(String? type, {String? id}) {
    final raw = switch (type) {
      'leave' => id != null ? '/leaves/$id' : '/leaves',
      'task' => id != null ? '/tasks/$id' : '/tasks',
      'announcement' => id != null ? '/announcements/$id' : '/announcements',
      // GoRouter has /approvals list only — no /approvals/:id detail route
      'approval' => '/approvals',
      'event' => id != null ? '/events/$id' : '/events',
      'report' => '/reports',
      'asset' => id != null ? '/assets/$id' : '/assets',
      'expense' => '/expenses',
      'booking' => id != null ? '/bookings/$id' : '/bookings',
      'poll' => id != null ? '/polls/$id' : '/polls',
      'grievance' => '/grievances',
      'recognition' => '/recognition',
      'purchase' => '/purchases',
      'circular' => '/circulars',
      'canteen' => '/canteen',
      'helpdesk' => '/help-desk',
      'general' => '/notifications',
      'new' => '/notifications',
      _ => '/notifications',
    };
    return FCMService.validateAndWhitelistRoute(raw);
  }

  // ---------------------------------------------------------------------------
  // Type → priority (plan §C.1 priority mapping)
  // ---------------------------------------------------------------------------

  static ActionPriority priorityForType(String? type) {
    return switch (type) {
      'approval' || 'leave' => ActionPriority.urgent,
      'task' || 'helpdesk' || 'help_desk' => ActionPriority.high,
      _ => ActionPriority.normal,
    };
  }

  // ---------------------------------------------------------------------------
  // Dedupe keys (unified id spellings: pull `id`, SSE `notification.id` |
  // `notificationId`, FCM data `notificationId`)
  // ---------------------------------------------------------------------------

  static String notificationKey(String id) => 'notification:$id';
  static String taskKey(String id) => 'task:$id';
  static String helpdeskKey(String id) => 'helpdesk:$id';
  static String approvalKey(String type, String id) => 'approval:$type:$id';

  // ---------------------------------------------------------------------------
  // SSE frames
  // ---------------------------------------------------------------------------

  /// Canonical frame: `{type:'new', notification:{id, type, referenceType,
  /// referenceId, title, message, createdAt, …}}`.
  /// Legacy frame: `{type:'new_notification', notificationId, title, message}`.
  /// Non-item frames (`refresh`, heartbeats, malformed) → null.
  static ActionItem? fromSsePayload(Map<String, dynamic> payload) {
    final frameType = payload['type']?.toString();
    if (frameType == 'new') {
      final raw = payload['notification'];
      if (raw is! Map) return null;
      return fromNotificationJson(
        Map<String, dynamic>.from(raw),
        source: ActionSource.sse,
      );
    }
    if (frameType == 'new_notification') {
      final notificationId = (payload['notificationId'] ?? payload['id'])?.toString();
      if (notificationId == null || notificationId.isEmpty) return null;
      return _build(
        id: notificationId,
        dedupeKey: notificationKey(notificationId),
        title: payload['title']?.toString() ?? 'New notification',
        description: payload['message']?.toString() ?? '',
        // Legacy frames carry no type — best-effort: open the notification list.
        type: null,
        referenceId: null,
        source: ActionSource.sse,
      );
    }
    return null; // 'refresh', 'ack', unknown frames are not actions
  }

  // ---------------------------------------------------------------------------
  // FCM
  // ---------------------------------------------------------------------------

  /// FCM data payload `{type, id?, referenceId?, notificationId?}` plus the
  /// banner title/body (data payloads carry no title).
  static ActionItem? fromFcmData(
    Map<String, dynamic> data, {
    String? title,
    String? body,
  }) {
    final notificationId =
        (data['notificationId'] ?? data['notification_id'] ?? data['id'])?.toString();
    if (notificationId == null || notificationId.isEmpty) return null;
    final type = data['type']?.toString();
    return _build(
      id: notificationId,
      dedupeKey: notificationKey(notificationId),
      title: title ?? data['title']?.toString() ?? 'New notification',
      description: body ?? data['message']?.toString() ?? '',
      type: type,
      referenceId: (data['referenceId'] ?? data['id'])?.toString(),
      source: ActionSource.fcm,
    );
  }

  // ---------------------------------------------------------------------------
  // Pull sources (raw JSON maps — camelCase primary, snake_case fallback;
  // deliberately independent of existing models' parsing quirks)
  // ---------------------------------------------------------------------------

  /// GET /api/notifications → `{notifications: […]}`. Read items are skipped.
  static ActionItem? fromNotificationJson(
    Map<String, dynamic> json, {
    ActionSource source = ActionSource.pull,
  }) {
    final id = _str(json['id']);
    if (id == null) return null;
    if (json['isRead'] == true || json['is_read'] == true) return null;
    final type = _str(json['type']);
    return _build(
      id: id,
      dedupeKey: notificationKey(id),
      title: _str(json['title']) ?? 'Notification',
      description: _str(json['message']) ?? '',
      type: type,
      referenceId: _str(json['referenceId'] ?? json['reference_id'] ?? json['related_id']),
      createdAt: _dateTime(json['createdAt'] ?? json['created_at']),
      source: source,
    );
  }

  /// GET /api/tasks → `{tasks: […]}`. Completed/cancelled tasks are skipped;
  /// due today or overdue → high, else normal.
  static ActionItem? fromTaskJson(Map<String, dynamic> json, {DateTime? now}) {
    final id = _str(json['id']);
    if (id == null) return null;
    final status = _str(json['status']) ?? 'todo';
    if (status == 'completed' || status == 'cancelled') return null;
    final at = now ?? DateTime.now();
    final due = _dateTime(json['dueDate'] ?? json['due_date']);
    final dueSoon = due != null && !due.isAfter(at.add(const Duration(days: 1)));
    return _build(
      id: id,
      dedupeKey: taskKey(id),
      title: _str(json['title']) ?? 'Task',
      description: _str(json['description']) ?? '',
      type: 'task',
      referenceId: id,
      createdAt: _dateTime(json['createdAt'] ?? json['created_at']),
      priority: dueSoon ? ActionPriority.high : ActionPriority.normal,
      source: ActionSource.pull,
    );
  }

  /// GET /api/help-desk → `{tickets: […]}`. Resolved/closed skipped.
  static ActionItem? fromTicketJson(Map<String, dynamic> json) {
    final id = _str(json['id']);
    if (id == null) return null;
    final status = _str(json['status']) ?? 'open';
    if (status == 'resolved' || status == 'closed') return null;
    return _build(
      id: id,
      dedupeKey: helpdeskKey(id),
      title: _str(json['title']) ?? 'Helpdesk ticket',
      description: _str(json['description']) ?? '',
      type: 'helpdesk',
      referenceId: id,
      createdAt: _dateTime(json['createdAt'] ?? json['created_at']),
      priority: ActionPriority.high,
      source: ActionSource.pull,
    );
  }

  /// GET /api/approvals → `{approvals: […]}`. Only pending items are actions.
  static ActionItem? fromApprovalJson(Map<String, dynamic> json) {
    final id = _str(json['id']);
    final type = _str(json['type']);
    if (id == null || type == null) return null;
    final status = _str(json['status']) ?? 'pending';
    if (status.toLowerCase() != 'pending') return null;
    final submittedBy = _str(json['submittedBy']);
    return _build(
      id: '$type:$id',
      dedupeKey: approvalKey(type, id),
      title: _str(json['title']) ?? 'Approval request',
      description: submittedBy != null ? 'From $submittedBy' : '',
      type: 'approval',
      referenceId: id,
      createdAt: _dateTime(json['submittedAt'] ?? json['createdAt']),
      priority: ActionPriority.urgent,
      source: ActionSource.pull,
    );
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  static ActionItem? _build({
    required String id,
    required String dedupeKey,
    required String title,
    required String description,
    required String? type,
    required String? referenceId,
    required ActionSource source,
    ActionPriority? priority,
    DateTime? createdAt,
  }) {
    // referenceType-aware route: FCM/SSE frames for leaves carry type 'leave';
    // when only a reference is present, fall back to the notification list.
    final route = routeForType(type, id: referenceId);
    return ActionItem(
      id: id,
      title: title,
      description: description,
      capability: '',
      route: route,
      createdAt: createdAt ?? DateTime.now(),
      priority: priority ?? priorityForType(type),
      dedupeKey: dedupeKey,
      source: source,
    );
  }

  static String? _str(dynamic v) => v?.toString();

  static DateTime? _dateTime(dynamic v) {
    if (v is String) return DateTime.tryParse(v);
    return null;
  }
}
