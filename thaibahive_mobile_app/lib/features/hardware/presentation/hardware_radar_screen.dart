import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/hardware_provider.dart';

class HardwareRadarScreen extends ConsumerWidget {
  const HardwareRadarScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final musterAsync = ref.watch(musterSummaryProvider);
    final zonesAsync = ref.watch(hardwareZonesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Campus Hardware Radar'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              ref.invalidate(musterSummaryProvider);
              ref.invalidate(hardwareZonesProvider);
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(musterSummaryProvider);
          ref.invalidate(hardwareZonesProvider);
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Emergency Muster Summary Card
              musterAsync.when(
                data: (muster) {
                  if (muster == null) return const SizedBox.shrink();
                  final pct = muster.evacuationPercentage;
                  final isEvacComplete = pct >= 100.0;

                  return Card(
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    color: isEvacComplete
                        ? Colors.green.shade50
                        : Colors.orange.shade50,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(
                                isEvacComplete
                                    ? Icons.check_circle_outline
                                    : Icons.warning_amber_rounded,
                                color: isEvacComplete
                                    ? Colors.green.shade700
                                    : Colors.orange.shade800,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Emergency Muster Status',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isEvacComplete
                                      ? Colors.green.shade900
                                      : Colors.orange.shade900,
                                ),
                              ),
                              const Spacer(),
                              Text(
                                '${pct.toStringAsFixed(1)}%',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isEvacComplete
                                      ? Colors.green.shade900
                                      : Colors.orange.shade900,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(6),
                            child: LinearProgressIndicator(
                              value: (pct / 100.0).clamp(0.0, 1.0),
                              minHeight: 8,
                              backgroundColor: Colors.grey.shade300,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                isEvacComplete ? Colors.green : Colors.orange,
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              _MusterStatItem(
                                label: 'On Site',
                                value: '${muster.totalOccupantsOnSite}',
                                color: Colors.blueGrey.shade800,
                              ),
                              _MusterStatItem(
                                label: 'Accounted',
                                value: '${muster.accountedInMusterCount}',
                                color: Colors.green.shade800,
                              ),
                              _MusterStatItem(
                                label: 'Missing',
                                value: '${muster.missingOccupantsCount}',
                                color: muster.missingOccupantsCount > 0
                                    ? Colors.red.shade800
                                    : Colors.green.shade800,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
                loading: () => const LinearProgressIndicator(),
                error: (_, __) => const SizedBox.shrink(),
              ),
              const SizedBox(height: 16),

              // Visual 2D Radar Canvas Map Placeholder
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.radar, color: Colors.indigo),
                          const SizedBox(width: 8),
                          const Text(
                            'Live Spatial Blips',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.green.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                CircleAvatar(
                                  radius: 4,
                                  backgroundColor: Colors.green,
                                ),
                                SizedBox(width: 4),
                                Text(
                                  'Online',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.green,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Container(
                        height: 180,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: Colors.indigo.withValues(alpha: 0.3),
                          ),
                        ),
                        child: Stack(
                          children: [
                            // Radar concentric rings
                            Center(
                              child: Container(
                                width: 140,
                                height: 140,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.indigo.withValues(alpha: 0.2),
                                    width: 1,
                                  ),
                                ),
                              ),
                            ),
                            Center(
                              child: Container(
                                width: 80,
                                height: 80,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.indigo.withValues(alpha: 0.4),
                                    width: 1,
                                  ),
                                ),
                              ),
                            ),
                            // Center anchor
                            const Center(
                              child: Icon(
                                Icons.my_location,
                                color: Colors.indigoAccent,
                                size: 18,
                              ),
                            ),
                            // Simulated Beacon Blips
                            Positioned(
                              top: 40,
                              left: 60,
                              child: _RadarBlip(label: 'Gate A (Entry)'),
                            ),
                            Positioned(
                              bottom: 50,
                              right: 70,
                              child: _RadarBlip(label: 'Admin Block'),
                            ),
                            Positioned(
                              top: 90,
                              right: 40,
                              child: _RadarBlip(label: 'Muster Area 1'),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Campus Zones List
              const Text(
                'Campus Zones & Geofences',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),

              zonesAsync.when(
                data: (zones) {
                  if (zones.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Center(
                        child: Text(
                          'No hardware zones configured yet.',
                          style: TextStyle(color: Colors.grey.shade500),
                        ),
                      ),
                    );
                  }

                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: zones.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final zone = zones[index];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: zone.isMusterPoint
                              ? Colors.green.withValues(alpha: 0.1)
                              : Colors.indigo.withValues(alpha: 0.1),
                          child: Icon(
                            zone.isMusterPoint
                                ? Icons.emergency
                                : Icons.domain,
                            color: zone.isMusterPoint
                                ? Colors.green
                                : Colors.indigo,
                            size: 20,
                          ),
                        ),
                        title: Text(
                          zone.name,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          'Floor ${zone.floorNumber} • ${zone.type}${zone.isMusterPoint ? ' • Muster Point' : ''}',
                          style: const TextStyle(fontSize: 12),
                        ),
                        trailing: Icon(
                          Icons.chevron_right,
                          color: Colors.grey.shade400,
                        ),
                      );
                    },
                  );
                },
                loading: () => const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24.0),
                    child: CircularProgressIndicator(),
                  ),
                ),
                error: (e, _) => Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Text('Error loading zones: $e'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MusterStatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _MusterStatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 12,
            color: Colors.grey.shade700,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }
}

class _RadarBlip extends StatelessWidget {
  final String label;

  const _RadarBlip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: const BoxDecoration(
            color: Colors.tealAccent,
            shape: BoxShape.circle,
            boxShadow: [
              BoxShadow(
                color: Colors.tealAccent,
                blurRadius: 6,
                spreadRadius: 2,
              ),
            ],
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white70,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
