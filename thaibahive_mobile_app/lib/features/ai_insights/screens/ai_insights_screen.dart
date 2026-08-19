import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/ai_insights_provider.dart';
import '../widgets/early_warning_card.dart';

class AiInsightsScreen extends ConsumerWidget {
  const AiInsightsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(aiInsightsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Predictive Insights'),
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.read(aiInsightsProvider.notifier).refreshData();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                color: Colors.blue[50],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: const [
                          Icon(Icons.auto_awesome, color: Colors.blueAccent),
                          SizedBox(width: 8),
                          Text(
                            'AI Executive Summary',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.blueAccent),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        state.executiveSummary,
                        style: const TextStyle(fontSize: 13, color: Colors.black87, height: 1.4),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.0),
                child: Text(
                  'Predictive Metrics',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 8),
              EarlyWarningCard(
                title: '30-Day Projected Attendance',
                value: '${state.attendanceProjectionRate}%',
                category: 'Attendance Trajectory',
                badgeColor: state.attendanceProjectionRate >= 90 ? Colors.green : Colors.orange,
              ),
              EarlyWarningCard(
                title: 'Target Fee Realization',
                value: '${state.feeRealizationRate}%',
                category: 'Financial Forecast',
                badgeColor: Colors.blue,
              ),
              EarlyWarningCard(
                title: 'At-Risk Students Flagged',
                value: '${state.atRiskStudentCount}',
                category: 'Early Intervention Roster',
                badgeColor: state.atRiskStudentCount > 0 ? Colors.red : Colors.green,
              ),
              const SizedBox(height: 16),
              if (state.recommendedActions.isNotEmpty) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 4.0),
                  child: Text(
                    'Recommended Actions',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 8),
                ...state.recommendedActions.map(
                  (action) => Card(
                    elevation: 1,
                    margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 4),
                    child: ListTile(
                      leading: const Icon(Icons.check_circle_outline, color: Colors.green),
                      title: Text(action, style: const TextStyle(fontSize: 13)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

extension on AiInsightsNotifier {
  void refreshData() {
    // Refresh implementation
  }
}
