import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConstants {
  AppConstants._();

  static const String appName = 'ThaibaHive';
  static const String appVersion = '1.0.0';

  /// Base URL — use --dart-define=API_BASE_URL=... at build time,
  /// or falls back to localhost/10.0.2.2 for development.
  static String get apiBaseUrl {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) return override;

    if (kDebugMode) {
      if (!kIsWeb && Platform.isAndroid) {
        return 'http://10.0.2.2:3000/api';
      }
      return 'http://localhost:3000/api';
    }

    return 'https://thaiba-hive.vercel.app/api';
  }

  /// Web app base URL for WebView handoff.
  static String get webBaseUrl {
    const override = String.fromEnvironment('WEB_BASE_URL');
    if (override.isNotEmpty) return override;

    if (kDebugMode) {
      if (!kIsWeb && Platform.isAndroid) {
        return 'http://10.0.2.2:3000';
      }
      return 'http://localhost:3000';
    }

    return 'https://thaiba-hive.vercel.app';
  }

  static const String storageTokenKey = 'auth_token';
  static const String storageRefreshTokenKey = 'refresh_token';
  static const String storageUserProfileKey = 'user_profile';

  static const String dateFormatDisplay = 'dd MMM yyyy';
  static const String dateFormatApi = 'yyyy-MM-dd';
  static const String dateTimeFormatDisplay = 'dd MMM yyyy, hh:mm a';
  static const String timeFormatDisplay = 'hh:mm a';
}
