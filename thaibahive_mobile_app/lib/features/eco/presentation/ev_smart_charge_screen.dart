import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/eco_providers.dart';

class EvSmartChargeScreen extends ConsumerWidget {
  const EvSmartChargeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final stations = ref.watch(evStationsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart EV & V2G Fleet Hub'),
        backgroundColor: Colors.teal.shade900,
        foregroundColor: Colors.white,
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16.0),
        itemCount: stations.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (context, index) {
          final s = stations[index];
          final isV2G = s.status == 'v2g_active';

          return Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              side: BorderSide(
                color: isV2G ? Colors.amber.shade300 : Colors.grey.shade200,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              leading: CircleAvatar(
                backgroundColor: isV2G ? Colors.amber.shade100 : Colors.green.shade100,
                child: Icon(
                  isV2G ? Icons.bolt : Icons.ev_station,
                  color: isV2G ? Colors.amber.shade900 : Colors.green.shade900,
                ),
              ),
              title: Text(s.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text(
                '${s.availablePorts}/${s.totalPorts} Ports Free • Max ${s.maxPowerKw} kW • \$${s.tariffRatePerKwh}/kWh',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              trailing: Chip(
                label: Text(
                  s.status.toUpperCase().replaceAll('_', ' '),
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                ),
                backgroundColor: isV2G ? Colors.amber.shade100 : Colors.green.shade50,
              ),
            ),
          );
        },
      ),
    );
  }
}
