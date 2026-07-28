import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants.dart';

class SSEServiceState {
  final bool isConnected;
  final String? lastEventType;
  final Map<String, dynamic>? lastPayload;

  const SSEServiceState({
    this.isConnected = false,
    this.lastEventType,
    this.lastPayload,
  });

  SSEServiceState copyWith({
    bool? isConnected,
    String? lastEventType,
    Map<String, dynamic>? lastPayload,
  }) {
    return SSEServiceState(
      isConnected: isConnected ?? this.isConnected,
      lastEventType: lastEventType ?? this.lastEventType,
      lastPayload: lastPayload ?? this.lastPayload,
    );
  }
}

class SSEServiceNotifier extends StateNotifier<SSEServiceState> {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  http.Client? _client;
  bool _isDisposed = false;

  SSEServiceNotifier() : super(const SSEServiceState());

  Future<void> initialize() async {
    final token = await _storage.read(key: AppConstants.storageTokenKey);
    if (token == null || token.isEmpty) return;

    _startConnection(token);
  }

  void _startConnection(String token) async {
    if (_isDisposed) return;
    _client = http.Client();

    try {
      final request = http.Request(
        'GET',
        Uri.parse('${AppConstants.apiBaseUrl}/api/notifications/subscribe'),
      );
      request.headers['Authorization'] = 'Bearer $token';
      request.headers['Accept'] = 'text/event-stream';

      final response = await _client!.send(request);
      if (response.statusCode == 200) {
        state = state.copyWith(isConnected: true);

        response.stream.transform(utf8.decoder).transform(const LineSplitter()).listen(
          (line) {
            _parseSSELine(line);
          },
          onError: (error) {
            state = state.copyWith(isConnected: false);
            _reconnect(token);
          },
          onDone: () {
            state = state.copyWith(isConnected: false);
            _reconnect(token);
          },
        );
      }
    } catch (e) {
      state = state.copyWith(isConnected: false);
      _reconnect(token);
    }
  }

  String _currentEvent = 'message';

  void _parseSSELine(String line) {
    if (line.startsWith('event:')) {
      _currentEvent = line.substring(6).trim();
    } else if (line.startsWith('data:')) {
      final dataStr = line.substring(5).trim();
      try {
        final payload = jsonDecode(dataStr) as Map<String, dynamic>;
        state = state.copyWith(
          lastEventType: _currentEvent,
          lastPayload: payload,
        );
      } catch (_) {}
    }
  }

  void _reconnect(String token) {
    if (_isDisposed) return;
    Future.delayed(const Duration(seconds: 5), () {
      if (!_isDisposed) _startConnection(token);
    });
  }

  @override
  void dispose() {
    _isDisposed = true;
    _client?.close();
    super.dispose();
  }
}

final sseServiceProvider = StateNotifierProvider<SSEServiceNotifier, SSEServiceState>((ref) {
  final notifier = SSEServiceNotifier();
  notifier.initialize();
  return notifier;
});
