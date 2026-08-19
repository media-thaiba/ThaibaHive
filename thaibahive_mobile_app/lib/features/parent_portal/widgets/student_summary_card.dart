import 'package:flutter/material.dart';

class StudentSummaryCard extends StatelessWidget {
  final String studentName;
  final String grade;
  final String registerNumber;
  final double attendancePercentage;
  final double pendingFeeBalance;
  final double latestSgpa;

  const StudentSummaryCard({
    super.key,
    required this.studentName,
    required this.grade,
    required this.registerNumber,
    required this.attendancePercentage,
    required this.pendingFeeBalance,
    required this.latestSgpa,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: Colors.indigo.shade100,
                  child: Text(
                    studentName.isNotEmpty ? studentName.substring(0, 1) : 'S',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.indigo.shade900,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        studentName,
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        '$grade | Reg: $registerNumber',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(height: 28),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _statTile(
                  'Attendance',
                  '${attendancePercentage.toStringAsFixed(1)}%',
                  attendancePercentage >= 85 ? Colors.green : Colors.red,
                ),
                _statTile(
                  'Term SGPA',
                  latestSgpa.toStringAsFixed(2),
                  Colors.indigo,
                ),
                _statTile(
                  'Fee Dues',
                  '\$${pendingFeeBalance.toStringAsFixed(0)}',
                  pendingFeeBalance == 0 ? Colors.green : Colors.red,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _statTile(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
      ],
    );
  }
}
