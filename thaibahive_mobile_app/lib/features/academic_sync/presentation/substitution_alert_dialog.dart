import 'package:flutter/material.dart';
import '../domain/academic_schedule_model.dart';

class SubstitutionAlertDialog extends StatelessWidget {
  final MobileTimetableSlot slot;
  final VoidCallback onAcknowledge;

  const SubstitutionAlertDialog({
    Key? key,
    required this.slot,
    required this.onAcknowledge,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: const [
          Icon(Icons.notification_important, color: Colors.orange),
          SizedBox(width: 8),
          Text('Substitution Alert'),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Slot: ${slot.startTime} - ${slot.endTime} (${slot.roomNumber ?? 'Classroom'})',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text('Subject: ${slot.subjectName}'),
          const SizedBox(height: 4),
          Text(
            'Substitute Teacher: ${slot.substituteTeacherName ?? 'Assigned Faculty'}',
            style: const TextStyle(color: Colors.blueAccent, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 12),
          const Text(
            'Please proceed to the assigned room ahead of schedule.',
            style: TextStyle(fontSize: 12, color: Colors.grey),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            onAcknowledge();
          },
          child: const Text('Acknowledge'),
        ),
      ],
    );
  }
}
