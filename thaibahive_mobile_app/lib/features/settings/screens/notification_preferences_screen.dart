import 'package:flutter/material.dart';

class NotificationPreferencesScreen extends StatefulWidget {
  const NotificationPreferencesScreen({super.key});

  @override
  State<NotificationPreferencesScreen> createState() => _NotificationPreferencesScreenState();
}

class _NotificationPreferencesScreenState extends State<NotificationPreferencesScreen> {
  bool _approvals = true;
  bool _attendance = true;
  bool _examinations = true;
  bool _announcements = true;

  @override
  Widget build(BuildContext context) {
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
            title: const Text('Staff & Student Attendance Alerts'),
            subtitle: const Text('Daily check-in reminders and student absence alerts'),
            value: _attendance,
            onChanged: (val) => setState(() => _attendance = val),
          ),
          const Divider(),
          SwitchListTile(
            title: const Text('Examinations & Report Cards'),
            subtitle: const Text('Hall ticket updates and published exam result alerts'),
            value: _examinations,
            onChanged: (val) => setState(() => _examinations = val),
          ),
          const Divider(),
          SwitchListTile(
            title: const Text('Campus Announcements & Circulars'),
            subtitle: const Text('Emergency notices and institution circulars'),
            value: _announcements,
            onChanged: (val) => setState(() => _announcements = val),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Notification preferences saved successfully!'),
                  backgroundColor: Colors.green,
                ),
              );
            },
            child: const Text('Save Preferences'),
          ),
        ],
      ),
    );
  }
}
