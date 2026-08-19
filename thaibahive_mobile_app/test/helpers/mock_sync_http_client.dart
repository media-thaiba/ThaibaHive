import 'dart:convert';
import 'package:http/http.dart' as http;

/// Mock HTTP Client for synchronous offline sync unit & integration tests
class MockSyncHttpClient extends http.BaseClient {
  bool isOnline = true;
  int simulatedLatencyMs = 0;
  int statusCode = 200;
  final List<http.Request> recordedRequests = [];
  final Set<String> rejectedMutationIds = {};

  void reset() {
    isOnline = true;
    simulatedLatencyMs = 0;
    statusCode = 200;
    recordedRequests.clear();
    rejectedMutationIds.clear();
  }

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    if (request is http.Request) {
      recordedRequests.add(request);
    }

    if (!isOnline) {
      throw http.ClientException('Client is offline');
    }

    if (simulatedLatencyMs > 0) {
      await Future.delayed(Duration(milliseconds: simulatedLatencyMs));
    }

    if (statusCode != 200) {
      final errorPayload = jsonEncode({'error': 'Simulated HTTP $statusCode error'});
      return http.StreamedResponse(
        Stream.value(utf8.encode(errorPayload)),
        statusCode,
        headers: {'content-type': 'application/json'},
      );
    }

    if (request.url.path.contains('/sync')) {
      Map<String, dynamic> body = {};
      if (request is http.Request && request.body.isNotEmpty) {
        try {
          body = jsonDecode(request.body);
        } catch (_) {}
      }

      final mutations = (body['mutations'] as List?)?.cast<Map<String, dynamic>>() ?? [];
      final processed = <String>[];
      final failed = <String>[];

      for (final m in mutations) {
        final id = m['id']?.toString() ?? '';
        if (rejectedMutationIds.contains(id)) {
          failed.add(id);
        } else {
          processed.add(id);
        }
      }

      final responsePayload = jsonEncode({
        'success': true,
        'processedMutations': processed,
        'failedMutations': failed,
        'syncedAt': DateTime.now().toIso8601String(),
      });

      return http.StreamedResponse(
        Stream.value(utf8.encode(responsePayload)),
        200,
        headers: {'content-type': 'application/json'},
      );
    }

    final defaultPayload = jsonEncode({'success': true});
    return http.StreamedResponse(
      Stream.value(utf8.encode(defaultPayload)),
      200,
      headers: {'content-type': 'application/json'},
    );
  }
}
