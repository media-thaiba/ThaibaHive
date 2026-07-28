import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

class LocationQrManagementScreen extends ConsumerStatefulWidget {
  const LocationQrManagementScreen({super.key});

  @override
  ConsumerState<LocationQrManagementScreen> createState() => _LocationQrManagementScreenState();
}

class _LocationQrManagementScreenState extends ConsumerState<LocationQrManagementScreen> {
  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _locations = [];
  String? _selectedLocationId;
  String? _currentQrString;
  int _secondsRemaining = 30;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetchLocations();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _fetchLocations() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get('/api/admin/attendance-locations');
      final data = response.data;
      final locationsList = (data['locations'] as List? ?? []).cast<Map<String, dynamic>>();

      setState(() {
        _locations = locationsList;
        _isLoading = false;
        if (locationsList.isNotEmpty) {
          _selectedLocationId = locationsList.first['id']?.toString();
          _loadQrForLocation(_selectedLocationId!);
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Failed to load attendance locations: $e';
      });
    }
  }

  Future<void> _loadQrForLocation(String locationId) async {
    _timer?.cancel();
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get('/api/admin/attendance-locations/$locationId/qr');
      final qr = response.data['qr']?.toString();
      setState(() {
        _currentQrString = qr;
        _secondsRemaining = 30;
      });
      _startCountdown(locationId);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to generate dynamic QR: $e')),
      );
    }
  }

  void _startCountdown(String locationId) {
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_secondsRemaining <= 1) {
        _loadQrForLocation(locationId);
      } else {
        setState(() {
          _secondsRemaining--;
        });
      }
    });
  }

  Future<void> _regenerateSecret(String locationId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Regenerate QR Secret?'),
        content: const Text(
          'Regenerating the secret key will invalidate all existing static wall posters for this location. Are you sure?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Theme.of(ctx).colorScheme.error),
            child: const Text('Regenerate'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      final client = ref.read(apiClientProvider);
      await client.patch('/api/admin/attendance-locations/$locationId', data: {
        'qrSecret': DateTime.now().millisecondsSinceEpoch.toString(),
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('QR Secret successfully regenerated')),
      );
      _loadQrForLocation(locationId);
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to regenerate secret: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Location QR Checkpoints'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _fetchLocations,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline_rounded, color: theme.colorScheme.error, size: 48),
                      const SizedBox(height: 12),
                      Text(_error!, textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      FilledButton(onPressed: _fetchLocations, child: const Text('Retry')),
                    ],
                  ),
                )
              : _locations.isEmpty
                  ? const Center(child: Text('No attendance locations configured yet.'))
                  : SingleChildScrollView(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          DropdownButtonFormField<String>(
                            value: _selectedLocationId,
                            decoration: const InputDecoration(
                              labelText: 'Select Checkpoint Location',
                              border: OutlineInputBorder(),
                            ),
                            items: _locations.map((loc) {
                              return DropdownMenuItem<String>(
                                value: loc['id'].toString(),
                                child: Text(loc['name']?.toString() ?? 'Unnamed Location'),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _selectedLocationId = val;
                                });
                                _loadQrForLocation(val);
                              }
                            },
                          ),
                          const SizedBox(height: 24),
                          Card(
                            elevation: 2,
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Dynamic TOTP Checkpoint', style: theme.textTheme.titleMedium),
                                      Chip(
                                        avatar: const Icon(Icons.timer_outlined, size: 16),
                                        label: Text('${_secondsRemaining}s'),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 20),
                                  Container(
                                    width: 240,
                                    height: 240,
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: theme.colorScheme.outlineVariant),
                                    ),
                                    alignment: Alignment.center,
                                    child: _currentQrString != null
                                        ? Column(
                                            mainAxisAlignment: MainAxisAlignment.center,
                                            children: [
                                              Icon(Icons.qr_code_2_rounded, size: 140, color: theme.colorScheme.primary),
                                              const SizedBox(height: 8),
                                              Padding(
                                                padding: const EdgeInsets.symmetric(horizontal: 12),
                                                child: Text(
                                                  'HMAC Signed Checkpoint',
                                                  style: theme.textTheme.bodySmall,
                                                  textAlign: TextAlign.center,
                                                ),
                                              ),
                                            ],
                                          )
                                        : const CircularProgressIndicator(),
                                  ),
                                  const SizedBox(height: 20),
                                  Text(
                                    'Display this screen on a gate tablet or kiosk. The QR code auto-refreshes every 30 seconds to prevent remote photo check-ins.',
                                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 16),
                                  OutlinedButton.icon(
                                    onPressed: () => _selectedLocationId != null ? _regenerateSecret(_selectedLocationId!) : null,
                                    icon: const Icon(Icons.key_off_rounded),
                                    label: const Text('Regenerate QR Secret'),
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
