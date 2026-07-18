import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/models/presence_verification_settings.dart';
import 'package:thaibahive_mobile/models/presence_log.dart';
import 'package:thaibahive_mobile/core/services/mock_location_detector.dart';
import 'presence_verification_service.dart';

/// Background service runner managing geofence boundaries, 1-minute ticker,
/// grace warnings, offline buffers, token refresh handshake, and
/// automatic background checkouts
class BackgroundPresenceService {
  static BackgroundPresenceService? _instance;
  static BackgroundPresenceService get instance => _instance ??= BackgroundPresenceService._();
  BackgroundPresenceService._();

  final FlutterBackgroundService _service = FlutterBackgroundService();
  final PresenceVerificationService _presenceService = PresenceVerificationService();
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();

  Dio _getDio() {
    final dio = Dio(BaseOptions(
      baseUrl: AppConstants.apiBaseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
    ));
    if (kDebugMode) {
      dio.httpClientAdapter = IOHttpClientAdapter(
        createHttpClient: () {
          final client = HttpClient();
          client.badCertificateCallback =
              (X509Certificate cert, String host, int port) => true;
          return client;
        },
      );
    }
    return dio;
  }

  // State
  bool _isTracking = false;
  String? _currentAttendanceId;
  double? _officeLatitude;
  double? _officeLongitude;
  double? _geofenceRadius;
  bool _lastWithinGeofence = true;
  int _graceCount = 0;
  List<Map<String, dynamic>> _offlineBuffer = [];

