import 'dart:io';
import 'package:flutter/foundation.dart';

class AppConstants {
  AppConstants._();

  static const String appName = 'ThaibaHive';
  static const String appVersion = '3.42.8';
  static const String appBuildNumber = '23';

  /// Base URL — defaults to the production cloud backend: https://thaiba-hive.vercel.app/api
  /// Use --dart-define=API_BASE_URL=... to override explicitly,
  /// or --dart-define=USE_LOCAL_BACKEND=true for local PC development.
  static String get apiBaseUrl {
    const override = String.fromEnvironment('API_BASE_URL');
    if (override.isNotEmpty) return override;

    const useLocal = bool.fromEnvironment('USE_LOCAL_BACKEND');
    if (useLocal) {
      if (!kIsWeb && Platform.isAndroid) {
        return 'http://10.0.2.2:3000/api';
      }
      return 'http://localhost:3000/api';
    }

    return 'https://thaiba-hive.vercel.app/api';
  }

  /// Web app base URL for WebView handoff.
  /// Defaults to the production cloud URL: https://thaiba-hive.vercel.app
  /// Use --dart-define=WEB_BASE_URL=... to override explicitly,
  /// or --dart-define=USE_LOCAL_BACKEND=true for local PC development.
  static String get webBaseUrl {
    const override = String.fromEnvironment('WEB_BASE_URL');
    if (override.isNotEmpty) return override;

    const useLocal = bool.fromEnvironment('USE_LOCAL_BACKEND');
    if (useLocal) {
      if (!kIsWeb && Platform.isAndroid) {
        return 'http://10.0.2.2:3000';
      }
      return 'http://localhost:3000';
    }

    return 'https://thaiba-hive.vercel.app';
  }

  static const String _defaultGoogleWebClientId =
      '744655632042-7njpugg533kj5okh731c38m9ffdgpc0o.apps.googleusercontent.com';

  /// Whether GOOGLE_WEB_CLIENT_ID is configured
  static bool get isGoogleSignInConfigured {
    const override = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');
    if (override.isNotEmpty) return true;
    return _defaultGoogleWebClientId.isNotEmpty;
  }

  /// Google Web Client ID for Google Sign-In on Android/iOS
  static String get googleWebClientId {
    const override = String.fromEnvironment('GOOGLE_WEB_CLIENT_ID');
    if (override.isNotEmpty) return override;
    return _defaultGoogleWebClientId;
  }

  static const String storageTokenKey = 'auth_token';
  static const String storageRefreshTokenKey = 'refresh_token';
  static const String storageUserProfileKey = 'user_profile';

  static const String dateFormatDisplay = 'dd MMM yyyy';
  static const String dateFormatApi = 'yyyy-MM-dd';
  static const String dateTimeFormatDisplay = 'dd MMM yyyy, hh:mm a';
  static const String timeFormatDisplay = 'hh:mm a';
}
