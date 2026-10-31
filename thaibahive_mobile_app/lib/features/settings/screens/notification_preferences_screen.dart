import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:permission_handler/permission_handler.dart';
import '../../../features/auth/data/auth_state.dart';
import '../../../features/attendance/data/services/attendance_reminder_service.dart';

class NotificationPreferencesScreen extends ConsumerStatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  ConsumerState<NotificationPreferencesScreen> createState() =>
      _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState
    extends ConsumerState<NotificationPreferencesScreen> {
  bool _approvals = true;
  bool _attendance = false;
  bool _examinations = true;
  bool _announcements = true;

  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => _loadSettings());
  }

  Future<void> _loadSettings() async {
    final user = ref.read(authProvider).user;
    final userId = user?.id;
    final reminderService = ref.read(attendanceReminderServiceProvider);

    await reminderService.initialize();

    final isEnabled = reminderService.isReminderEnabled(userId);

    // Also check OS permission status
    final status = await Permission.notification.status;
    final osGranted = status.isGranted;

    if (mounted) {
      setState(() {
        _attendance = isEnabled && osGranted;
        _initialized = true;
      });
    }
  }

  Future<void> _toggleAttendance(bool val) async {
    final user = ref.read(authProvider).user;
    final userId = user?.id;
    final reminderService = ref.read(attendanceReminderServiceProvider);

    if (val) {
      // Check and request runtime notification permission
      final status = await Permission.notification.status;
      if (status.isPermanentlyDenied) {
        if (!mounted) return;
        final shouldOpen = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Notifications Blocked'),
            content: const Text(
              'Notification permission is permanently disabled. Please enable notifications in your phone system settings to receive shift reminders.',
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('Cancel'),
              ),
              FilledButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                child: const Text('Open Settings'),
              ),
            ],
          ),
        );
        if (shouldOpen == true) {
          await openAppSettings();
        }
        return;
      }

      if (!status.isGranted) {
        final req = await Permission.notification.request();
        if (!req.isGranted) {
          setState(() => _attendance = false);
          return;
        }
      }

      await reminderService.setReminderEnabled(userId, true);
      setState(() => _attendance = true);
    } else {
      await reminderService.setReminderEnabled(userId, false);
      setState(() => _attendance = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_initialized) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Settings'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 8.0),
            child: Text(
              'Manage Mobile Push Notification Alerts',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
          ),
          SwitchListTile(
            title: const Text('Financial Approvals & Vouchers'),
            subtitle: const Text('Real-time alerts when vouchers require authorization'),
            value: _approvals,
            onChanged: (val) => setState(() => _approvals = val),
          ),
          const Divider(),
          SwitchListTile(
            title: const Text('Staff Shift & Check-In Reminders'),
            subtitle: const Text(
              'Morning 15m check-in alert, 10m nudge, and shift checkout notification on lockscreen based on your assigned shift',
            ),
            value: _attendance,
            onChanged: _toggleAttendance,
          ),
          const Divider(),
          SwitchListTile(
            title: const Text('Examinations & Report Cards'),
            subtitle: const Text('Publish alerts and moderation triggers'),
            value: _examinations,
            onChanged: (val) => setState(() => _examinations = val),
          ),
          const Divider(),
          SwitchListTile(
            title: const Text('Institutional Circulars & News'),
            subtitle: const Text('Emergency updates and campus-wide notices'),
            value: _announcements,
            onChanged: (val) => setState(() => _announcements = val),
          ),
        ],
      ),
    );
  }
}
