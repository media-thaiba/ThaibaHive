import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:dio/dio.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class PushNotificationService {
  final Dio _dio;
  final FirebaseMessaging _firebaseMessaging;
  final FlutterLocalNotificationsPlugin _localNotifications;

  PushNotificationService({
    Dio? dio,
    FirebaseMessaging? firebaseMessaging,
    FlutterLocalNotificationsPlugin? localNotifications,
  })  : _dio = dio ?? Dio(),
        _firebaseMessaging = firebaseMessaging ?? FirebaseMessaging.instance,
        _localNotifications = localNotifications ?? FlutterLocalNotificationsPlugin();

  /// Initialize Firebase Messaging and Local Notifications
  Future<void> initialize({
    required String baseUrl,
    required String authToken,
    required String platform,
  }) async {
    try {
      // 1. Request OS push notification permissions
      final settings = await _firebaseMessaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        // 2. Initialize local notifications
        const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
        const iosSettings = DarwinInitializationSettings();
        await _localNotifications.initialize(
          const InitializationSettings(android: androidSettings, iOS: iosSettings),
        );

        // 3. Get FCM device token and register with backend API
        final token = await _firebaseMessaging.getToken();
        if (token != null) {
          await registerDeviceToken(
            token: token,
            platform: platform,
            baseUrl: baseUrl,
            authToken: authToken,
          );
        }

        // 4. Listen to token refresh events
        _firebaseMessaging.onTokenRefresh.listen((newToken) async {
          await registerDeviceToken(
            token: newToken,
            platform: platform,
            baseUrl: baseUrl,
            authToken: authToken,
          );
        });

        // 5. Listen for incoming foreground push messages
        FirebaseMessaging.onMessage.listen((RemoteMessage message) {
          _showLocalNotification(message);
        });
      }
    } catch (e) {
      debugPrint('[PushNotificationService] Initialization warning: $e');
    }
  }

  void _showLocalNotification(RemoteMessage message) {
    final notification = message.notification;
    if (notification != null) {
      _localNotifications.show(
        notification.hashCode,
        notification.title,
        notification.body,
        const NotificationDetails(
          android: AndroidNotificationDetails(
            'governance_alerts_channel',
            'Governance & Critical Alerts',
            importance: Importance.max,
            priority: Priority.high,
          ),
          iOS: DarwinNotificationDetails(),
        ),
      );
    }
  }

  Future<bool> registerDeviceToken({
    required String token,
    required String platform,
    String? deviceModel,
    required String baseUrl,
    required String authToken,
  }) async {
    try {
      final response = await _dio.post(
        '$baseUrl/api/mobile/push/register',
        data: jsonEncode({
          'token': token,
          'platform': platform,
          'deviceModel': deviceModel ?? 'Mobile Companion',
        }),
        options: Options(
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $authToken',
          },
        ),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[PushNotificationService] Error registering token: $e');
      return false;
    }
  }

  Future<bool> deregisterDeviceToken({
    required String token,
    required String baseUrl,
    required String authToken,
  }) async {
    try {
      final response = await _dio.delete(
        '$baseUrl/api/mobile/push/register?token=$token',
        options: Options(
          headers: {
            'Authorization': 'Bearer $authToken',
          },
        ),
      );

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('[PushNotificationService] Error deregistering token: $e');
      return false;
    }
  }
}
