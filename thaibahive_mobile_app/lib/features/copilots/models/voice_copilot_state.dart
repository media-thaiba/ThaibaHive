enum VoiceCopilotStatus { idle, authenticating, querying, success, error }

class VoiceQueryResponseData {
  final String rawTranscript;
  final String intent;
  final String? campusId;
  final double confidence;
  final String synthesizedAudioText;

  VoiceQueryResponseData({
    required this.rawTranscript,
    required this.intent,
    this.campusId,
    required this.confidence,
    required this.synthesizedAudioText,
  });

  factory VoiceQueryResponseData.fromJson(Map<String, dynamic> json) {
    return VoiceQueryResponseData(
      rawTranscript: json['rawTranscript'] ?? '',
      intent: json['intent'] ?? 'GENERAL_QUERY',
      campusId: json['campusId'],
      confidence: (json['confidence'] as num?)?.toDouble() ?? 0.9,
      synthesizedAudioText: json['synthesizedAudioText'] ?? 'Synthesis complete.',
    );
  }
}

class VoiceCopilotState {
  final VoiceCopilotStatus status;
  final VoiceQueryResponseData? data;
  final String? errorMessage;

  VoiceCopilotState({
    required this.status,
    this.data,
    this.errorMessage,
  });

  factory VoiceCopilotState.idle() => VoiceCopilotState(status: VoiceCopilotStatus.idle);
  factory VoiceCopilotState.authenticating() => VoiceCopilotState(status: VoiceCopilotStatus.authenticating);
  factory VoiceCopilotState.querying() => VoiceCopilotState(status: VoiceCopilotStatus.querying);
  factory VoiceCopilotState.success(VoiceQueryResponseData data) =>
      VoiceCopilotState(status: VoiceCopilotStatus.success, data: data);
  factory VoiceCopilotState.error(String message) =>
      VoiceCopilotState(status: VoiceCopilotStatus.error, errorMessage: message);
}
