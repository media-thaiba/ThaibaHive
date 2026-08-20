import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/smart_campus_provider.dart';

class CampusResourceBookingScreen extends ConsumerWidget {
  const CampusResourceBookingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(smartCampusProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Campus Resource Mesh'),
        backgroundColor: Colors.indigo.shade900,
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: state.resources.length,
              itemBuilder: (context, idx) {
                final res = state.resources[idx];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    leading: const Icon(Icons.hub, color: Colors.indigoAccent),
                    title: Text(res.name, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${res.category} · Capacity: ${res.capacityUnits}'),
                    trailing: Text('\$${res.hourlyCostRateDollars.toStringAsFixed(0)}/hr'),
                  ),
                );
              },
            ),
    );
  }
}
