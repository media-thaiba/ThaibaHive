import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../../core/config/app_config.dart';
import '../../auth/services/token_storage_service.dart';

class AttendanceStatus {
  final bool isCheckedIn;
  final String? checkInTime;
  final String? checkOutTime;
  final double workingHours;

  AttendanceStatus({
    required this.isCheckedIn,
    this.checkInTime,
    this.checkOutTime,
    this.workingHours = 0.0,
  });
}

class StudentRosterItem {
  final String id;
  final String name;
  final String rollNo;
  String status; // 'present', 'absent', 'late'

  StudentRosterItem({
    required this.id,
    required this.name,
    required this.rollNo,
    this.status = 'present',
  });
}

class AttendanceNotifier extends StateNotifier<AttendanceStatus> {
  final TokenStorageService _tokenStorage;

  AttendanceNotifier({TokenStorageService? tokenStorage})
      : _tokenStorage = tokenStorage ?? TokenStorageService(),
        super(AttendanceStatus(isCheckedIn: false));

  Future<bool> checkIn({double? latitude, double? longitude}) async {
    try {
      final token = await _tokenStorage.getToken();
      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/attendance/check-in'),
        headers: {
          'Authorization': 'Bearer ${token ?? ''}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'timestamp': DateTime.now().toIso8601String(),
          'latitude': latitude,
          'longitude': longitude,
        }),
      );

      state = AttendanceStatus(
        isCheckedIn: true,
        checkInTime: DateTime.now().toIso8601String(),
      );
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      state = AttendanceStatus(
        isCheckedIn: true,
        checkInTime: DateTime.now().toIso8601String(),
      );
      return true;
    }
  }

  Future<bool> checkOut() async {
    try {
      final token = await _tokenStorage.getToken();
      await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/attendance/check-out'),
        headers: {
          'Authorization': 'Bearer ${token ?? ''}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'timestamp': DateTime.now().toIso8601String()}),
      );

      state = AttendanceStatus(
        isCheckedIn: false,
        checkOutTime: DateTime.now().toIso8601String(),
        workingHours: 8.0,
      );
      return true;
    } catch (e) {
      state = AttendanceStatus(
        isCheckedIn: false,
        checkOutTime: DateTime.now().toIso8601String(),
        workingHours: 8.0,
      );
      return true;
    }
  }
}

final attendanceProvider =
    StateNotifierProvider<AttendanceNotifier, AttendanceStatus>((ref) {
  return AttendanceNotifier();
});
