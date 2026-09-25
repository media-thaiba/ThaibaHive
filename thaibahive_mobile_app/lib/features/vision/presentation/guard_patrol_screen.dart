import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/vision_providers.dart';

class GuardPatrolScreen extends ConsumerWidget {
  const GuardPatrolScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final tasks = ref.watch(guardPatrolProvider);
    final safetyStatus = ref.watch(campusSafetyStatusProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guard Patrol & Dispatch'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {},
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Card(
              color: Colors.blueGrey.shade900,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Live Patrol Status',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Guards on Duty: ${safetyStatus.guardsOnDuty} | Active Incidents: ${safetyStatus.activeIncidentsCount}',
                      style: const TextStyle(color: Colors.white70),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            const Text(
              'Assigned Emergency Dispatches',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (tasks.isEmpty)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: Text('No active dispatches. Patrol regular route.'),
                ),
              )
            else
              ...tasks.map((task) => Card(
                    margin: const EdgeInsets.only(bottom: 12.0),
                    child: ListTile(
                      leading: const Icon(Icons.warning, color: Colors.redAccent),
                      title: Text(task.threatType, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('${task.locationDescription}\nETA: ${task.etaSeconds}s | Status: ${task.status}'),
                      isThreeLine: true,
                      trailing: ElevatedButton(
                        onPressed: () {
                          ref.read(guardPatrolProvider.notifier).updateTaskStatus(task.dispatchId, 'on_scene');
                        },
                        child: const Text('Arrived'),
                      ),
                    ),
                  )),
          ],
        ),
      ),
    );
  }
}
