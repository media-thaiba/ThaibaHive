import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

class CrashLogFile {
  final File file;
  final DateTime timestamp;
  final int sizeBytes;

  CrashLogFile({
    required this.file,
    required this.timestamp,
    required this.sizeBytes,
  });
}

class CrashLogService {
  Directory? _logDir;
  Directory? _extLogDir;

  String _appVersion = 'unknown';
  String _buildNumber = 'unknown';
  String _osVersion = 'unknown';
  String _deviceModel = 'unknown';

  final List<Map<String, dynamic>> _pendingLogs = [];

  Future<void> init() async {
    try {
      final base = await getApplicationDocumentsDirectory();
      _logDir = Directory(p.join(base.path, 'crash_logs'));
      if (!_logDir!.existsSync()) {
        _logDir!.createSync(recursive: true);
      }

      // Initialize Sentry in production
      if (kReleaseMode) {
        await SentryFlutter.init(
          (options) {
            options.dsn = const String.fromEnvironment('SENTRY_DSN');
            options.tracesSampleRate = 1.0;
          },
        );
      }

      // Flush pending logs to disk
      for (final log in _pendingLogs) {
        _writeLogToDisk(
          log['tag'] as String,
          log['error'] as Object,
          log['stack'] as StackTrace?,
          log['timestamp'] as DateTime,
        );
      }
      _pendingLogs.clear();
    } catch (e) {
      debugPrint('[CrashLogService] Directory initialization failed: $e');
      return;
    }

    try {
      if (!kIsWeb && Platform.isAndroid) {
        final extDir = await getExternalStorageDirectory();
        if (extDir != null) {
          _extLogDir = Directory(p.join(extDir.path, 'crash_logs'));
          if (!_extLogDir!.existsSync()) {
            _extLogDir!.createSync(recursive: true);
          }
        }
      }
    } catch (e) {
      debugPrint('[CrashLogService] External storage directory init failed: $e');
    }

    try {
      // Capture device metadata
      final pkgInfo = await PackageInfo.fromPlatform();
      _appVersion = pkgInfo.version;
      _buildNumber = pkgInfo.buildNumber;
    } catch (e) {
      debugPrint('[CrashLogService] Package info retrieval failed: $e');
    }

    try {
      if (kIsWeb) {
        _osVersion = 'Web';
        _deviceModel = 'Browser';
      } else if (Platform.isAndroid) {
        final info = await DeviceInfoPlugin().androidInfo;
        _osVersion = 'Android ${info.version.release}';
        _deviceModel = info.model;
      } else if (Platform.isIOS) {
        final info = await DeviceInfoPlugin().iosInfo;
        _osVersion = 'iOS ${info.systemVersion}';
        _deviceModel = info.model;
      } else if (Platform.isMacOS) {
        final info = await DeviceInfoPlugin().macOsInfo;
        _osVersion = 'macOS ${info.osRelease}';
        _deviceModel = info.model;
      } else if (Platform.isWindows) {
        final info = await DeviceInfoPlugin().windowsInfo;
        _osVersion = 'Windows ${info.releaseId}';
        _deviceModel = info.computerName;
      } else if (Platform.isLinux) {
        final info = await DeviceInfoPlugin().linuxInfo;
        _osVersion = 'Linux ${info.name}';
        _deviceModel = info.prettyName;
      }
    } catch (e) {
      debugPrint('[CrashLogService] Device info retrieval failed: $e');
    }

    _purgeOldLogs();
  }

  void _writeLogToDisk(String tag, Object error, StackTrace? stack, DateTime now) {
    final ts = now.toIso8601String().replaceAll(':', '-');
    final payload = jsonEncode({
      'timestamp': now.toIso8601String(),
      'tag': tag,
      'appVersion': '$_appVersion+$_buildNumber',
      'osVersion': _osVersion,
      'deviceModel': _deviceModel,
      'error': error.toString(),
      'stackTrace': stack?.toString() ?? 'No stack trace available',
    });

    final dir = _logDir;
    if (dir != null) {
      try {
        final file = File(p.join(dir.path, 'crash_$ts.log'));
        file.writeAsStringSync(payload);
      } catch (e) {
        debugPrint('[CrashLogService] _writeLogToDisk private failed: $e');
      }
    }

    final extDir = _extLogDir;
    if (extDir != null) {
      try {
        final file = File(p.join(extDir.path, 'crash_$ts.log'));
        file.writeAsStringSync(payload);
      } catch (e) {
        debugPrint('[CrashLogService] _writeLogToDisk public failed: $e');
      }
    }
  }

