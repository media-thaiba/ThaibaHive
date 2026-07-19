import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/services/nfc_check_in.dart';
import 'package:thaibahive_mobile/core/services/location_service.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_provider.dart';

class NFCScanScreen extends ConsumerStatefulWidget {
  const NFCScanScreen({super.key});

  @override
  ConsumerState<NFCScanScreen> createState() => _NFCScanScreenState();
}

class _NFCScanScreenState extends ConsumerState<NFCScanScreen>
    with SingleTickerProviderStateMixin {
  bool _isScanning = false;
  bool _hasError = false;
  String? _errorMessage;
  bool _nfcAvailable = true;
  late AnimationController _animController;
  late Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOut),
    );
    _checkNfcAndStart();
  }

  @override
  void dispose() {
    nfcCheckInService.stopScanning();
    _animController.dispose();
    super.dispose();
  }

  Future<void> _checkNfcAndStart() async {
    final available = await nfcCheckInService.isAvailable();
    if (!mounted) return;

    if (!available) {
      setState(() {
        _nfcAvailable = false;
        _hasError = true;
        _errorMessage = 'NFC is not available on this device.';
      });
      return;
    }

    _startScanning();
  }

  Future<void> _startScanning() async {
    setState(() {
      _isScanning = true;
      _hasError = false;
      _errorMessage = null;
    });

    // Request current coordinates before scan starts
    double? latitude;
    double? longitude;
    try {
      final position = await locationService.getCurrentLocation();
      if (position != null) {
        latitude = position.latitude;
        longitude = position.longitude;
      }
    } catch (e) {
      debugPrint('Failed to retrieve location: $e');
    }

    await nfcCheckInService.startScanning(
      locationId: 'default',
      latitude: latitude,
      longitude: longitude,
      onResult: (result) async {
        if (!mounted) return;

        if (result.success) {
          final clientEventId = result.data?['clientEventId'] as String?;
          final tagData = result.data?['tagData']?['payload'] as String? ??
              result.data?['tagData']?['id'] as String? ??
              'unknown';

          await ref.read(attendanceProvider.notifier).checkIn(
            method: 'nfc',
            nfcTagId: tagData,
            latitude: latitude,
            longitude: longitude,
          );

          if (mounted) {
            final state = ref.read(attendanceProvider);
            if (state.error == null) {
              if (clientEventId != null) {
                // Direct check-in succeeded, mark it as completed so it's not retried
                await offlineQueue.markCompleted(clientEventId);
              }
              Navigator.of(context).pop(true);
            } else {
              setState(() {
                _hasError = true;
                _errorMessage = state.error;
                _isScanning = false;
              });
            }
          }
        } else {
          setState(() {
            _hasError = true;
            _errorMessage = result.error ?? 'NFC scan failed';
            _isScanning = false;
          });
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('NFC Check-In'),
        actions: [
          if (_nfcAvailable)
            IconButton(
              icon: Icon(_isScanning ? Icons.stop_rounded : Icons.play_arrow_rounded),
              onPressed: () {
                if (_isScanning) {
                  nfcCheckInService.stopScanning();
                  setState(() => _isScanning = false);
                } else {
                  _startScanning();
                }
              },
            ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              AnimatedBuilder(
                animation: _pulseAnim,
                builder: (_, child) => Transform.scale(
                  scale: _isScanning ? _pulseAnim.value : 1.0,
                  child: child,
                ),
                child: Container(
                  width: 160,
                  height: 160,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _hasError
                        ? theme.colorScheme.error.withValues(alpha: 0.1)
                        : theme.colorScheme.primary.withValues(alpha: 0.1),
                    border: Border.all(
                      color: _hasError
                          ? theme.colorScheme.error
                          : theme.colorScheme.primary,
                      width: 3,
                    ),
                  ),
                  child: Icon(
                    _hasError
                        ? Icons.nfc_rounded
                        : Icons.nfc_rounded,
                    size: 64,
                    color: _hasError
                        ? theme.colorScheme.error
                        : theme.colorScheme.primary,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              if (_isScanning) ...[
                Text(
                  'Hold your device near the NFC tag',
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Keep the back of your phone close to the reader',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  textAlign: TextAlign.center,
                ),
              ] else if (_hasError) ...[
                Text(
                  _errorMessage ?? 'NFC unavailable',
                  style: theme.textTheme.titleMedium?.copyWith(
                    color: theme.colorScheme.error,
                    fontWeight: FontWeight.w500,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _startScanning,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try Again'),
                ),
              ] else ...[
                Text(
                  'Tap the button to start scanning',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _startScanning,
                  icon: const Icon(Icons.play_arrow_rounded),
                  label: const Text('Start Scanning'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
