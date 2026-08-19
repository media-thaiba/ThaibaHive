import 'package:flutter/material.dart';
import '../providers/attendance_provider.dart';

class StudentRosterScreen extends StatefulWidget {
  const StudentRosterScreen({super.key});

  @override
  State<StudentRosterScreen> createState() => _StudentRosterScreenState();
}

class _StudentRosterScreenState extends State<StudentRosterScreen> {
  final List<StudentRosterItem> _students = [
    StudentRosterItem(id: 's1', name: 'Aadhavan Kumar', rollNo: 'CS-01', status: 'present'),
    StudentRosterItem(id: 's2', name: 'Ayesha Rahman', rollNo: 'CS-02', status: 'present'),
    StudentRosterItem(id: 's3', name: 'Bilal Hassan', rollNo: 'CS-03', status: 'absent'),
    StudentRosterItem(id: 's4', name: 'Devika Nair', rollNo: 'CS-04', status: 'present'),
    StudentRosterItem(id: 's5', name: 'Farhan Ali', rollNo: 'CS-05', status: 'late'),
  ];

  void _updateStatus(int index, String newStatus) {
    setState(() {
      _students[index].status = newStatus;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Roster Attendance'),
        actions: [
          IconButton(
            icon: const Icon(Icons.save),
            tooltip: 'Save Attendance Roster',
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Student attendance roster saved & synced.'),
                  backgroundColor: Colors.green,
                ),
              );
            },
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _students.length,
        itemBuilder: (context, index) {
          final student = _students[index];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(12.0),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: Colors.indigo.shade100,
                    child: Text(student.rollNo, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      student.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
                  ),
                  Row(
                    children: [
                      _statusChip(index, 'present', 'P', Colors.green, student.status == 'present'),
                      const SizedBox(width: 4),
                      _statusChip(index, 'late', 'L', Colors.orange, student.status == 'late'),
                      const SizedBox(width: 4),
                      _statusChip(index, 'absent', 'A', Colors.red, student.status == 'absent'),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _statusChip(int index, String statusKey, String label, Color color, bool isSelected) {
    return GestureDetector(
      onTap: () => _updateStatus(index, statusKey),
      child: Container(
        width: 32,
        height: 32,
        decoration: BoxDecoration(
          color: isSelected ? color : Colors.grey.shade200,
          shape: BoxShape.circle,
        ),
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : Colors.black87,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ),
    );
  }
}