  void record(String tag, Object error, StackTrace? stack) {
    final now = DateTime.now();

    // Report to Sentry in release/production
    if (kReleaseMode) {
      Sentry.captureException(
        error,
        stackTrace: stack,
        withScope: (scope) {
          scope.setTag('error_tag', tag);
          scope.setContexts('app_metadata', {
            'appVersion': '$_appVersion+$_buildNumber',
            'osVersion': _osVersion,
            'deviceModel': _deviceModel,
          });
        },
      ).catchError((err) {
        debugPrint('[CrashLogService] Sentry capture failed: $err');
      });
    }

    if (_logDir == null) {
      _pendingLogs.add({
        'tag': tag,
        'error': error,
        'stack': stack,
        'timestamp': now,
      });
      debugPrint('[CrashLogService] Log buffered in memory (service not initialized yet)');
      return;
    }
    _writeLogToDisk(tag, error, stack, now);
  }

  List<CrashLogFile> listLogs() {
    try {
      final dir = _logDir;
      if (dir == null || !dir.existsSync()) return [];
      final files = dir
          .listSync()
          .whereType<File>()
          .where((f) => p.basename(f.path).endsWith('.log'))
          .map((f) {
            final name = p.basename(f.path);
            final tsPart = name
                .replaceFirst('crash_', '')
                .replaceFirst('.log', '')
                .replaceAll('-', ':');
            DateTime ts;
            try {
              ts = DateTime.parse(tsPart);
            } catch (_) {
              ts = f.statSync().modified;
            }
            return CrashLogFile(
              file: f,
              timestamp: ts,
              sizeBytes: f.lengthSync(),
            );
          })
          .toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
      return files;
    } catch (e) {
      debugPrint('[CrashLogService] listLogs() failed: $e');
      return [];
    }
  }

  String readLog(String filePath) {
    try {
      final file = File(filePath);
      if (file.existsSync()) {
        return file.readAsStringSync();
      }
      return 'Log file does not exist.';
    } catch (e) {
      return 'Could not read log file: $e';
    }
  }

  void deleteLog(String filePath) {
    try {
      final file = File(filePath);
      if (file.existsSync()) {
        file.deleteSync();
      }
    } catch (e) {
      debugPrint('[CrashLogService] deleteLog() failed: $e');
    }
  }

  void deleteAll() {
    try {
      final dir = _logDir;
      if (dir == null || !dir.existsSync()) return;
      dir.listSync().whereType<File>().forEach((f) {
        try {
          f.deleteSync();
        } catch (_) {}
      });
    } catch (e) {
      debugPrint('[CrashLogService] deleteAll() failed: $e');
    }
  }

  void _purgeOldLogs() {
    try {
      final dir = _logDir;
      if (dir == null) return;
      final cutoff = DateTime.now().subtract(const Duration(days: 3));
      final all = listLogs();
      for (final f in all.where((f) => f.timestamp.isBefore(cutoff))) {
        try {
          f.file.deleteSync();
        } catch (_) {}
      }

      final remaining = listLogs();
      if (remaining.length > 50) {
        for (final f in remaining.skip(50)) {
          try {
            f.file.deleteSync();
          } catch (_) {}
        }
      }
    } catch (e) {
      debugPrint('[CrashLogService] _purgeOldLogs() failed: $e');
    }
  }
}

final crashLogService = CrashLogService();

final crashLogServiceProvider = Provider<CrashLogService>((ref) {
  return crashLogService;
});

final crashLogsProvider = StateProvider<List<CrashLogFile>>((ref) {
  return crashLogService.listLogs();
});

