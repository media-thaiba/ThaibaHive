import 'package:flutter/material.dart';

class EvaluationSummaryCard extends StatelessWidget {
  final String activeCycleTitle;
  final String status;
  final double score;
  final String grade;

  const EvaluationSummaryCard({
    Key? key,
    required this.activeCycleTitle,
    required this.status,
    required this.score,
    required this.grade,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Colors.blue.shade50,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(activeCycleTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 4),
            Text('Current Status: ${status.toUpperCase()}', style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.w600, fontSize: 12)),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text('Score: $score / 5.0', style: const TextStyle(fontSize: 14)),
                Chip(
                  label: Text('Grade $grade', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  backgroundColor: Colors.emerald,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
