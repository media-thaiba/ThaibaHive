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
  StreamSubscription<String>? _subscription;
  Timer? _reconnectTimer;
  bool _isDisposed = false;
  int _retryCount = 0;

  SSEServiceNotifier() : super(const SSEServiceState());

  Future<void> initialize() async {
    final token = await _storage.read(key: AppConstants.storageTokenKey);
    if (token == null || token.isEmpty) return;

    _startConnection(token);
  }

  void _startConnection(String token) async {
    if (_isDisposed) return;

    _reconnectTimer?.cancel();
    await _subscription?.cancel();
    _client?.close();
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
        _retryCount = 0;
        state = state.copyWith(isConnected: true);

        _subscription = response.stream
            .transform(utf8.decoder)
            .transform(const LineSplitter())
            .listen(
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
      } else {
        state = state.copyWith(isConnected: false);
        _reconnect(token);
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
    _reconnectTimer?.cancel();

    // Exponential backoff capped at 60 seconds
    final delaySeconds = (5 * (1 << (_retryCount < 4 ? _retryCount : 4))).clamp(5, 60);
    _retryCount++;

    _reconnectTimer = Timer(Duration(seconds: delaySeconds), () {
      if (!_isDisposed) _startConnection(token);
    });
  }

  @override
  void dispose() {
    _isDisposed = true;
    _reconnectTimer?.cancel();
    _subscription?.cancel();
    _client?.close();
    super.dispose();
  }
}

final sseServiceProvider = StateNotifierProvider<SSEServiceNotifier, SSEServiceState>((ref) {
  final notifier = SSEServiceNotifier();
  notifier.initialize();
  return notifier;
});
