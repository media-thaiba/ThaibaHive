import 'dart:math';
import 'package:battery_plus/battery_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:thaibahive_mobile/models/presence_log.dart';
import 'package:thaibahive_mobile/core/services/mock_location_detector.dart';

/// Encapsulates GPS distance computations, hysteresis buffer thresholds,
/// battery checks, and local buffer writing logic
class PresenceVerificationService {
  final Battery _battery = Battery();

  // Hysteresis buffer: add extra margin to avoid flapping at boundary
  static const double hysteresisBufferMeters = 20.0;

  /// Calculate distance between two coordinates in meters using Haversine formula
  double calculateDistance(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const double earthRadius = 6371000; // Earth's radius in meters

    final double dLat = _toRadians(lat2 - lat1);
    final double dLon = _toRadians(lon2 - lon1);

    final double a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat1)) *
            cos(_toRadians(lat2)) *
            sin(dLon / 2) *
            sin(dLon / 2);

    final double c = 2 * atan2(sqrt(a), sqrt(1 - a));

    return earthRadius * c;
  }

  /// Check if position is within geofence with hysteresis buffer
  bool isWithinGeofence(
    Position position,
    double officeLatitude,
    double officeLongitude,
    double geofenceRadiusMeters, {
    bool wasWithinGeofence = true,
  }) {
    final double distance = calculateDistance(
      position.latitude,
      position.longitude,
      officeLatitude,
      officeLongitude,
    );

    // Apply hysteresis: if currently inside, use larger radius to exit
    // If currently outside, use smaller radius to enter
    double effectiveRadius = geofenceRadiusMeters;
    if (wasWithinGeofence) {
      effectiveRadius += hysteresisBufferMeters;
    } else {
      effectiveRadius -= hysteresisBufferMeters;
      effectiveRadius = effectiveRadius.clamp(0, geofenceRadiusMeters);
    }

    return distance <= effectiveRadius;
  }

  /// Get battery level
  Future<int> getBatteryLevel() async {
    try {
      return await _battery.batteryLevel;
    } catch (e) {
      return -1;
    }
  }

  /// Check if battery is critically low
  Future<bool> isCriticalBattery({int threshold = 15}) async {
    final level = await getBatteryLevel();
    return level >= 0 && level <= threshold;
  }

  /// Determine verification method based on available data
  String determineVerificationMethod({
    required bool hasGps,
    required bool hasWifi,
    required bool hasGeofence,
    required bool isMockLocation,
  }) {
    if (isMockLocation) return 'failed';
    if (hasGeofence && hasGps) return 'hybrid';
    if (hasGeofence) return 'geofence';
    if (hasGps) return 'gps';
    if (hasWifi) return 'wifi';
    return 'failed';
  }

  /// Create a presence log entry from position data
  PresenceLog createPresenceLog({
    required String attendanceId,
    required String staffId,
    required Position position,
    required bool isWithinGeofence,
    required bool isMockLocation,
    String? wifiSsid,
    required String verificationMethod,
    double? distanceFromOffice,
    String networkState = 'online',
    int? batteryLevel,
  }) {
    return PresenceLog(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      attendanceId: attendanceId,
      staffId: staffId,
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy,
      isWithinGeofence: isWithinGeofence,
      isMockLocation: isMockLocation,
      wifiSsid: wifiSsid,
      verificationMethod: verificationMethod,
      distanceFromOffice: distanceFromOffice,
      networkState: networkState,
      batteryLevel: batteryLevel,
      createdAt: DateTime.now().toIso8601String(),
    );
  }

  double _toRadians(double degrees) {
    return degrees * (pi / 180);
  }
}
