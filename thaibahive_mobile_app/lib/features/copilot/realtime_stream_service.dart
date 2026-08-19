import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

class RealTimeStreamItem {
  final String eventId;
  final String channel;
  final String eventType;
  final String title;
  final String summary;
  final String timestamp;

  RealTimeStreamItem({
    required this.eventId,
    required this.channel,
    required this.eventType,
    required this.title,
    required this.summary,
    required this.timestamp,
  });

  factory RealTimeStreamItem.fromJson(Map<String, dynamic> json) {
    return RealTimeStreamItem(
      eventId: json['eventId'] ?? '',
      channel: json['channel'] ?? '',
      eventType: json['eventType'] ?? '',
      title: json['title'] ?? 'Real-Time Alert',
      summary: json['summary'] ?? '',
      timestamp: json['timestamp'] ?? '',
    );
  }
}

class RealTimeStreamService {
  final String baseUrl;

  RealTimeStreamService({this.baseUrl = 'http://localhost:3000'});

  Future<List<RealTimeStreamItem>> fetchRealTimeEvents(String tenantId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mobile/v1/realtime-stream?tenantId=$tenantId'),
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        if (body['success'] == true && body['events'] is List) {
          return (body['events'] as List)
              .map((item) => RealTimeStreamItem.fromJson(item))
              .toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}

final realTimeStreamServiceProvider = Provider<RealTimeStreamService>((ref) {
  return RealTimeStreamService();
});
