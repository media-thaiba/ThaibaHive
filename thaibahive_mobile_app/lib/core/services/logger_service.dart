import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

enum LogLevel { info, warning, error, sync }

class LogEntry {
  final DateTime timestamp;
  final LogLevel level;
  final String message;
  final String? error;
  final String? stackTrace;

  LogEntry({
    required this.level,
    required this.message,
    this.error,
    this.stackTrace,
  }) : timestamp = DateTime.now();

  @override
  String toString() {
    return '[${timestamp.toIso8601String()}] [${level.name.toUpperCase()}] $message${error != null ? ' | Error: $error' : ''}';
  }
}

class LoggerService extends StateNotifier<List<LogEntry>> {
  static const int _maxLogs = 500;
  File? _internalLogFile;
  File? _externalLogFile;
  bool _initialized = false;

  LoggerService() : super([]) {
    _initFiles();
  }

  Future<void> _initFiles() async {
    try {
      final base = await getApplicationDocumentsDirectory();
      final dir = Directory(p.join(base.path, 'console_logs'));
      if (!dir.existsSync()) {
        dir.createSync(recursive: true);
      }
      _internalLogFile = File(p.join(dir.path, 'app_console.log'));
      
      // Clear log file if it's too large (> 5MB)
      if (_internalLogFile!.existsSync() && _internalLogFile!.lengthSync() > 5 * 1024 * 1024) {
        _internalLogFile!.deleteSync();
      }

      if (!kIsWeb && Platform.isAndroid) {
        final extDir = await getExternalStorageDirectory();
        if (extDir != null) {
          final extSubDir = Directory(p.join(extDir.path, 'console_logs'));
          if (!extSubDir.existsSync()) {
            extSubDir.createSync(recursive: true);
          }
          _externalLogFile = File(p.join(extSubDir.path, 'app_console.log'));
          if (_externalLogFile!.existsSync() && _externalLogFile!.lengthSync() > 5 * 1024 * 1024) {
            _externalLogFile!.deleteSync();
          }
        }
      }
      _initialized = true;
    } catch (e) {
      debugPrint('[LoggerService] File logging initialization failed: $e');
    }
  }

  void debug(String message) => _log(LogLevel.info, '[DEBUG] $message');
  void info(String message) => _log(LogLevel.info, message);
  void warning(String message) => _log(LogLevel.warning, message);
  void warn(String message) => warning(message);
  void error(String message, [Object? error, StackTrace? stackTrace]) => 
      _log(LogLevel.error, message, error?.toString(), stackTrace?.toString());
  void sync(String message) => _log(LogLevel.sync, message);

  void _log(LogLevel level, String message, [String? error, String? stackTrace]) {
    final sanitizedMessage = _sanitize(message);
    final sanitizedError = error != null ? _sanitize(error) : null;

    final entry = LogEntry(
      level: level,
      message: sanitizedMessage,
      error: sanitizedError,
      stackTrace: stackTrace,
    );
    
    // Always print to console in debug mode
    debugPrint(entry.toString());
    
    // Use Future.microtask to avoid "Provider modification violation" 
    // if this is called during a widget's build phase.
    Future.microtask(() {
      if (mounted) {
        state = [entry, ...state].take(_maxLogs).toList();
      }
    });

    // Write to local files
    _writeLogToFile(entry);
  }

  void _writeLogToFile(LogEntry entry) {
    if (!_initialized) return;
    final logText = '${entry.toString()}\n';
    try {
      if (_internalLogFile != null) {
        _internalLogFile!.writeAsStringSync(logText, mode: FileMode.append, flush: true);
      }
      if (_externalLogFile != null) {
        _externalLogFile!.writeAsStringSync(logText, mode: FileMode.append, flush: true);
      }
    } catch (e) {
      debugPrint('[LoggerService] Failed to write log line to file: $e');
    }
  }

  Future<void> shareLogs() async {
    try {
      if (_internalLogFile != null && _internalLogFile!.existsSync()) {
        final content = _internalLogFile!.readAsStringSync();
        await Share.share(
          content,
          subject: 'ThaibaHive App Console Logs',
        );
      }
    } catch (e) {
      debugPrint('[LoggerService] Failed to share logs: $e');
    }
  }

  String _sanitize(String text) {
    var result = text;
    final passwordRegex = RegExp(r'(password\s*[:=]\s*)([^\s&,]+)', caseSensitive: false);
    final tokenRegex = RegExp(r'(token\s*[:=]\s*|bearer\s+)([a-zA-Z0-9_\-\.\=\+]{10,})', caseSensitive: false);
    result = result.replaceAllMapped(passwordRegex, (match) => '${match.group(1)}********');
    result = result.replaceAllMapped(tokenRegex, (match) => '${match.group(1)}********');
    return result;
  }

  void clear() {
    state = [];
    try {
      if (_internalLogFile != null && _internalLogFile!.existsSync()) {
        _internalLogFile!.writeAsStringSync('');
      }
      if (_externalLogFile != null && _externalLogFile!.existsSync()) {
        _externalLogFile!.writeAsStringSync('');
      }
    } catch (e) {
      debugPrint('[LoggerService] Failed to clear log files: $e');
    }
  }
}

final logger = LoggerService();

final loggerProvider = StateNotifierProvider<LoggerService, List<LogEntry>>((ref) {
  return logger;
});

final loggerServiceProvider = Provider<LoggerService>((ref) {
  return logger;
});
