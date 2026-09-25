import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/eco_providers.dart';

class CampusEnergyRadarScreen extends ConsumerWidget {
  const CampusEnergyRadarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final energyAsync = ref.watch(campusEnergyProvider);
    final passport = ref.watch(carbonPassportProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Campus Net-Zero Radar'),
        backgroundColor: Colors.teal.shade900,
        foregroundColor: Colors.white,
      ),
      body: energyAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error: $err')),
        data: (snap) => SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Clean Energy Share Card
              Card(
                color: Colors.green.shade50,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  side: BorderSide(color: Colors.green.shade200),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    children: [
                      Text(
                        '${snap.cleanEnergySharePercent}%',
                        style: TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.w900,
                          color: Colors.green.shade900,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Clean Solar & BESS Power Share',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.green.shade700,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _MetricSubItem(label: 'Solar PV', value: '${snap.totalSolarKw} kW'),
                          _MetricSubItem(label: 'Facility Load', value: '${snap.totalFacilityLoadKw} kW'),
                          _MetricSubItem(label: 'Grid Carbon', value: '${snap.realtimeCarbonGrams} g/kWh'),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              // Carbon Passport Card
              Card(
                  elevation: 1,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'My Carbon Passport',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            Chip(
                              label: Text('${passport.greenPoints} Green Points'),
                              backgroundColor: Colors.green.shade100,
                            ),
                          ],
                        ),
                      const SizedBox(height: 8),
                      Text(
                        'Avoided ${passport.carbonSavedKg} kg CO2e through sustainable campus commute & habits.',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade700),
                      ),
                      const SizedBox(height: 12),
                      Wrap(
                        spacing: 8,
                        children: passport.badges.map((b) => Chip(
                          label: Text(b, style: const TextStyle(fontSize: 11)),
                          backgroundColor: Colors.teal.shade50,
                        )).toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MetricSubItem extends StatelessWidget {
  final String label;
  final String value;

  const _MetricSubItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        const SizedBox(height: 2),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
      ],
    );
  }
}
