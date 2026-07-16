import 'package:geolocator/geolocator.dart';
import 'package:flutter/foundation.dart';

class LocationService {
  Future<Position?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('[Location] Location services are disabled.');
        return null;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          debugPrint('[Location] Location permissions are denied.');
          return null;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        debugPrint('[Location] Location permissions are permanently denied.');
        return null;
      }

      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 10),
      );
    } catch (e) {
      debugPrint('[Location] Failed to get location: $e');
      return null;
    }
  }
}

final locationService = LocationService();
