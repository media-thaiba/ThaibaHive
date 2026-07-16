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
}

class TimelineRepository {
  final ApiClient _apiClient;

  TimelineRepository(this._apiClient);

  Future<List<TimelineItem>> getTimeline({int page = 1}) async {
    final response =
        await _apiClient.get('/timeline', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => TimelineItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => TimelineItem.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
