import 'package:flutter/material.dart';
import '../../auth/screens/web_view_handoff_screen.dart';
import '../../examinations/screens/report_card_screen.dart';
import '../widgets/multi_child_selector.dart';
import '../widgets/student_summary_card.dart';

class ParentDashboardScreen extends StatefulWidget {
  const ParentDashboardScreen({super.key});

  @override
  State<ParentDashboardScreen> createState() => _ParentDashboardScreenState();
}

class _ParentDashboardScreenState extends State<ParentDashboardScreen> {
  final List<ChildSummary> _children = [
    ChildSummary(id: 'STD-1001', name: 'Zayd Mohammed', grade: 'Grade 10 - Sec A'),
    ChildSummary(id: 'STD-1002', name: 'Sara Mohammed', grade: 'Grade 6 - Sec B'),
  ];

  late ChildSummary _selectedChild;

  @override
  void initState() {
    super.initState();
    _selectedChild = _children.first;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent Portal Companion'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Enrolled Children',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black54),
            ),
            const SizedBox(height: 8),
            MultiChildSelector(
              children: _children,
              selectedChildId: _selectedChild.id,
              onSelected: (child) {
                setState(() {
                  _selectedChild = child;
                });
              },
            ),
            const SizedBox(height: 16),
            StudentSummaryCard(
              studentName: _selectedChild.name,
              grade: _selectedChild.grade,
              registerNumber: 'TH-2026-${_selectedChild.id}',
              attendancePercentage: 96.5,
              pendingFeeBalance: 0.0,
              latestSgpa: 9.40,
            ),
            const SizedBox(height: 24),
            const Text(
              'Parent Quick Actions',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      backgroundColor: Colors.indigo,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => ReportCardScreen(studentId: _selectedChild.id),
                        ),
                      );
                    },
                    icon: const Icon(Icons.assessment),
                    label: const Text('Report Cards'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(
                          builder: (_) => const WebViewHandoffScreen(
                            targetUrl: '/finance/payments',
                            title: 'Pay Dues Online',
                          ),
                        ),
                      );
                    },
                    icon: const Icon(Icons.payment),
                    label: const Text('Pay Fees'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
