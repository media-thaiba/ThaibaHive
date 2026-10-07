import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

final timelineRepositoryProvider = Provider<TimelineRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return TimelineRepository(apiClient);
});

class TimelineItem {
  final String id;
  final String type;
  final String title;
  final String? description;
  final DateTime timestamp;
  final Map<String, dynamic>? metadata;

  const TimelineItem({
    required this.id,
    required this.type,
    required this.title,
    this.description,
    required this.timestamp,
    this.metadata,
  });

  factory TimelineItem.fromJson(Map<String, dynamic> json) => TimelineItem(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        timestamp: DateTime.parse(json['timestamp'] as String),
        metadata: json['metadata'] as Map<String, dynamic>?,
      );

  /// D10: maps an `activity_logs` row from `GET /api/activity-logs`
  /// (`{id(int), action, resourceType, resourceId, details, createdAt, …}`).
  /// `action` becomes the item type, `details` (when present) the title.
  factory TimelineItem.fromActivityLogJson(Map<String, dynamic> json) {
    final action = (json['action'] ?? 'activity') as String;
    final details = json['details'] as String?;
    return TimelineItem(
      id: (json['id'] ?? '').toString(),
      type: action,
      title: (details != null && details.trim().isNotEmpty) ? details : action,
      description: json['resourceType'] as String?,
      timestamp: DateTime.tryParse(
              (json['createdAt'] ?? json['created_at'] ?? '').toString()) ??
          DateTime.now(),
      metadata: {
        'action': action,
        if (json['resourceId'] != null) 'resourceId': json['resourceId'],
        if (json['staffId'] != null) 'staffId': json['staffId'],
      },
    );
  }
}

class TimelineRepository {
  final ApiClient _apiClient;

  TimelineRepository(this._apiClient);

  /// D10: repointed from the nonexistent `/timeline` to `/activity-logs`,
  /// parsing the real `{logs, total, page, limit}` envelope. Scope (own +
  /// same-department logs) is enforced server-side.
  static List<TimelineItem> parseLogs(dynamic data) {
    final list = data is Map ? (data['logs'] ?? data['data']) : data;
    if (list is! List) return [];
    return list
        .whereType<Map>()
        .map((e) => TimelineItem.fromActivityLogJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<TimelineItem>> getTimeline({int page = 1, int limit = 10}) async {
    final response = await _apiClient.get(
      '/activity-logs',
      queryParameters: {'page': page, 'limit': limit},
    );
    return parseLogs(response);
  }
}
