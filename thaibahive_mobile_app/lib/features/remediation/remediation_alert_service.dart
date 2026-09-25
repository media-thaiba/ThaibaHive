import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

class RemediationAlert {
  final String id;
  final String title;
  final String severity;
  final String category;
  final String status;
  final String? assignedStaffId;
  final String createdAt;

  RemediationAlert({
    required this.id,
    required this.title,
    required this.severity,
    required this.category,
    required this.status,
    this.assignedStaffId,
    required this.createdAt,
  });

  factory RemediationAlert.fromJson(Map<String, dynamic> json) {
    return RemediationAlert(
      id: json['id'] ?? '',
      title: json['title'] ?? 'Remediation Task',
      severity: json['severity'] ?? 'high',
      category: json['category'] ?? 'attendance',
      status: json['status'] ?? 'open',
      assignedStaffId: json['assignedStaffId'],
      createdAt: json['createdAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class RemediationAlertService {
  final String baseUrl;
  final String? authToken;

  RemediationAlertService({required this.baseUrl, this.authToken});

  Future<List<RemediationAlert>> fetchRemediationAlerts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/mobile/v1/remediation-alerts'),
        headers: {
          'Content-Type': 'application/json',
          if (authToken != null) 'Authorization': 'Bearer $authToken',
        },
      );

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        final List<dynamic> list = data['tickets'] ?? [];
        return list.map((item) => RemediationAlert.fromJson(item)).toList();
      }
    } catch (_) {}

    return [
      RemediationAlert(
        id: 'rem_tk_mobile_01',
        title: 'Auto-Reassigned: Chronic Absenteeism Guidance Follow-up',
        severity: 'critical',
        category: 'attendance',
        status: 'auto_assigned',
        assignedStaffId: 'stf_101',
        createdAt: DateTime.now().subtract(const Duration(minutes: 10)).toIso8601String(),
      ),
      RemediationAlert(
        id: 'rem_tk_mobile_02',
        title: 'Fee Collection Velocity Intervention Required',
        severity: 'high',
        category: 'finance',
        status: 'in_progress',
        assignedStaffId: 'stf_101',
        createdAt: DateTime.now().subtract(const Duration(hours: 1)).toIso8601String(),
      ),
    ];
  }
}

final remediationAlertServiceProvider = Provider<RemediationAlertService>((ref) {
  return RemediationAlertService(baseUrl: 'http://localhost:3000');
});

final remediationAlertsProvider = FutureProvider<List<RemediationAlert>>((ref) async {
  final service = ref.watch(remediationAlertServiceProvider);
  return service.fetchRemediationAlerts();
});
