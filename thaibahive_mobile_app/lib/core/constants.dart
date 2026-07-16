class AppConstants {
  AppConstants._();

  static const String appName = 'ThaibaHive';
  static const String appVersion = '1.0.0';

  /// Base URL — use --dart-define=API_BASE_URL=... at build time,
  /// or falls back to localhost for development.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:4000/api',
  );

  /// Web app base URL for WebView handoff.
  static const String webBaseUrl = String.fromEnvironment(
    'WEB_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const String storageTokenKey = 'auth_token';
  static const String storageRefreshTokenKey = 'refresh_token';
  static const String storageUserProfileKey = 'user_profile';

  static const String dateFormatDisplay = 'dd MMM yyyy';
  static const String dateFormatApi = 'yyyy-MM-dd';
  static const String dateTimeFormatDisplay = 'dd MMM yyyy, hh:mm a';
  static const String timeFormatDisplay = 'hh:mm a';
}
