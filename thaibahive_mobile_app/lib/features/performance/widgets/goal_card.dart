import 'package:flutter/material.dart';

class GoalCard extends StatelessWidget {
  final String title;
  final String targetDate;
  final double progressPercentage;

  const GoalCard({
    Key? key,
    required this.title,
    required this.targetDate,
    required this.progressPercentage,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6.0),
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text('Due: $targetDate', style: const TextStyle(color: Colors.grey, fontSize: 12)),
              ],
            ),
            const SizedBox(height: 8),
            LinearProgressIndicator(value: progressPercentage / 100.0),
            const SizedBox(height: 4),
            Align(
              alignment: Alignment.centerRight,
              child: Text('${progressPercentage.toInt()}% Completed', style: const TextStyle(fontSize: 11, color: Colors.grey)),
            ),
          ],
        ),
      ),
    );
  }
}
