import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

class BeaconManagementScreen extends ConsumerStatefulWidget {
  const BeaconManagementScreen({super.key});

  @override
  ConsumerState<BeaconManagementScreen> createState() => _BeaconManagementScreenState();
}

class _BeaconManagementScreenState extends ConsumerState<BeaconManagementScreen> {
  final _uuidController = TextEditingController(text: 'E2C56DB5-DFFB-48D2-B060-D0F5A71096E0');
  final _majorController = TextEditingController(text: '1');
  final _minorController = TextEditingController(text: '100');

  bool _isLoadingLocations = true;
  bool _isPairing = false;
  List<Map<String, dynamic>> _locationsList = [];
  String? _selectedLocationId;

  @override
  void initState() {
    super.initState();
    _fetchLocations();
  }

  @override
  void dispose() {
    _uuidController.dispose();
    _majorController.dispose();
    _minorController.dispose();
    super.dispose();
  }

  Future<void> _fetchLocations() async {
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get('/api/admin/attendance-locations');
      final list = (response.data['locations'] as List? ?? []).cast<Map<String, dynamic>>();
      setState(() {
        _locationsList = list;
        _isLoadingLocations = false;
        if (list.isNotEmpty) _selectedLocationId = list.first['id']?.toString();
      });
    } catch (e) {
      setState(() {
        _isLoadingLocations = false;
      });
    }
  }

  Future<void> _pairBeacon() async {
    if (_selectedLocationId == null || _uuidController.text.trim().isEmpty) return;

    setState(() {
      _isPairing = true;
    });

    try {
      final client = ref.read(apiClientProvider);
      await client.post('/api/admin/attendance-locations/$_selectedLocationId/beacon', data: {
        'uuid': _uuidController.text.trim(),
        'major': int.tryParse(_majorController.text.trim()) ?? 1,
        'minor': int.tryParse(_minorController.text.trim()) ?? 1,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('BLE Beacon successfully paired to campus location!')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to pair BLE beacon: $e')),
        );
        setState(() {
          _isPairing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('BLE Beacon Location Pairing'),
      ),
      body: _isLoadingLocations
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    value: _selectedLocationId,
                    decoration: const InputDecoration(
                      labelText: 'Target Attendance Location',
                      border: OutlineInputBorder(),
                    ),
                    items: _locationsList.map((loc) {
                      return DropdownMenuItem<String>(
                        value: loc['id']?.toString(),
                        child: Text(loc['name']?.toString() ?? 'Unnamed Location'),
                      );
                    }).toList(),
                    onChanged: (val) {
                      setState(() {
                        _selectedLocationId = val;
                      });
                    },
                  ),
                  const SizedBox(height: 20),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.bluetooth_searching_rounded, color: theme.colorScheme.primary),
                              const SizedBox(width: 8),
                              Text('Beacon Identifier Details', style: theme.textTheme.titleMedium),
                            ],
                          ),
                          const SizedBox(height: 16),
                          TextField(
                            controller: _uuidController,
                            decoration: const InputDecoration(
                              labelText: 'Proximity UUID',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _majorController,
                                  keyboardType: TextInputType.number,
                                  decoration: const InputDecoration(
                                    labelText: 'Major ID',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: TextField(
                                  controller: _minorController,
                                  keyboardType: TextInputType.number,
                                  decoration: const InputDecoration(
                                    labelText: 'Minor ID',
                                    border: OutlineInputBorder(),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  FilledButton.icon(
                    onPressed: _isPairing ? null : _pairBeacon,
                    icon: _isPairing
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.link_rounded),
                    label: const Text('Pair Beacon to Location'),
                  ),
                ],
              ),
            ),
    );
  }
}
