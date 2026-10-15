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

// ── Background isolate entry points ──────────────────────────────────────────
// These MUST be top-level functions (not static class methods).
// flutter_background_service spawns a new Dart isolate and resolves the entry
// point by symbol name. If the function is a static class method, the plugin
// tries to reference the enclosing class from within that isolate — which
// triggers FlutterBackgroundService() (an instance field on
// BackgroundPresenceService) to be constructed outside the main isolate,
// causing: "This class should only be used in the main isolate".

@pragma('vm:entry-point')
void backgroundServiceOnStart(ServiceInstance service) async {
  DartPluginRegistrant.ensureInitialized();

  service.on('stopService').listen((event) {
    service.stopSelf();
  });

  service.on('updateNotification').listen((event) {
    if (event != null && event['content'] != null) {
      service.invoke('setAsForeground');
    }
  });

  // 1-minute ticker for presence checks
  Timer.periodic(const Duration(minutes: 1), (timer) async {
    if (service is AndroidServiceInstance) {
      if (await service.isForegroundService()) {
        service.invoke('performCheck', {
          'timestamp': DateTime.now().toIso8601String(),
        });
      }
    }
  });
}

@pragma('vm:entry-point')
Future<bool> backgroundServiceOnIosBackground(ServiceInstance service) async {
  return true;
}

/// Background service runner managing geofence boundaries, 1-minute ticker,
/// grace warnings, offline buffers, token refresh handshake, and
/// automatic background checkouts
@pragma('vm:entry-point')
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
        return HttpClient();
      },
    );
  }
  return dio;
  }

  // State
  bool _isTracking = false;
  String? _currentAttendanceId;
  String? _currentStaffId;
  double? _officeLatitude;
  double? _officeLongitude;
  double? _geofenceRadius;
  bool _lastWithinGeofence = true;
  int _graceCount = 0;
  List<Map<String, dynamic>> _offlineBuffer = [];

  // performCheck wiring (v3.42.0)
  bool _checkInFlight = false;
  PresenceVerificationSettings? _settingsCache;
  DateTime? _settingsFetchedAt;

  /// Initialize the background service
  Future<void> init() async {
    await _service.configure(
      androidConfiguration: AndroidConfiguration(
        onStart: backgroundServiceOnStart,
        autoStart: false,
        isForegroundMode: true,
        notificationChannelId: 'presence_tracking',
        initialNotificationTitle: 'ThaibaHive',
        initialNotificationContent: 'Presence tracking active',
        foregroundServiceNotificationId: 888,
      ),
      iosConfiguration: IosConfiguration(
        autoStart: false,
        onForeground: backgroundServiceOnStart,
        onBackground: backgroundServiceOnIosBackground,
      ),
    );

    // The background isolate emits a 1-minute `performCheck` tick while the
    // foreground service runs — this listener runs in the MAIN isolate and
    // performs the actual presence verification + log upload.
    _service.on('performCheck').listen((event) {
      unawaited(_onPerformCheck());
    });
  }

  /// Settings are cached for 5 minutes so the per-minute tick does not
  /// hammer GET /attendance/settings. Falls back to the last known cache
  /// (or const defaults) when the network is unavailable.
  Future<PresenceVerificationSettings?> _fetchSettings({bool force = false}) async {
    if (!force &&
        _settingsCache != null &&
        _settingsFetchedAt != null &&
        DateTime.now().difference(_settingsFetchedAt!) < const Duration(minutes: 5)) {
      return _settingsCache;
    }

    try {
      final token = await _secureStorage.read(key: 'auth_token');
      if (token == null) return _settingsCache;

      final dio = _getDio();
      dio.options.headers['Authorization'] = 'Bearer $token';

      final res = await dio.get('/attendance/settings');
      final raw = res.data is Map<String, dynamic> ? (res.data as Map<String, dynamic>)['settings'] : null;
      if (raw is Map<String, dynamic>) {
        _settingsCache = PresenceVerificationSettings.fromJson(raw);
        _settingsFetchedAt = DateTime.now();
      }
    } catch (e) {
      debugPrint('[BackgroundPresence] Settings fetch failed, using cache: $e');
    }
    return _settingsCache;
  }

  /// Handle a `performCheck` tick from the background isolate.
  ///
  /// Resolves tracking state from memory (or secure storage after an app
  /// restart), fetches presence-verification settings (cached), skips ticks
  /// while verification is disabled server-side, then runs the full
  /// verify → upload pipeline and flushes any offline buffer.
  Future<void> _onPerformCheck() async {
    if (_checkInFlight) return;
    _checkInFlight = true;
    try {
      final attendanceId = _currentAttendanceId ??
          await _secureStorage.read(key: 'tracking_attendance_id');
      if (attendanceId == null) return;

      final officeLat = _officeLatitude ??
          double.tryParse(await _secureStorage.read(key: 'tracking_office_lat') ?? '');
      final officeLon = _officeLongitude ??
          double.tryParse(await _secureStorage.read(key: 'tracking_office_lon') ?? '');
      final radius = _geofenceRadius ??
          double.tryParse(await _secureStorage.read(key: 'tracking_radius') ?? '');
      if (officeLat == null || officeLon == null || radius == null) return;

      final staffId = _currentStaffId ??
          await _secureStorage.read(key: 'tracking_staff_id') ??
          'unknown';

      final settings = await _fetchSettings();
      // Server-side verification disabled → do not upload presence ticks.
      if (settings != null && !settings.isEnabled) return;

      await verifyPresence(
        staffId: staffId,
        attendanceId: attendanceId,
        officeLatitude: officeLat,
        officeLongitude: officeLon,
        geofenceRadius: radius,
        settings: settings,
      );

      await flushOfflineBuffer();
    } finally {
      _checkInFlight = false;
    }
  }

  /// Start tracking presence
  Future<void> startTracking({
    required String attendanceId,
    required double officeLatitude,
    required double officeLongitude,
    required double geofenceRadius,
    String? staffId,
  }) async {
    _currentAttendanceId = attendanceId;
    _currentStaffId = staffId ?? _currentStaffId;
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
    if (staffId != null) {
      await _secureStorage.write(key: 'tracking_staff_id', value: staffId);
    }

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
    await _secureStorage.delete(key: 'tracking_staff_id');

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
    final staffId = await _secureStorage.read(key: 'tracking_staff_id');

    if (attendanceId != null && officeLat != null && officeLon != null && radius != null) {
      await startTracking(
        attendanceId: attendanceId,
        officeLatitude: double.parse(officeLat),
        officeLongitude: double.parse(officeLon),
        geofenceRadius: double.parse(radius),
        staffId: staffId,
      );
    }
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

      // AppConstants.apiBaseUrl already ends in /api — no second prefix (D8*).
      await dio.post('/attendance/check-out');
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

      // AppConstants.apiBaseUrl already ends in /api — no second prefix (D8*).
      await dio.post(
        '/attendance/presence-log',
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

      // AppConstants.apiBaseUrl already ends in /api — no second prefix (D8*).
      await dio.post(
        '/attendance/presence-log',
        data: {'logs': _offlineBuffer},
      );

      _offlineBuffer.clear();
    } catch (e) {
      debugPrint('[BackgroundPresence] Failed to flush buffer: $e');
    }
  }
}
