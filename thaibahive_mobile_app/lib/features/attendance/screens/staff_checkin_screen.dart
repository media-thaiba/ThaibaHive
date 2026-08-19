import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/attendance_provider.dart';

class StaffCheckinScreen extends ConsumerWidget {
  const StaffCheckinScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = ref.watch(attendanceProvider);
    final notifier = ref.read(attendanceProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff Mobile Check-In'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: status.isCheckedIn ? Colors.green.shade50 : Colors.blue.shade50,
                border: Border.all(
                  color: status.isCheckedIn ? Colors.green : Colors.blue,
                  width: 3,
                ),
              ),
              child: Icon(
                status.isCheckedIn ? Icons.access_time_filled : Icons.access_time,
                size: 72,
                color: status.isCheckedIn ? Colors.green : Colors.blue,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              status.isCheckedIn ? 'Checked In' : 'Not Checked In',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: status.isCheckedIn ? Colors.green.shade800 : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              status.isCheckedIn
                  ? 'Active shift started. Tap below to check out.'
                  : 'Tap below to record your campus attendance check-in.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14),
            ),
            const SizedBox(height: 32),
            Card(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Check-in Time:'),
                        Text(
                          status.checkInTime != null
                              ? status.checkInTime!.substring(11, 16)
                              : '--:--',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Check-out Time:'),
                        Text(
                          status.checkOutTime != null
                              ? status.checkOutTime!.substring(11, 16)
                              : '--:--',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 40),
            SizedBox(
              width: double.infinity,
              height: 54,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: status.isCheckedIn ? Colors.red : Colors.green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  if (status.isCheckedIn) {
                    await notifier.checkOut();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Checked out successfully.')),
                      );
                    }
                  } else {
                    await notifier.checkIn();
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Checked in successfully.')),
                      );
                    }
                  }
                },
                icon: Icon(status.isCheckedIn ? Icons.logout : Icons.login),
                label: Text(
                  status.isCheckedIn ? 'Check Out' : 'Check In Now',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
