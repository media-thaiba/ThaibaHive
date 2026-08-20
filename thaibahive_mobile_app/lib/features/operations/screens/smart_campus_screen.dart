import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/smart_campus_provider.dart';

class SmartCampusScreen extends ConsumerWidget {
  const SmartCampusScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(smartCampusProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart Campus & Operations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(smartCampusProvider.notifier).fetchOperationsSummary(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(smartCampusProvider.notifier).fetchOperationsSummary(),
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // Operations Radar Hero
                  Card(
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'AIMS Autonomous Radar',
                                style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                              ),
                              Chip(
                                label: const Text('Autonomous', style: TextStyle(fontSize: 10)),
                                backgroundColor: Colors.green.withAlpha(50),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _buildMetricTile(
                                context,
                                icon: Icons.bolt,
                                color: Colors.amber,
                                value: '${state.summary?.energySavedKwh.toStringAsFixed(1) ?? "0"} kWh',
                                label: 'Energy Saved',
                              ),
                              _buildMetricTile(
                                context,
                                icon: Icons.directions_bus,
                                color: Colors.indigo,
                                value: '${state.summary?.activeDispatches ?? 0}',
                                label: 'Dispatches',
                              ),
                              _buildMetricTile(
                                context,
                                icon: Icons.fingerprint,
                                color: Colors.teal,
                                value: '${state.summary?.biometricPunches ?? 0}',
                                label: 'ZKP Punches',
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Shared Campus Resources Header
                  Text(
                    'Cross-Campus Shared Resources',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),

                  ...state.resources.map(
                    (res) => Card(
                      margin: const EdgeInsets.only(bottom: 8.0),
                      child: ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.hub, size: 20),
                        ),
                        title: Text(res.name),
                        subtitle: Text(
                          '${res.category} · Capacity: ${res.capacityUnits} units',
                          style: const TextStyle(fontSize: 12),
                        ),
                        trailing: Text(
                          '\$${res.hourlyCostRateDollars.toStringAsFixed(0)}/hr',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildMetricTile(
    BuildContext context, {
    required IconData icon,
    required Color color,
    required String value,
    required String label,
  }) {
    return Column(
      children: [
        Icon(icon, color: color, size: 24),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
        Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey)),
      ],
    );
  }
}
