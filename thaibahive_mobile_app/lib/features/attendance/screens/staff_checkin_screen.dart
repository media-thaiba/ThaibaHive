import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/attendance_provider.dart';

class StaffCheckinScreen extends ConsumerWidget {
  const StaffCheckinScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(attendanceProvider);
    final notifier = ref.read(attendanceProvider.notifier);

    final isCheckedIn = state.stats?.todayStatus == 'present' &&
        (state.lastAction?.checkOut == null && !state.isOfflineCheckOut);
    final checkInTime = state.lastAction?.checkIn ??
        (state.logs.isNotEmpty ? state.logs.first.checkIn : null);
    final checkOutTime = state.lastAction?.checkOut ??
        (state.logs.isNotEmpty ? state.logs.first.checkOut : null);

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
                color: isCheckedIn ? Colors.green.shade50 : Colors.blue.shade50,
                border: Border.all(
                  color: isCheckedIn ? Colors.green : Colors.blue,
                  width: 3,
                ),
              ),
              child: Icon(
                isCheckedIn ? Icons.access_time_filled : Icons.access_time,
                size: 72,
                color: isCheckedIn ? Colors.green : Colors.blue,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              isCheckedIn ? 'Checked In' : 'Not Checked In',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: isCheckedIn ? Colors.green.shade800 : Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isCheckedIn
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
                          checkInTime != null && checkInTime.length >= 5
                              ? checkInTime
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
                          checkOutTime != null && checkOutTime.length >= 5
                              ? checkOutTime
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
                  backgroundColor: isCheckedIn ? Colors.red : Colors.green,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  if (isCheckedIn) {
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
                icon: Icon(isCheckedIn ? Icons.logout : Icons.login),
                label: Text(
                  isCheckedIn ? 'Check Out' : 'Check In Now',
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
