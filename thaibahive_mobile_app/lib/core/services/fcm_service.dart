import 'dart:convert';
import 'dart:io';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_core/firebase_core.dart';

import '../../core/constants.dart';
import '../../core/network/api_client.dart';

// Top-level background message handler (must be static/top-level)
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  if (kDebugMode) {
    print('[FCM Background] Handling background message: ${message.data}');
  }
}

class FCMService {
  static final FCMService _instance = FCMService._internal();
  factory FCMService() => _instance;
  FCMService._internal();

  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final ApiClient _apiClient = ApiClient();

  static const String _storageFcmTokenKey = 'fcm_device_token';
  static const String _storageTokenRegisteredKey = 'fcm_token_registered';

  bool _initialized = false;
  bool _tokenRegistered = false;

  /// Initialize FCM, local notifications, and token registration
  Future<void> initialize({GoRouter? router}) async {
    if (_initialized) return;

    // Initialize local notifications
    await _initLocalNotifications();

    // Initialize Firebase Messaging
    await _initFirebaseMessaging(router);

    // Register token with backend if user is authenticated
    await _registerTokenIfAuthenticated();

    _initialized = true;
  }

  Future<void> _initLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings();
    const initSettings = InitializationSettings(android: androidSettings, iOS: iosSettings);

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: (NotificationResponse response) {
        if (response.payload != null) {
          try {
            final data = jsonDecode(response.payload!);
            _handleNotificationTap(data);
          } catch (e) {
            if (kDebugMode) print('[FCMService] Error parsing payload: $e');
          }
        }
      },
    );

    const androidChannel = AndroidNotificationChannel(
      'thaibahive_high_importance_channel',
      'High Importance Notifications',
      description: 'Used for important ThaibaHive alerts.',
      importance: Importance.high,
    );

    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(androidChannel);
  }

  Future<void> _initFirebaseMessaging(GoRouter? router) async {
    // Request permissions (iOS)
    final settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );
    if (kDebugMode) {
      print('[FCMService] Permission status: ${settings.authorizationStatus}');
    }

    // Get initial token
    final token = await _messaging.getToken();
    if (token != null) {
      if (kDebugMode) print('[FCMService] Initial FCM token: $token');
      await saveDeviceToken(token);
    }

    // Listen for token refresh
    _messaging.onTokenRefresh.listen((newToken) async {
      if (kDebugMode) print('[FCMService] Token refreshed: $newToken');
      await saveDeviceToken(newToken);
      await _registerTokenWithBackend(newToken);
    });

    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      if (kDebugMode) print('[FCMService] Foreground message: ${message.data}');
      _showForegroundNotification(message);
    });

    // Handle notification taps when app is in background but not terminated
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (kDebugMode) print('[FCMService] Message opened app: ${message.data}');
      _handleNotificationTap(message.data);
    });

    // Handle notification tap when app is terminated (cold start)
    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      if (kDebugMode) print('[FCMService] Initial message (cold start): ${initialMessage.data}');
      // Delay to allow router to be ready
      Future.delayed(const Duration(milliseconds: 500), () => _handleNotificationTap(initialMessage.data));
    }
  }

  Future<void> _registerTokenIfAuthenticated() async {
    final fcmToken = await getDeviceToken();
    if (fcmToken != null && !_tokenRegistered) {
      // Gate on JWT validity — avoids a pointless 401 at cold start when the
      // stored token has already expired (gap 2: no auth check before registering)
      final jwt = await _storage.read(key: AppConstants.storageTokenKey);
      if (jwt != null && _isJwtValid(jwt)) {
        await _registerTokenWithBackend(fcmToken);
      }
    }
  }

  /// Lightweight JWT expiry check — decodes exp claim without signature verification.
  /// Only used to skip backend calls when the token is already expired.
  bool _isJwtValid(String jwt) {
    try {
      final parts = jwt.split('.');
      if (parts.length != 3) return false;
      // Dart's base64Url.decode handles unnormalized padding automatically
      final payload = utf8.decode(base64Url.decode(parts[1]));
      final claims = jsonDecode(payload) as Map<String, dynamic>;
      final exp = claims['exp'];
      if (exp == null) return true; // no expiry claim — allow
      final expiry = DateTime.fromMillisecondsSinceEpoch((exp as int) * 1000);
      return DateTime.now().isBefore(expiry);
    } catch (_) {
      return false; // malformed token — skip registration
    }
  }

  Future<void> _registerTokenWithBackend(String token) async {
    // Resolve human-readable device name for the backend staff_device_tokens record
    // (gap 3: device_name was never sent; backend column always null)
    String? deviceName;
    try {
      if (!kIsWeb && Platform.isAndroid) {
        final info = await DeviceInfoPlugin().androidInfo;
        deviceName = '${info.manufacturer} ${info.model}'.trim();
      } else if (!kIsWeb && Platform.isIOS) {
        final info = await DeviceInfoPlugin().iosInfo;
        // On iOS 16+, info.name returns a generic model string (e.g. "iPhone", "iPad")
        // unless the app has the com.apple.developer.device-information.user-assigned-device-name entitlement.
        // This is still useful as it distinguishes platform/model even without the user-assigned name.
        deviceName = info.name;
      }
    } catch (_) {}

    try {
      await _apiClient.dio.post('/auth/fcm-token', data: {
        'fcm_token': token,
        'platform': _getPlatform(),
        if (deviceName != null) 'device_name': deviceName,
      });
      _tokenRegistered = true;
      await _storage.write(key: _storageTokenRegisteredKey, value: 'true');
      if (kDebugMode) print('[FCMService] Token registered with backend');
    } catch (e) {
      if (kDebugMode) print('[FCMService] Failed to register token: $e');
      // Don't throw - token will be retried on next auth/login
    }
  }

  String _getPlatform() {
    if (kIsWeb) return 'web';
    try {
      // ignore: avoid_dynamic_calls
      final os = Platform.operatingSystem;
      if (os == 'android') return 'android';
      if (os == 'ios') return 'ios';
      // Default to android for other mobile platforms (fuchsia, linux, windows, macos)
      return 'android';
    } catch (_) {
      return 'android';
    }
  }

  void _showForegroundNotification(RemoteMessage message) {
    final notification = message.notification;
    final data = message.data;

    if (notification != null) {
      showForegroundBanner(
        title: notification.title ?? 'ThaibaHive',
        body: notification.body ?? '',
        data: data,
      );
    }
  }

  void _handleNotificationTap(Map<String, dynamic> data) {
    // Will be called with router from outside or via static method
    FCMService.handleDeepLink(data);
  }

  /// Store FCM device token locally
  Future<void> saveDeviceToken(String token) async {
    await _storage.write(key: _storageFcmTokenKey, value: token);
  }

  /// Get stored FCM device token
  Future<String?> getDeviceToken() async {
    return await _storage.read(key: _storageFcmTokenKey);
  }

  /// Check if token has been registered with backend
  Future<bool> isTokenRegistered() async {
    final registered = await _storage.read(key: _storageTokenRegisteredKey);
    return registered == 'true';
  }

  /// Clear token registration status (call on logout)
  Future<void> clearTokenRegistration() async {
    await _storage.delete(key: _storageTokenRegisteredKey);
    _tokenRegistered = false;
  }

  /// Show foreground notification banner using flutter_local_notifications
  Future<void> showForegroundBanner({
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'thaibahive_high_importance_channel',
      'High Importance Notifications',
      importance: Importance.high,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();
    const details = NotificationDetails(android: androidDetails, iOS: iosDetails);

    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      details,
      payload: data != null ? jsonEncode(data) : null,
    );
  }

  /// Allowed route prefixes for deep links (used by validateAndWhitelistRoute for both FCM notification payloads and custom-scheme / universal link URLs).
  static const List<String> _allowedRoutePrefixes = [
    '/leaves',
    '/tasks',
    '/announcements',
    '/approvals',
    '/events',
    '/reports',
    '/assets',
    '/dashboard',
    '/bookings',
    '/notifications',
    '/recognition',
    '/expenses',
    '/purchases',
    '/visitors',
    '/grievances',
    '/polls',
    '/canteen',
    '/vehicles',
  ];

  /// Validate incoming route path against strict allowlist to prevent open redirects
  static String validateAndWhitelistRoute(String path) {
    final cleanPath = path.trim();
    for (final prefix in _allowedRoutePrefixes) {
      if (cleanPath == prefix || cleanPath.startsWith('$prefix/')) {
        return cleanPath;
      }
    }
    return '/';
  }

  /// Handle notification tap navigation using GoRouter deep linking mapping
  static Future<void> handleDeepLink(Map<String, dynamic> data, {GoRouter? router}) async {
    final type = data['type']?.toString();
    final id = data['id']?.toString();

    String rawRoute = '/';
    switch (type) {
      case 'leave':
        rawRoute = id != null ? '/leaves/$id' : '/leaves';
        break;
      case 'task':
        rawRoute = id != null ? '/tasks/$id' : '/tasks';
        break;
      case 'announcement':
        rawRoute = id != null ? '/announcements/$id' : '/announcements';
        break;
      case 'approval':
        // GoRouter has /approvals list only — no /approvals/:id detail route
        rawRoute = '/approvals';
        break;
      case 'event':
        rawRoute = id != null ? '/events/$id' : '/events';
        break;
      case 'report':
        // GoRouter has /reports list only — no /reports/:id detail route
        rawRoute = '/reports';
        break;
      case 'asset':
        rawRoute = id != null ? '/assets/$id' : '/assets';
        break;
      case 'expense':
        rawRoute = '/expenses';
        break;
      case 'booking':
        rawRoute = id != null ? '/bookings/$id' : '/bookings';
        break;
      case 'poll':
        rawRoute = id != null ? '/polls/$id' : '/polls';
        break;
      case 'grievance':
        rawRoute = '/grievances';
        break;
      case 'recognition':
        rawRoute = '/recognition';
        break;
      case 'purchase':
        rawRoute = '/purchases';
        break;
      default:
        rawRoute = '/';
        break;
    }

    final targetRoute = validateAndWhitelistRoute(rawRoute);

    if (router != null) {
      router.go(targetRoute);
    } else {
      // Buffer in memory & persist to storage (survives background process kills)
      _bufferedRoute = targetRoute;
      const storage = FlutterSecureStorage();
      await storage.write(key: 'pending_deeplink_route', value: targetRoute);
      if (kDebugMode) print('[FCMService] Persisted pending route: $targetRoute');
    }
  }

  static String? _bufferedRoute;

  /// Flush buffered deep-link route and immediately clear from storage
  static Future<void> flushBufferedRoute(GoRouter router) async {
    const storage = FlutterSecureStorage();
    final persistedRoute = await storage.read(key: 'pending_deeplink_route');
    final target = validateAndWhitelistRoute(persistedRoute ?? _bufferedRoute ?? '/');

    if (target != '/') {
      router.go(target);
      _bufferedRoute = null;
      await storage.delete(key: 'pending_deeplink_route');
      if (kDebugMode) print('[FCMService] Flushed pending route & cleared storage key: $target');
    }
  }

  /// Call this on successful login to register FCM token
  Future<void> onUserLogin() async {
    final token = await getDeviceToken();
    if (token != null) {
      await _registerTokenWithBackend(token);
    }
  }

  /// Call this on logout
  Future<void> onUserLogout() async {
    await clearTokenRegistration();
    // Optionally: delete token from backend
    try {
      final token = await getDeviceToken();
      if (token != null) {
        await _apiClient.dio.delete('/auth/fcm-token');
      }
    } catch (_) {}
  }
}