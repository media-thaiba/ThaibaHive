// WebSocket client service for Mobile Campus Copilot streaming (KM-025)

import 'dart:async';
import 'dart:convert';

class CopilotWebSocketService {
  final String serverUrl;
  final _messageController = StreamController<Map<String, dynamic>>.broadcast();

  CopilotWebSocketService({required this.serverUrl});

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;

  void connect(String userId) {
    // In production connects via IOWebSocketChannel.connect(serverUrl)
    _messageController.add({
      'type': 'connected',
      'userId': userId,
      'status': 'online',
    });
  }

  void sendQuery(String sessionId, String prompt) {
    _messageController.add({
      'type': 'token_stream_start',
      'sessionId': sessionId,
    });

    _messageController.add({
      'type': 'token_chunk',
      'token': 'Based on your degree plan, you are on track for graduation. ',
      'sessionId': sessionId,
    });

    _messageController.add({
      'type': 'response_complete',
      'sessionId': sessionId,
      'payload': {
        'answerText': 'Based on your degree plan, you are on track for graduation.',
        'citations': ['Academic Catalog 2026'],
      },
    });
  }

  void dispose() {
    _messageController.close();
  }
}
