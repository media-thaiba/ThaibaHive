import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/performance_provider.dart';
import '../widgets/evaluation_summary_card.dart';
import '../widgets/goal_card.dart';

class StaffPerformanceScreen extends ConsumerWidget {
  const StaffPerformanceScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final summary = ref.watch(staffPerformanceProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Performance & Goals'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            EvaluationSummaryCard(
              activeCycleTitle: summary.activeCycleTitle,
              status: summary.currentStatus,
              score: summary.latestScore,
              grade: summary.latestGrade,
            ),
            const SizedBox(height: 20),
            const Text(
              'My Quarterly Goals',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 8),
            const GoalCard(
              title: 'Complete Pedagogy Training Course',
              targetDate: '2026-10-15',
              progressPercentage: 60,
            ),
            const GoalCard(
              title: 'Publish Research Paper in Academic Journal',
              targetDate: '2026-12-01',
              progressPercentage: 35,
            ),
          ],
        ),
      ),
    );
  }
}
