// Flutter Riverpod State Management for Campus Copilot (Sprint-047 KM-025)

class CopilotMessage {
  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final List<String> citations;

  CopilotMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.citations = const [],
  });

  CopilotMessage copyWith({
    String? id,
    String? text,
    bool? isUser,
    DateTime? timestamp,
    List<String>? citations,
  }) {
    return CopilotMessage(
      id: id ?? this.id,
      text: text ?? this.text,
      isUser: isUser ?? this.isUser,
      timestamp: timestamp ?? this.timestamp,
      citations: citations ?? this.citations,
    );
  }
}

class CopilotChatState {
  final List<CopilotMessage> messages;
  final bool isLoading;
  final String? errorMessage;
  final double? gpa;
  final int completedCredits;
  final int requiredCredits;

  const CopilotChatState({
    this.messages = const [],
    this.isLoading = false,
    this.errorMessage,
    this.gpa,
    this.completedCredits = 0,
    this.requiredCredits = 120,
  });

  CopilotChatState copyWith({
    List<CopilotMessage>? messages,
    bool? isLoading,
    String? errorMessage,
    double? gpa,
    int? completedCredits,
    int? requiredCredits,
  }) {
    return CopilotChatState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage ?? this.errorMessage,
      gpa: gpa ?? this.gpa,
      completedCredits: completedCredits ?? this.completedCredits,
      requiredCredits: requiredCredits ?? this.requiredCredits,
    );
  }
}
