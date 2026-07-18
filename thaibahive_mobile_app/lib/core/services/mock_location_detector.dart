import 'package:geolocator/geolocator.dart';

/// Detects if the device is using mock/fake GPS locations
/// This helps identify GPS spoofing attempts
class MockLocationDetector {
  /// Check if a position is from a mock location
  /// Returns true if mock location is detected
  static bool isMockLocation(Position position) {
    return position.isMocked;
  }

  /// Get location with mock detection
  /// Throws MockLocationException if mock location is detected
  static Future<Position> getCurrentLocation({
    LocationAccuracy desiredAccuracy = LocationAccuracy.high,
    Duration? timeLimit,
  }) async {
    final position = await Geolocator.getCurrentPosition(
      desiredAccuracy: desiredAccuracy,
      timeLimit: timeLimit,
    );

    if (position.isMocked) {
      throw MockLocationException('Mock location detected');
    }

    return position;
  }

  /// Check location permission status
  static Future<bool> checkPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  /// Check if location services are enabled
  static Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }
}

class MockLocationException implements Exception {
  final String message;
  MockLocationException(this.message);

  @override
  String toString() => 'MockLocationException: $message';
}
