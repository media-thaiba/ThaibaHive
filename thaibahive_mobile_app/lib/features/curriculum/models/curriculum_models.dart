class MobileCourseItem {
  final String courseId;
  final String courseCode;
  final String title;
  final int credits;
  final int termIndex;
  final String termName;
  final String status;
  final bool hasPrereqViolation;

  const MobileCourseItem({
    required this.courseId,
    required this.courseCode,
    required this.title,
    required this.credits,
    required this.termIndex,
    required this.termName,
    this.status = 'planned',
    this.hasPrereqViolation = false,
  });

  factory MobileCourseItem.fromJson(Map<String, dynamic> json) {
    return MobileCourseItem(
      courseId: json['courseId'] ?? json['id'] ?? '',
      courseCode: json['courseCode'] ?? '',
      title: json['title'] ?? '',
      credits: json['credits'] ?? 3,
      termIndex: json['plannedTermIndex'] ?? json['termIndex'] ?? 1,
      termName: json['termName'] ?? 'Term 1',
      status: json['status'] ?? 'planned',
      hasPrereqViolation: json['hasPrereqViolation'] ?? false,
    );
  }
}

class MobileDegreePlanSummary {
  final String planId;
  final String programTitle;
  final String programCode;
  final int totalEarnedCredits;
  final int totalRequiredCredits;
  final double cumulativeGpa;
  final double completionPercentage;
  final List<MobileCourseItem> courses;

  const MobileDegreePlanSummary({
    required this.planId,
    required this.programTitle,
    required this.programCode,
    required this.totalEarnedCredits,
    required this.totalRequiredCredits,
    required this.cumulativeGpa,
    required this.completionPercentage,
    required this.courses,
  });

  factory MobileDegreePlanSummary.fromJson(Map<String, dynamic> json) {
    final rawCourses = json['courses'] as List<dynamic>? ?? [];
    return MobileDegreePlanSummary(
      planId: json['planId'] ?? 'plan_default',
      programTitle: json['programTitle'] ?? 'B.S. in Computer Science',
      programCode: json['programCode'] ?? 'CS_BS',
      totalEarnedCredits: json['totalEarnedCredits'] ?? 64,
      totalRequiredCredits: json['totalRequiredCredits'] ?? 120,
      cumulativeGpa: (json['cumulativeGpa'] as num?)?.toDouble() ?? 3.42,
      completionPercentage: (json['completionPercentage'] as num?)?.toDouble() ?? 53.3,
      courses: rawCourses.map((c) => MobileCourseItem.fromJson(c as Map<String, dynamic>)).toList(),
    );
  }
}

class MobileAdvisingChatMessage {
  final String id;
  final String senderType; // 'student' or 'agent'
  final String? agentDomain;
  final String messageContent;
  final String sentAt;

  const MobileAdvisingChatMessage({
    required this.id,
    required this.senderType,
    this.agentDomain,
    required this.messageContent,
    required this.sentAt,
  });

  factory MobileAdvisingChatMessage.fromJson(Map<String, dynamic> json) {
    return MobileAdvisingChatMessage(
      id: json['id'] ?? '',
      senderType: json['senderType'] ?? 'agent',
      agentDomain: json['agentDomain'],
      messageContent: json['messageContent'] ?? '',
      sentAt: json['sentAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}
