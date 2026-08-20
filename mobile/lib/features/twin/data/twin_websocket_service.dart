// WebSocket client service for Mobile Spatial Digital Twin (TWIN-022)

import 'dart:async';

class TwinWebSocketService {
  final String serverUrl;
  final _streamController = StreamController<Map<String, dynamic>>.broadcast();

  TwinWebSocketService({required this.serverUrl});

  Stream<Map<String, dynamic>> get stream => _streamController.stream;

  void connect(String facilityId) {
    _streamController.add({
      'type': 'connected',
      'facilityId': facilityId,
      'status': 'online',
    });
  }

  void simulateLiveTelemetry(String spaceId, double tempC, int co2Ppm) {
    _streamController.add({
      'type': 'telemetry_update',
      'spaceId': spaceId,
      'tempC': tempC,
      'co2Ppm': co2Ppm,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  void simulateEmergencyHazard(String hazardType, String exitRoute) {
    _streamController.add({
      'type': 'emergency_hazard_declared',
      'hazardType': hazardType,
      'recommendedExit': exitRoute,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  void dispose() {
    _streamController.close();
  }
}
