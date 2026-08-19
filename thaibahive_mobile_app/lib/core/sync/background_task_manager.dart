import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'package:flutter/foundation.dart';
import 'package:workmanager/workmanager.dart';
import 'package:background_fetch/background_fetch.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:battery_plus/battery_plus.dart';
import 'background_sync_isolate.dart';
import 'isolate_message_protocol.dart';
import 'network_diagnostics_collector.dart';
import 'adaptive_sync_decision_engine.dart';
import 'policy_manager.dart';

@pragma('vm:entry-point')
void callbackDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    debugPrint('[WorkManager] Executing background sync task: $task');
    final baseUrl = inputData?['baseUrl'] ?? 'http://localhost:3000';
    final authToken = inputData?['authToken'] ?? '';
    
    // Collect network diagnostics and device unique identifier
    final diagnostics = await NetworkDiagnosticsCollector().collectDiagnostics(baseUrl);
    final deviceId = await BackgroundTaskManager.getDeviceUniqueIdentifier();

    final result = await BackgroundTaskManager.triggerBackgroundSync(
      baseUrl: baseUrl,
      authToken: authToken,
      diagnostics: diagnostics,
      deviceId: deviceId,
    );
    return result.success;
  });
}

class BackgroundTaskManager {
  static bool _isEnabled = true;

  static bool get isEnabled => _isEnabled;

  static void setEnabled(bool enabled) {
    _isEnabled = enabled;
  }

  /// Helper to get unique device identifier across platforms
  static Future<String> getDeviceUniqueIdentifier() async {
    try {
      final deviceInfo = DeviceInfoPlugin();
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        return androidInfo.id;
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        return iosInfo.identifierForVendor ?? 'ios-device';
      }
    } catch (_) {}
    return 'mobile-device';
  }

  /// Initialize Android WorkManager & iOS BackgroundFetch native plugins
  static Future<void> initializePlugins({
    required String baseUrl,
    required String authToken,
  }) async {
    try {
      // 1. Android WorkManager initialization
      await Workmanager().initialize(
        callbackDispatcher,
        isInDebugMode: kDebugMode,
      );

      await Workmanager().registerPeriodicTask(
        'thaibahive_background_sync',
        'backgroundSyncQueueTask',
        frequency: const Duration(minutes: 15),
        constraints: Constraints(
          networkType: NetworkType.connected,
          requiresBatteryNotLow: true,
        ),
        inputData: {
          'baseUrl': baseUrl,
          'authToken': authToken,
        },
      );

      // 2. iOS BackgroundFetch initialization
      await BackgroundFetch.configure(
        BackgroundFetchConfig(
          minimumFetchInterval: 15,
          stopOnTerminate: false,
          enableHeadless: true,
          requiresBatteryNotLow: true,
          requiresDeviceIdle: false,
          requiredNetworkType: NetworkType.CONNECTED,
        ),
        (String taskId) async {
          debugPrint('[BackgroundFetch] Executing iOS background task: $taskId');
          final diagnostics = await NetworkDiagnosticsCollector().collectDiagnostics(baseUrl);
          final deviceId = await getDeviceUniqueIdentifier();
          await triggerBackgroundSync(
            baseUrl: baseUrl,
            authToken: authToken,
            diagnostics: diagnostics,
            deviceId: deviceId,
          );
          BackgroundFetch.finish(taskId);
        },
        (String taskId) async {
          debugPrint('[BackgroundFetch] iOS background task timeout: $taskId');
          BackgroundFetch.finish(taskId);
        },
      );
    } catch (e) {
      debugPrint('[BackgroundTaskManager] Native plugin initialization warning: $e');
    }
  }

  static Future<IsolateSyncResult> triggerBackgroundSync({
    required String baseUrl,
    required String authToken,
    Map<String, dynamic>? diagnostics,
    String? deviceId,
  }) async {
    if (!_isEnabled) {
      return IsolateSyncResult(
        success: false,
        syncedCount: 0,
        failedCount: 0,
        error: 'Background sync is disabled',
      );
    }

    // Retrieve battery status
    double batteryPct = 100.0;
    try {
      final b = Battery();
      final level = await b.batteryLevel;
      batteryPct = level.toDouble();
    } catch (_) {}

    // Evaluate adaptive parameters
    final connectionType = diagnostics?['connectionType'] as String? ?? 'unknown';
    final latencyMs = diagnostics?['latencyMs'] as int? ?? -1;
    final bandwidthKbps = diagnostics?['bandwidthKbps'] as double? ?? 150.0;

    final policyMgr = PolicyManager();
    await policyMgr.init();
    final activePolicy = policyMgr.getCachedPolicy();

    final syncParams = AdaptiveSyncDecisionEngine.evaluate(
      connectionType: connectionType,
      latencyMs: latencyMs,
      bandwidthKbps: bandwidthKbps,
      batteryLevel: batteryPct,
      activePolicy: activePolicy,
    );

    final receivePort = ReceivePort();
    final isolate = await Isolate.spawn(backgroundSyncIsolateEntryPoint, receivePort.sendPort);

    try {
      final completer = Completer<Map<String, dynamic>>();
      SendPort? sendPort;

      receivePort.listen((msg) {
        if (msg is SendPort) {
          sendPort = msg;
          sendPort!.send(IsolateSyncCommand(
            action: 'FLUSH_QUEUE',
            baseUrl: baseUrl,
            authToken: authToken,
            params: {
              'deviceId': deviceId ?? 'mobile-device',
              'diagnostics': diagnostics,
              'syncParams': syncParams.toJson(),
            },
          ).toJson());
        } else if (msg is Map<String, dynamic>) {
          if (!completer.isCompleted) {
            completer.complete(msg);
          }
        }
      });

      final resultJson = await completer.future.timeout(
        const Duration(seconds: 30),
        onTimeout: () => {
          'success': false,
          'syncedCount': 0,
          'failedCount': 0,
          'error': 'Isolate execution timeout (30s exceeded)',
        },
      );

      return IsolateSyncResult(
        success: resultJson['success'] as bool? ?? false,
        syncedCount: resultJson['syncedCount'] as int? ?? 0,
        failedCount: resultJson['failedCount'] as int? ?? 0,
        error: resultJson['error'] as String?,
        rawBytesCount: resultJson['rawBytesCount'] as int?,
        compressedBytesCount: resultJson['compressedBytesCount'] as int?,
        compressionRatio: (resultJson['compressionRatio'] as num?)?.toDouble(),
      );
    } catch (e) {
      return IsolateSyncResult(
        success: false,
        syncedCount: 0,
        failedCount: 0,
        error: e.toString(),
      );
    } finally {
      receivePort.close();
      isolate.kill(priority: Isolate.immediate);
    }
  }
}
