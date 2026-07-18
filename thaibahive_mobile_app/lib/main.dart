import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'core/services/service_initializer.dart';
import 'core/services/logger_service.dart';
import 'core/services/crash_log_service.dart';
import 'shared/widgets/error_widget.dart';
import 'features/attendance/data/services/background_presence_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Make the app fullscreen (hide status bar, keep navigation bar)
  await SystemChrome.setEnabledSystemUIMode(
    SystemUiMode.manual,
    overlays: [SystemUiOverlay.bottom],
  );
  
  // Initialize all services before running the app
  await serviceInitializer.init();
  
  logger.info('APPLICATION_START: ThaibaHive Mobile initialized');

  // Flutter Error Interception
  FlutterError.onError = (details) {
    FlutterError.presentError(details);
    logger.error('FLUTTER_ERROR', details.exception, details.stack);
    crashLogService.record('FLUTTER_ERROR', details.exception, details.stack);
  };

  // Asynchronous Error Interception
  PlatformDispatcher.instance.onError = (error, stack) {
    logger.error('ASYNC_ERROR', error, stack);
    crashLogService.record('ASYNC_ERROR', error, stack);
    return true;
  };

  // Production Render/Build Error widget setup
  ErrorWidget.builder = (details) {
    logger.error('FLUTTER_RENDER_ERROR', details.exception, details.stack);
    crashLogService.record('FLUTTER_RENDER_ERROR', details.exception, details.stack);

    // Detect network-related errors and show appropriate widget
    final errorString = details.exception.toString().toLowerCase();
    final isNetworkError = errorString.contains('socketexception') ||
        errorString.contains('clientexception') ||
        errorString.contains('failed host lookup') ||
        errorString.contains('connection') ||
        errorString.contains('network');

    if (isNetworkError) {
      return Scaffold(
        body: AppErrorWidget(
          title: 'No Connection',
          message: 'Please check your internet connection and try again.',
          icon: Icons.wifi_off_rounded,
        ),
      );
    }

    return Scaffold(
      body: AppErrorWidget(
        title: 'Something Went Wrong',
        message: details.exception.toString(),
      ),
    );
  };
  
  // Initialize background presence service
  await BackgroundPresenceService.instance.init();
  
  // Resume tracking if a check-in was active
  await BackgroundPresenceService.instance.resumeTrackingIfNeeded();
  
  runApp(
    const ProviderScope(
      child: ThaibaHiveApp(),
    ),
  );
}

