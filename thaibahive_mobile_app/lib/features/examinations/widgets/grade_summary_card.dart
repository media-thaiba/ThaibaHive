import 'package:flutter/material.dart';

class GradeSummaryCard extends StatelessWidget {
  final double sgpa;
  final double cgpa;
  final String status;
  final int totalCredits;

  const GradeSummaryCard({
    super.key,
    required this.sgpa,
    required this.cgpa,
    required this.status,
    required this.totalCredits,
  });

  @override
  Widget build(BuildContext context) {
    final isPassed = status.toLowerCase() == 'passed' || status.toLowerCase() == 'cleared';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.indigo.shade800, Colors.indigo.shade600],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.indigo.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Academic Standing',
                style: TextStyle(color: Colors.white70, fontSize: 14),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isPassed ? Colors.green.shade600 : Colors.red.shade600,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  status.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _metricTile('Semester SGPA', sgpa.toStringAsFixed(2)),
              Container(height: 30, width: 1, color: Colors.white24),
              _metricTile('Cumulative CGPA', cgpa.toStringAsFixed(2)),
              Container(height: 30, width: 1, color: Colors.white24),
              _metricTile('Credits Earned', '$totalCredits'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _metricTile(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 22,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(color: Colors.white70, fontSize: 11),
        ),
      ],
    );
  }
}
