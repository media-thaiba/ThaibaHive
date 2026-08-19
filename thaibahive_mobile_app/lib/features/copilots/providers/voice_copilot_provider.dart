import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../models/voice_copilot_state.dart';

final voiceCopilotProvider =
    StateNotifierProvider<VoiceCopilotNotifier, VoiceCopilotState>((ref) {
  return VoiceCopilotNotifier();
});

class VoiceCopilotNotifier extends StateNotifier<VoiceCopilotState> {
  VoiceCopilotNotifier() : super(VoiceCopilotState.idle());

  String _baseUrl = 'http://localhost:3000';
  String? _sessionToken;

  void setBaseUrl(String url) {
    _baseUrl = url;
  }

  void setSessionToken(String token) {
    _sessionToken = token;
  }

  Future<void> sendVoiceQuery(String transcriptText, {int retryCount = 0}) async {
    state = VoiceCopilotState.authenticating();

    try {
      state = VoiceCopilotState.querying();

      final uri = Uri.parse('$_baseUrl/api/admin/voice/query');
      final headers = {
        'Content-Type': 'application/json',
        if (_sessionToken != null) 'Authorization': 'Bearer $_sessionToken',
      };

      final body = jsonEncode({
        'transcriptText': transcriptText,
        'audioFormat': 'pcm',
        'language': 'en-US',
      });

      final response = await http.post(uri, headers: headers, body: body).timeout(
        const Duration(seconds: 5),
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body);
        final responseData = VoiceQueryResponseData.fromJson(json);
        state = VoiceCopilotState.success(responseData);
      } else if (response.statusCode == 401 && retryCount < 1) {
        // MHD-002: Nonce refresh retry logic
        await Future.delayed(const Duration(milliseconds: 500));
        await sendVoiceQuery(transcriptText, retryCount: retryCount + 1);
      } else {
        state = VoiceCopilotState.error(
          'HTTP ${response.statusCode}: ${response.reasonPhrase ?? "Query failed"}',
        );
      }
    } catch (e) {
      state = VoiceCopilotState.error('Network error: ${e.toString()}');
    }
  }

  void reset() {
    state = VoiceCopilotState.idle();
  }
}
