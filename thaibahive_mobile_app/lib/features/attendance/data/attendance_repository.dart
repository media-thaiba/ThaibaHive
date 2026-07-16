import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';

final attendanceRepositoryProvider = Provider<AttendanceRepository>((ref) {
  return AttendanceRepository(ref.watch(dioProvider));
});

class AttendanceRepository {
  final Dio _client;
  AttendanceRepository(this._client);

  Future<List<AttendanceLogModel>> getMyAttendance({
    int page = 1,
    int limit = 20,
  }) async {
    final response = await _client.get('/attendance/my', queryParameters: {
      'page': page,
      'limit': limit,
    });
    final List<dynamic> data = response.data is List
        ? response.data
        : (response.data['data'] as List<dynamic>? ??
            response.data['logs'] as List<dynamic>? ??
            []);
    return data
        .map((e) => AttendanceLogModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<AttendanceLogModel> checkIn({
    String method = 'manual',
    String? nfcTagId,
    String? qrCode,
    double? latitude,
    double? longitude,
  }) async {
    final response = await _client.post('/attendance/check-in', data: {
      'method': method,
      if (nfcTagId != null) 'nfcTagId': nfcTagId,
      if (qrCode != null) 'qrCode': qrCode,
      if (latitude != null) 'latitude': latitude,
      if (longitude != null) 'longitude': longitude,
    });
    return AttendanceLogModel.fromJson(response.data);
  }

  Future<AttendanceLogModel> checkOut() async {
    final response = await _client.post('/attendance/check-out');
    return AttendanceLogModel.fromJson(response.data);
  }

  Future<AttendanceStatsModel> getStats() async {
    final response = await _client.get('/attendance/stats');
    return AttendanceStatsModel.fromJson(response.data);
  }
}
