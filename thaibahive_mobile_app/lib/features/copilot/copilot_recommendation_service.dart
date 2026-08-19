import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

class CopilotRecommendationItem {
  final String id;
  final String title;
  final String summary;
  final String domain;
  final double confidenceScore;
  final String humanApprovalStatus;
  final String createdAt;

  CopilotRecommendationItem({
    required this.id,
    required this.title,
    required this.summary,
    required this.domain,
    required this.confidenceScore,
    required this.humanApprovalStatus,
    required this.createdAt,
  });

  factory CopilotRecommendationItem.fromJson(Map<String, dynamic> json) {
    return CopilotRecommendationItem(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      summary: json['summary'] ?? '',
      domain: json['domain'] ?? '',
      confidenceScore: (json['confidenceScore'] as num?)?.toDouble() ?? 0.0,
      humanApprovalStatus: json['humanApprovalStatus'] ?? 'PENDING',
      createdAt: json['createdAt'] ?? '',
    );
  }
}

class CopilotRecommendationService {
  final String baseUrl;

  CopilotRecommendationService({this.baseUrl = 'http://localhost:3000'});

  Future<List<CopilotRecommendationItem>> fetchRecommendations(String tenantId) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mobile/v1/copilot-recommendations?tenantId=$tenantId'),
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body);
        if (body['success'] == true && body['data'] is List) {
          return (body['data'] as List)
              .map((item) => CopilotRecommendationItem.fromJson(item))
              .toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}

final copilotRecommendationServiceProvider = Provider<CopilotRecommendationService>((ref) {
  return CopilotRecommendationService();
});
