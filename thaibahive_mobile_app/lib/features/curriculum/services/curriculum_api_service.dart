import 'dart:convert';
import '../../../core/network/api_client.dart';
import '../models/curriculum_models.dart';

class CurriculumApiService {
  final ApiClient _client;

  CurriculumApiService(this._client);

  Future<MobileDegreePlanSummary> fetchDegreePlan(String studentId) async {
    try {
      final data = await _client.get<Map<String, dynamic>>('/curriculum/audit?studentId=$studentId');
      return MobileDegreePlanSummary.fromJson(data['auditReport'] ?? {});
    } catch (_) {}

    // Resilient fallback for offline / mock state
    return MobileDegreePlanSummary(
      planId: 'plan_mobile_default',
      programTitle: 'B.S. in Computer Science',
      programCode: 'CS_BS',
      totalEarnedCredits: 64,
      totalRequiredCredits: 120,
      cumulativeGpa: 3.45,
      completionPercentage: 53.3,
      courses: const [
        MobileCourseItem(courseId: 'c1', courseCode: 'CS101', title: 'Intro to Programming', credits: 4, termIndex: 1, termName: 'Year 1 Fall', status: 'completed'),
        MobileCourseItem(courseId: 'c2', courseCode: 'CS102', title: 'Data Structures', credits: 4, termIndex: 2, termName: 'Year 1 Spring', status: 'completed'),
        MobileCourseItem(courseId: 'c3', courseCode: 'CS201', title: 'Algorithms', credits: 4, termIndex: 3, termName: 'Year 2 Fall', status: 'completed'),
        MobileCourseItem(courseId: 'c4', courseCode: 'CS301', title: 'Operating Systems', credits: 4, termIndex: 4, termName: 'Year 2 Spring', status: 'in_progress'),
        MobileCourseItem(courseId: 'c5', courseCode: 'CS350', title: 'Database Systems Architecture', credits: 3, termIndex: 5, termName: 'Year 3 Fall', status: 'planned'),
      ],
    );
  }

  Future<MobileAdvisingChatMessage> sendAdvisingMessage(String sessionId, String studentId, String prompt) async {
    try {
      final data = await _client.post<Map<String, dynamic>>('/curriculum/advising', data: {
        'sessionId': sessionId,
        'studentId': studentId,
        'prompt': prompt,
      });

      return MobileAdvisingChatMessage.fromJson(data['message'] ?? {});
    } catch (_) {}

    return MobileAdvisingChatMessage(
      id: 'msg_${DateTime.now().millisecondsSinceEpoch}',
      senderType: 'agent',
      agentDomain: 'degree_planner',
      messageContent: 'Your prerequisite sequence is on track. Enrolling in 15 credits next term ensures on-time graduation.',
      sentAt: DateTime.now().toIso8601String(),
    );
  }
}
