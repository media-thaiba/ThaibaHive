import 'package:flutter_riverpod/flutter_riverpod.dart';

class AiInsightsState {
  final String executiveSummary;
  final int attendanceProjectionRate;
  final int feeRealizationRate;
  final int atRiskStudentCount;
  final int activeAnomaliesCount;
  final List<String> recommendedActions;

  AiInsightsState({
    required this.executiveSummary,
    required this.attendanceProjectionRate,
    required this.feeRealizationRate,
    required this.atRiskStudentCount,
    required this.activeAnomaliesCount,
    required this.recommendedActions,
  });
}

final aiInsightsProvider = StateNotifierProvider<AiInsightsNotifier, AiInsightsState>((ref) {
  return AiInsightsNotifier();
});

class AiInsightsNotifier extends StateNotifier<AiInsightsState> {
  AiInsightsNotifier()
      : super(
          AiInsightsState(
            executiveSummary: 'Overall campus attendance projection for the next 30 days is 92%. Fee collection realization is projected at 94%. Operational metrics remain within nominal baseline limits.',
            attendanceProjectionRate: 92,
            feeRealizationRate: 94,
            atRiskStudentCount: 2,
            activeAnomaliesCount: 0,
            recommendedActions: ['Schedule counselor intervention for flagged attendance risks.'],
          ),
        );

  void updateBriefing({
    required String executiveSummary,
    required int attendanceRate,
    required int feeRate,
    required int atRiskCount,
    required int anomaliesCount,
    required List<String> actions,
  }) {
    state = AiInsightsState(
      executiveSummary: executiveSummary,
      attendanceProjectionRate: attendanceRate,
      feeRealizationRate: feeRate,
      atRiskStudentCount: atRiskCount,
      activeAnomaliesCount: anomaliesCount,
      recommendedActions: actions,
    );
  }
}
