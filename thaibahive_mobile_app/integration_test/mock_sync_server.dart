import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// Mock Sync Server for headless Flutter integration tests.
/// Simulates backend sync responses, status codes, latency delays, and network drops.
class MockSyncServer {
  HttpServer? _server;
  int _port = 0;
  bool _isOnline = true;
  int _simulatedLatencyMs = 0;
  int _forcedStatusCode = 200;
  final List<Map<String, dynamic>> _receivedBatches = [];
  final Set<String> _rejectedMutationIds = {};

  int get port => _port;
  String get baseUrl => 'http://127.0.0.1:$_port';
  bool get isOnline => _isOnline;
  List<Map<String, dynamic>> get receivedBatches => List.unmodifiable(_receivedBatches);

  Future<void> start({int port = 0}) async {
    _server = await HttpServer.bind(InternetAddress.loopbackIPv4, port);
    _port = _server!.port;
    _server!.listen(_handleRequest);
  }

  Future<void> stop() async {
    await _server?.close(force: true);
    _server = null;
  }

  void setOnline(bool online) {
    _isOnline = online;
  }

  void setLatency(int latencyMs) {
    _simulatedLatencyMs = latencyMs;
  }

  void setForcedStatusCode(int statusCode) {
    _forcedStatusCode = statusCode;
  }

  void setRejectedMutations(Set<String> mutationIds) {
    _rejectedMutationIds.clear();
    _rejectedMutationIds.addAll(mutationIds);
  }

  void reset() {
    _isOnline = true;
    _simulatedLatencyMs = 0;
    _forcedStatusCode = 200;
    _receivedBatches.clear();
    _rejectedMutationIds.clear();
  }

  Future<void> _handleRequest(HttpRequest request) async {
    if (!_isOnline) {
      request.response.statusCode = HttpStatus.serviceUnavailable;
      request.response.write(jsonEncode({'error': 'Network offline'}));
      await request.response.close();
      return;
    }

    if (_simulatedLatencyMs > 0) {
      await Future.delayed(Duration(milliseconds: _simulatedLatencyMs));
    }

    if (request.uri.path == '/api/mobile/v1/sync' || request.uri.path == '/mobile/v1/sync') {
      if (request.method == 'POST') {
        if (_forcedStatusCode != 200) {
          request.response.statusCode = _forcedStatusCode;
          if (_forcedStatusCode == 401) {
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode({'error': 'Unauthorized: Token expired'}));
          } else {
            request.response.headers.contentType = ContentType.json;
            request.response.write(jsonEncode({'error': 'Simulated server error'}));
          }
          await request.response.close();
          return;
        }

        final content = await utf8.decoder.bind(request).join();
        Map<String, dynamic> body = {};
        try {
          body = jsonDecode(content);
        } catch (_) {}

        _receivedBatches.add(body);

        final mutations = (body['mutations'] as List?)?.cast<Map<String, dynamic>>() ?? [];
        final processed = <String>[];
        final failed = <String>[];

        for (final m in mutations) {
          final id = m['id']?.toString() ?? '';
          if (_rejectedMutationIds.contains(id)) {
            failed.add(id);
          } else {
            processed.add(id);
          }
        }

        request.response.statusCode = HttpStatus.ok;
        request.response.headers.contentType = ContentType.json;
        request.response.write(jsonEncode({
          'success': true,
          'processedMutations': processed,
          'failedMutations': failed,
          'syncedAt': DateTime.now().toIso8601String(),
        }));
        await request.response.close();
        return;
      }
    }

    if (request.uri.path == '/api/auth/mobile-handoff/nonce' || request.uri.path == '/auth/mobile-handoff/nonce') {
      request.response.statusCode = HttpStatus.ok;
      request.response.headers.contentType = ContentType.json;
      request.response.write(jsonEncode({
        'success': true,
        'nonce': 'mock_nonce_${DateTime.now().millisecondsSinceEpoch}',
        'token': 'mock_renewed_jwt_token_${DateTime.now().millisecondsSinceEpoch}',
        'expiresIn': 86400,
      }));
      await request.response.close();
      return;
    }

    if (request.uri.path == '/api/mobile/v1/telemetry' || request.uri.path == '/mobile/v1/telemetry') {
      final content = await utf8.decoder.bind(request).join();
      Map<String, dynamic> body = {};
      try {
        body = jsonDecode(content);
      } catch (_) {}

      request.response.statusCode = HttpStatus.ok;
      request.response.headers.contentType = ContentType.json;
      request.response.write(jsonEncode({
        'success': true,
        'ingestedEvents': (body['events'] as List?)?.length ?? 0,
        'timestamp': DateTime.now().toIso8601String(),
      }));
      await request.response.close();
      return;
    }

    request.response.statusCode = HttpStatus.notFound;
    request.response.write(jsonEncode({'error': 'Not Found'}));
    await request.response.close();
  }
}
