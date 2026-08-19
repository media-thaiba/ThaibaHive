import 'package:flutter_riverpod/flutter_riverpod.dart';

class StaffPerformanceSummary {
  final String activeCycleTitle;
  final String selfAssessmentDueDate;
  final String currentStatus;
  final double latestScore;
  final String latestGrade;
  final int goalsCount;

  StaffPerformanceSummary({
    required this.activeCycleTitle,
    required this.selfAssessmentDueDate,
    required this.currentStatus,
    required this.latestScore,
    required this.latestGrade,
    required this.goalsCount,
  });
}

final staffPerformanceProvider = StateNotifierProvider<StaffPerformanceNotifier, StaffPerformanceSummary>((ref) {
  return StaffPerformanceNotifier();
});

class StaffPerformanceNotifier extends StateNotifier<StaffPerformanceSummary> {
  StaffPerformanceNotifier()
      : super(
          StaffPerformanceSummary(
            activeCycleTitle: '2026 Q3 Staff Appraisal',
            selfAssessmentDueDate: '2026-08-15',
            currentStatus: 'self_assessment',
            latestScore: 4.5,
            latestGrade: 'A+',
            goalsCount: 2,
          ),
        );

  void refreshPerformanceData() {
    state = StaffPerformanceSummary(
      activeCycleTitle: state.activeCycleTitle,
      selfAssessmentDueDate: state.selfAssessmentDueDate,
      currentStatus: 'manager_review',
      latestScore: state.latestScore,
      latestGrade: state.latestGrade,
      goalsCount: state.goalsCount,
    );
  }
}
