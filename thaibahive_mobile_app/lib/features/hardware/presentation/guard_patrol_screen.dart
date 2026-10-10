import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/hardware_provider.dart';

class GuardPatrolScreen extends ConsumerStatefulWidget {
  const GuardPatrolScreen({super.key});

  @override
  ConsumerState<GuardPatrolScreen> createState() => _GuardPatrolScreenState();
}

class _GuardPatrolScreenState extends ConsumerState<GuardPatrolScreen> {
  final _checkpointController = TextEditingController();
  String _selectedZoneId = '';
  String _selectedZoneName = '';

  @override
  void dispose() {
    _checkpointController.dispose();
    super.dispose();
  }

  Future<void> _handleScan(String method) async {
    final checkpointId = _checkpointController.text.trim().isEmpty
        ? 'NFC-GUARD-CP-${DateTime.now().millisecondsSinceEpoch % 10000}'
        : _checkpointController.text.trim();

    final zoneId = _selectedZoneId.isEmpty ? 'hwz_main_gate' : _selectedZoneId;
    final zoneName = _selectedZoneName.isEmpty ? 'Main Campus Gate' : _selectedZoneName;

    final success = await ref.read(patrolNotifierProvider.notifier).scanCheckpoint(
      checkpointId: checkpointId,
      zoneId: zoneId,
      zoneName: zoneName,
      deviceId: 'dev_mobile_guard_handheld',
      method: method,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success
              ? 'Checkpoint logged: $checkpointId ($zoneName)'
              : 'Checkpoint logged offline. Will sync when connected.',
          ),
          backgroundColor: success ? Colors.green : Colors.amber.shade800,
        ),
      );
      _checkpointController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final patrolState = ref.watch(patrolNotifierProvider);
    final zonesAsync = ref.watch(hardwareZonesProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Guard Patrol Mode'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(hardwareZonesProvider),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Active Shift Status Card
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.security,
                        color: Colors.green,
                        size: 32,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Active Patrol Shift',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${patrolState.recentScans.length} Checkpoints Cleared Today',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Checkpoint Scanner Action Box
            Card(
              elevation: 1,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Log Checkpoint Transit',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Zone Dropdown Selector
                    zonesAsync.when(
                      data: (zones) {
                        return DropdownButtonFormField<String>(
                          decoration: const InputDecoration(
                            labelText: 'Current Sector / Zone',
                            border: OutlineInputBorder(),
                            prefixIcon: Icon(Icons.location_on),
                          ),
                          initialValue: zones.isNotEmpty ? zones.first.id : null,
                          items: zones.map((z) {
                            return DropdownMenuItem(
                              value: z.id,
                              child: Text('${z.name} (L${z.floorNumber})'),
                            );
                          }).toList(),
                          onChanged: (val) {
                            if (val != null) {
                              final z = zones.firstWhere((item) => item.id == val);
                              setState(() {
                                _selectedZoneId = z.id;
                                _selectedZoneName = z.name;
                              });
                            }
                          },
                        );
                      },
                      loading: () => const LinearProgressIndicator(),
                      error: (_, __) => const Text('Failed to load zones'),
                    ),
                    const SizedBox(height: 12),

                    // Checkpoint UID Input
                    TextField(
                      controller: _checkpointController,
                      decoration: const InputDecoration(
                        labelText: 'NFC Tag / Checkpoint ID',
                        hintText: 'Tap NFC or enter tag ID',
                        border: OutlineInputBorder(),
                        prefixIcon: Icon(Icons.nfc),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Action Buttons
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.nfc),
                            label: const Text('NFC Tap'),
                            onPressed: patrolState.isScanning
                                ? null
                                : () => _handleScan('nfc'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                            ),
                            icon: const Icon(Icons.qr_code_scanner),
                            label: const Text('QR Scan'),
                            onPressed: patrolState.isScanning
                                ? null
                                : () => _handleScan('qr'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Recent Checkpoint Activity Log
            const Text(
              'Recent Checkpoint Activity',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),

            if (patrolState.recentScans.isEmpty)
              Padding(
                padding: const EdgeInsets.all(24.0),
                child: Center(
                  child: Text(
                    'No checkpoint transits recorded in this shift yet.',
                    style: TextStyle(color: Colors.grey.shade500),
                  ),
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: patrolState.recentScans.length,
                separatorBuilder: (_, __) => const Divider(height: 1),
                itemBuilder: (context, index) {
                  final scan = patrolState.recentScans[index];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: CircleAvatar(
                      backgroundColor: Colors.indigo.withValues(alpha: 0.1),
                      child: Icon(
                        scan.method == 'nfc' ? Icons.nfc : Icons.qr_code,
                        color: Colors.indigo,
                        size: 20,
                      ),
                    ),
                    title: Text(
                      scan.checkpointId,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                    subtitle: Text(
                      scan.zoneName,
                      style: const TextStyle(fontSize: 12),
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          DateTime.parse(scan.scannedAt).toLocal().toString().substring(11, 19),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                            fontFamily: 'monospace',
                          ),
                        ),
                        const SizedBox(height: 2),
                        Icon(
                          scan.synced ? Icons.cloud_done : Icons.cloud_off,
                          size: 14,
                          color: scan.synced ? Colors.green : Colors.amber,
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
