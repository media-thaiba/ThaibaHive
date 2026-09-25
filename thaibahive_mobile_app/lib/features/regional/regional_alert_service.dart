import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

class RegionalAlert {
  final String id;
  final String alertId;
  final String severity; // critical, high, medium, info
  final String title;
  final String body;
  final String sentAt;

  RegionalAlert({
    required this.id,
    required this.alertId,
    required this.severity,
    required this.title,
    required this.body,
    required this.sentAt,
  });

  factory RegionalAlert.fromJson(Map<String, dynamic> json) {
    return RegionalAlert(
      id: json['id'] ?? '',
      alertId: json['alertId'] ?? '',
      severity: json['severity'] ?? 'medium',
      title: json['title'] ?? 'Regional Alert',
      body: json['body'] ?? '',
      sentAt: json['sentAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class RegionalAlertService {
  final String baseUrl;
  final String? authToken;

  RegionalAlertService({required this.baseUrl, this.authToken});

  /// Register push notification device token for FCM/APNs
  Future<bool> registerDeviceToken(String deviceToken, String platform) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/mobile/v1/notifications/subscribe'),
        headers: {
          'Content-Type': 'application/json',
          if (authToken != null) 'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'deviceToken': deviceToken,
          'platform': platform,
        }),
      );
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Fetch active regional alerts for push receiver
  Future<List<RegionalAlert>> fetchRegionalAlerts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mobile/v1/regional/alerts'),
        headers: {
          'Content-Type': 'application/json',
          if (authToken != null) 'Authorization': 'Bearer $authToken',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        final List<dynamic> list = data['alerts'] ?? [];
        return list.map((item) => RegionalAlert.fromJson(item)).toList();
      }
    } catch (_) {}

    // Demonstration fallback regional alerts
    return [
      RegionalAlert(
        id: '1',
        alertId: 'anom_01',
        severity: 'critical',
        title: 'Critical Fee Realization Drop',
        body: 'Northern campus network fee collection dropped 22% below baseline.',
        sentAt: DateTime.now().subtract(const Duration(minutes: 15)).toIso8601String(),
      ),
      RegionalAlert(
        id: '2',
        alertId: 'anom_02',
        severity: 'high',
        title: 'Unexcused Absenteeism Spike',
        body: 'Grade 10 absenteeism increased by 15% across 4 campuses.',
        sentAt: DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
      ),
    ];
  }
}

final regionalAlertServiceProvider = Provider<RegionalAlertService>((ref) {
  return RegionalAlertService(baseUrl: 'http://localhost:3000');
});

final regionalAlertsProvider = FutureProvider<List<RegionalAlert>>((ref) async {
  final service = ref.watch(regionalAlertServiceProvider);
  return service.fetchRegionalAlerts();
});
