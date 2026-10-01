import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../../../core/constants.dart';

class AgentStreamEvent {
  final String type;
  final Map<String, dynamic> data;
  final int sequenceNumber;
  final String timestamp;

  const AgentStreamEvent({
    required this.type,
    required this.data,
    required this.sequenceNumber,
    required this.timestamp,
  });

  bool get isHeartbeatOrSystem =>
      type == 'heartbeat' || type == 'connected' || type == 'ping' || type == 'unknown';

  factory AgentStreamEvent.fromJson(Map<String, dynamic> json) {
    return AgentStreamEvent(
      type: json['type']?.toString() ?? 'unknown',
      data: json['data'] is Map<String, dynamic> ? json['data'] : <String, dynamic>{},
      sequenceNumber: json['seq'] is int ? json['seq'] : 0,
      timestamp: json['timestamp']?.toString() ?? DateTime.now().toIso8601String(),
    );
  }
}

class AgentStreamService {
  final FlutterSecureStorage _storage;
  final String _baseUrl;
  http.Client? _client;
  StreamSubscription<String>? _subscription;
  Timer? _reconnectTimer;
  int _retryCount = 0;
  bool _isDisposed = false;

  static const int _initialBackoffSeconds = 2;
  static const int _maxBackoffSeconds = 30;

  final _eventController = StreamController<AgentStreamEvent>.broadcast();
  Stream<AgentStreamEvent> get eventStream => _eventController.stream;

  AgentStreamService({
    FlutterSecureStorage? storage,
    String? baseUrl,
  })  : _storage = storage ?? const FlutterSecureStorage(),
        _baseUrl = baseUrl ?? AppConstants.apiBaseUrl;

  Future<void> connect() async {
    if (_isDisposed) return;

    final token = await _storage.read(key: AppConstants.storageTokenKey);
    if (token == null || token.isEmpty) return;

    _reconnectTimer?.cancel();
    await _subscription?.cancel();
    _client?.close();
    _client = http.Client();

    try {
      final uri = Uri.parse('$_baseUrl/agents/stream?topics=*');
      final request = http.Request('GET', uri)
        ..headers['Authorization'] = 'Bearer $token'
        ..headers['Accept'] = 'text/event-stream'
        ..headers['Cache-Control'] = 'no-cache';

      final response = await _client!.send(request);

      if (response.statusCode == 200) {
        _retryCount = 0; // Reset backoff upon successful connection
        _subscription = response.stream
            .transform(utf8.decoder)
            .transform(const LineSplitter())
            .listen(
          (line) {
            if (line.startsWith('data:')) {
              final rawData = line.substring(5).trim();
              try {
                final json = jsonDecode(rawData);
                if (json is Map<String, dynamic>) {
                  final event = AgentStreamEvent.fromJson(json);
                  _eventController.add(event);
                }
              } catch (_) {
                // Ignore ping or malformed lines
              }
            }
          },
          onError: (err) {
            if (kDebugMode) print('[AgentStreamService] Stream error: $err');
            _scheduleReconnect();
          },
          onDone: () {
            if (kDebugMode) print('[AgentStreamService] Stream closed by server');
            _scheduleReconnect();
          },
          cancelOnError: true,
        );
      } else if (response.statusCode == 401 || response.statusCode == 403) {
        if (kDebugMode) {
          print('[AgentStreamService] SSE connection rejected (HTTP ${response.statusCode}). Halting reconnect.');
        }
        // Permanent rejection: do not hammer the server indefinitely
      } else {
        if (kDebugMode) print('[AgentStreamService] Failed to connect SSE: ${response.statusCode}');
        _scheduleReconnect();
      }
    } catch (e) {
      if (kDebugMode) print('[AgentStreamService] Connection exception: $e');
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    if (_isDisposed) return;
    _reconnectTimer?.cancel();

    // Exponential backoff with jitter: 2s, 4s, 8s, 16s, max 30s
    final delaySeconds = (_initialBackoffSeconds * (1 << _retryCount)).clamp(2, _maxBackoffSeconds);
    if (_retryCount < 10) {
      _retryCount++;
    }

    if (kDebugMode) {
      print('[AgentStreamService] Scheduling SSE reconnect in ${delaySeconds}s (attempt #$_retryCount)');
    }

    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      connect();
    });
  }

  void dispose() {
    _isDisposed = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _client?.close();
    _eventController.close();
  }
}
