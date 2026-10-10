import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import '../models/hardware_models.dart';

final hardwareServiceProvider = Provider<HardwareService>((ref) {
  return HardwareService(ref.watch(dioProvider));
});

class HardwareService {
  final Dio _client;
  HardwareService(this._client);

  /// Fetch all campus zones
  Future<List<HardwareZoneModel>> getZones() async {
    try {
      final response = await _client.get('/hardware/zones');
      final data = response.data['zones'] as List<dynamic>? ?? [];
      return data
          .map((z) => HardwareZoneModel.fromJson(z as Map<String, dynamic>))
          .toList();
    } catch (_) {
      return [];
    }
  }

  /// Verify gate access / NFC badge scan
  Future<GateVerificationResult> verifyAccess({
    required String badgeId,
    required String deviceId,
    String? zoneId,
    String direction = 'in',
    String authenticationMethod = 'nfc',
    bool emergencyOverride = false,
  }) async {
    final response = await _client.post(
      '/hardware/access-control/verify',
      data: {
        'badgeId': badgeId,
        'deviceId': deviceId,
        if (zoneId != null) 'zoneId': zoneId,
        'direction': direction,
        'authenticationMethod': authenticationMethod,
        'emergencyOverride': emergencyOverride,
      },
    );

    return GateVerificationResult.fromJson(response.data as Map<String, dynamic>);
  }

  /// Fetch real-time muster evacuation summary
  Future<MusterSummaryModel?> getMusterSummary() async {
    try {
      final response = await _client.get('/hardware/radar/muster');
      if (response.data['report'] != null) {
        return MusterSummaryModel.fromJson(
            response.data['report'] as Map<String, dynamic>);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /// Post patrol checkpoint scan
  Future<bool> recordPatrolCheckpoint({
    required String checkpointId,
    required String zoneId,
    required String deviceId,
    String method = 'nfc',
  }) async {
    try {
      await _client.post('/hardware/access-control/verify', data: {
        'badgeId': checkpointId,
        'deviceId': deviceId,
        'zoneId': zoneId,
        'direction': 'in',
        'authenticationMethod': method,
      });
      return true;
    } catch (_) {
      return false;
    }
  }
}
