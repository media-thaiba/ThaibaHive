import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'remediation_alert_service.dart';

class RemediationAlertScreen extends ConsumerWidget {
  const RemediationAlertScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alertsAsync = ref.watch(remediationAlertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Autonomous Remediation Tasks'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(remediationAlertsProvider),
          ),
        ],
      ),
      body: alertsAsync.when(
        data: (alerts) {
          if (alerts.isEmpty) {
            return const Center(
              child: Text('No active self-healing remediation tasks.'),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.refresh(remediationAlertsProvider),
            child: ListView.builder(
              itemCount: alerts.length,
              itemBuilder: (context, index) {
                final item = alerts[index];
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: item.severity == 'critical'
                          ? Colors.red.shade100
                          : Colors.amber.shade100,
                      child: Icon(
                        Icons.auto_fix_high,
                        color: item.severity == 'critical' ? Colors.red : Colors.amber.shade900,
                      ),
                    ),
                    title: Text(
                      item.title,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text('Status: ${item.status.toUpperCase()} • Category: ${item.category}'),
                    trailing: Chip(
                      label: Text(item.severity.toUpperCase()),
                      backgroundColor: item.severity == 'critical'
                          ? Colors.red.shade50
                          : Colors.amber.shade50,
                    ),
                  ),
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(
          child: Text('Error loading alerts: $err'),
        ),
      ),
    );
  }
}
