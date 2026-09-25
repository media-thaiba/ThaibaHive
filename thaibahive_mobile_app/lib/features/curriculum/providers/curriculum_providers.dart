import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/network/providers.dart';
import '../models/curriculum_models.dart';
import '../services/curriculum_api_service.dart';

final curriculumApiServiceProvider = Provider<CurriculumApiService>((ref) {
  final client = ref.watch(apiClientProvider);
  return CurriculumApiService(client);
});

final studentDegreePlanProvider = FutureProvider.family<MobileDegreePlanSummary, String>((ref, studentId) async {
  final apiService = ref.watch(curriculumApiServiceProvider);
  return apiService.fetchDegreePlan(studentId);
});

class MobileAdvisingChatNotifier extends StateNotifier<List<MobileAdvisingChatMessage>> {
  final CurriculumApiService _apiService;
  final String sessionId;
  final String studentId;

  MobileAdvisingChatNotifier(this._apiService, this.sessionId, this.studentId)
      : super([
          MobileAdvisingChatMessage(
            id: 'init_msg',
            senderType: 'agent',
            agentDomain: 'degree_planner',
            messageContent: 'Hello! I am your AI Academic Advisor. Ask me anything about course prerequisites, career electives, or degree completion!',
            sentAt: DateTime.now().toIso8601String(),
          ),
        ]);

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    final studentMsg = MobileAdvisingChatMessage(
      id: 'stud_${DateTime.now().millisecondsSinceEpoch}',
      senderType: 'student',
      messageContent: text,
      sentAt: DateTime.now().toIso8601String(),
    );

    state = [...state, studentMsg];

    final reply = await _apiService.sendAdvisingMessage(sessionId, studentId, text);
    state = [...state, reply];
  }
}

final advisingChatStateProvider = StateNotifierProvider.family<MobileAdvisingChatNotifier, List<MobileAdvisingChatMessage>, String>((ref, sessionId) {
  final apiService = ref.watch(curriculumApiServiceProvider);
  return MobileAdvisingChatNotifier(apiService, sessionId, 'stud_mobile_user');
});