  /// Initialize the background service
  Future<void> init() async {
    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: _onStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'presence_tracking',
        initialNotificationTitle: 'ThaibaHive',
        initialNotificationContent: 'Presence tracking active',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: _onStart,
        onBackground: _onIosBackground,
      ),
    );
  }

  /// Start tracking presence
  Future<void> startTracking({
    required String attendanceId,
    required double officeLatitude,
    required double officeLongitude,
    required double geofenceRadius,
  }) async {
    _currentAttendanceId = attendanceId;
    _officeLatitude = officeLatitude;
    _officeLongitude = officeLongitude;
    _geofenceRadius = geofenceRadius;
    _isTracking = true;
    _lastWithinGeofence = true;
    _graceCount = 0;

    // Store tracking state for resume on restart
    await _secureStorage.write(key: 'tracking_attendance_id', value: attendanceId);
    await _secureStorage.write(key: 'tracking_office_lat', value: officeLatitude.toString());
    await _secureStorage.write(key: 'tracking_office_lon', value: officeLongitude.toString());
    await _secureStorage.write(key: 'tracking_radius', value: geofenceRadius.toString());

    // Update service notification
    _service.invoke('updateNotification', {
      'content': 'Tracking presence for attendance',
    });

    // Start the background service
    await _service.startService();
  }

  /// Stop tracking presence
  Future<void> stopTracking() async {
    _isTracking = false;
    _currentAttendanceId = null;

    // Clear stored state
    await _secureStorage.delete(key: 'tracking_attendance_id');
    await _secureStorage.delete(key: 'tracking_office_lat');
    await _secureStorage.delete(key: 'tracking_office_lon');
    await _secureStorage.delete(key: 'tracking_radius');

    // Stop the service
    final service = FlutterBackgroundService();
    service.invoke('stopService');
  }

  /// Resume tracking if a check-in was active (call on app start)
  Future<void> resumeTrackingIfNeeded() async {
    final attendanceId = await _secureStorage.read(key: 'tracking_attendance_id');
    final officeLat = await _secureStorage.read(key: 'tracking_office_lat');
    final officeLon = await _secureStorage.read(key: 'tracking_office_lon');
    final radius = await _secureStorage.read(key: 'tracking_radius');

    if (attendanceId != null && officeLat != null && officeLon != null && radius != null) {
      await startTracking(
        attendanceId: attendanceId,
        officeLatitude: double.parse(officeLat),
        officeLongitude: double.parse(officeLon),
        geofenceRadius: double.parse(radius),
      );
    }
  }

  static void _onStart(ServiceInstance service) async {
    DartPluginRegistrant.ensureInitialized();

    // Register token refresh handshake listener
    service.on('requestRefresh').listen((event) {
      // Token refresh handshake - will be handled by main isolate
    });

    service.on('stopService').listen((event) {
      service.stopSelf();
    });

    service.on('updateNotification').listen((event) {
      if (event != null && event['content'] != null) {
        service.invoke('setAsForeground');
      }
    });

    // Start 1-minute ticker for presence checks
    Timer.periodic(const Duration(minutes: 1), (timer) async {
      if (service is AndroidServiceInstance) {
        if (await service.isForegroundService()) {
          // Perform presence check
          await _performPresenceCheck(service);
        }
      }
    });
  }

  static Future<bool> _onIosBackground(ServiceInstance service) async {
    return true;
  }

  static Future<void> _performPresenceCheck(ServiceInstance service) async {
    // This runs in background isolate - minimal work here
    // Actual presence verification happens via API calls
    service.invoke('performCheck', {
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Perform presence verification (called from main isolate)
  Future<PresenceLog?> verifyPresence({
    required String staffId,
    required String attendanceId,
    required double officeLatitude,
    required double officeLongitude,
    required double geofenceRadius,
    PresenceVerificationSettings? settings,
  }) async {
    try {
      // Check if mock location is enabled on device
      final hasPermission = await MockLocationDetector.checkPermission();
      if (!hasPermission) {
        return null;
      }

      // Get current position
      final position = await MockLocationDetector.getCurrentLocation(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 30),
      );

      // Check for mock location
      final isMock = MockLocationDetector.isMockLocation(position);

      // Calculate distance and check geofence
      final distance = _presenceService.calculateDistance(
        position.latitude,
        position.longitude,
        officeLatitude,
        officeLongitude,
      );

      final withinGeofence = _presenceService.isWithinGeofence(
        position,
        officeLatitude,
        officeLongitude,
        geofenceRadius,
        wasWithinGeofence: _lastWithinGeofence,
      );

      // Update hysteresis state
      _lastWithinGeofence = withinGeofence;

      // Handle grace period
      if (!withinGeofence) {
        _graceCount++;
        final graceMinutes = settings?.gracePeriodMinutes ?? 5;

        if (_graceCount >= graceMinutes) {
          // Grace period exceeded - handle violation
          await _handleGeofenceViolation(
            staffId: staffId,
            attendanceId: attendanceId,
            distance: distance,
            settings: settings,
          );
        }
      } else {
        _graceCount = 0;
      }

      // Get battery level
      final batteryLevel = await _presenceService.getBatteryLevel();

      // Determine verification method
      final verificationMethod = _presenceService.determineVerificationMethod(
        hasGps: true,
        hasWifi: false,
        hasGeofence: true,
        isMockLocation: isMock,
      );

      // Create presence log
      final presenceLog = _presenceService.createPresenceLog(
        attendanceId: attendanceId,
        staffId: staffId,
        position: position,
        isWithinGeofence: withinGeofence,
        isMockLocation: isMock,
        verificationMethod: verificationMethod,
        distanceFromOffice: distance,
        batteryLevel: batteryLevel,
      );

      // Send to API (or buffer for offline)
      await _sendPresenceLog(presenceLog);

      return presenceLog;
    } catch (e) {
      debugPrint('[BackgroundPresence] Error verifying presence: $e');
      return null;
    }
  }

  /// Handle geofence violation
  Future<void> _handleGeofenceViolation({
    required String staffId,
    required String attendanceId,
    required double distance,
    PresenceVerificationSettings? settings,
  }) async {
    if (settings?.autoCheckoutOnViolation == true) {
      // Auto checkout on violation
      await _performAutoCheckout(attendanceId);
    }
  }

  /// Perform automatic checkout
  Future<void> _performAutoCheckout(String attendanceId) async {
    try {
      final token = await _secureStorage.read(key: 'auth_token');
      if (token == null) return;

      final dio = _getDio();
      dio.options.headers['Authorization'] = 'Bearer $token';

      await dio.post('/api/attendance/check-out');
      await stopTracking();
    } catch (e) {
      debugPrint('[BackgroundPresence] Auto checkout failed: $e');
    }
  }

  /// Send presence log to API (or buffer for offline)
  Future<void> _sendPresenceLog(PresenceLog log) async {
    try {
      final token = await _secureStorage.read(key: 'auth_token');
      if (token == null) {
        _addToOfflineBuffer(log);
        return;
      }

      final dio = _getDio();
      dio.options.headers['Authorization'] = 'Bearer $token';
      dio.options.headers['Content-Type'] = 'application/json';

      await dio.post(
        '/api/attendance/presence-log',
        data: log.toJson(),
      );
    } on DioException {
      // Network error - buffer for later
      _addToOfflineBuffer(log);
    } catch (e) {
      debugPrint('[BackgroundPresence] Failed to send log: $e');
      _addToOfflineBuffer(log);
    }
  }

  /// Add log to offline buffer
  void _addToOfflineBuffer(PresenceLog log) {
    _offlineBuffer.add(log.toJson());
  }

  /// Flush offline buffer when network is available
  Future<void> flushOfflineBuffer() async {
    if (_offlineBuffer.isEmpty) return;

    final token = await _secureStorage.read(key: 'auth_token');
    if (token == null) return;

    try {
      final dio = _getDio();
      dio.options.headers['Authorization'] = 'Bearer $token';
      dio.options.headers['Content-Type'] = 'application/json';

      await dio.post(
        '/api/attendance/presence-log',
        data: {'logs': _offlineBuffer},
      );

      _offlineBuffer.clear();
    } catch (e) {
      debugPrint('[BackgroundPresence] Failed to flush buffer: $e');
    }
  }
}
