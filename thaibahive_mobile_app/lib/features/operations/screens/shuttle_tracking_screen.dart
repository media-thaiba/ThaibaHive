import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/smart_campus_provider.dart';

class ShuttleTrackingScreen extends ConsumerWidget {
  const ShuttleTrackingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(smartCampusProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Autonomous Shuttle Tracking'),
        backgroundColor: Colors.indigo.shade900,
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(smartCampusProvider.notifier).fetchOperationsSummary(),
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    color: Colors.indigo.shade900,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Active Fleet Dispatches',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '${state.summary?.activeDispatches ?? 0} shuttles currently active',
                            style: TextStyle(color: Colors.indigo.shade200),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
