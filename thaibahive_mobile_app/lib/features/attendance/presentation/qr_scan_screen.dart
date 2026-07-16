import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:thaibahive_mobile/core/services/location_service.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_provider.dart';

class QRScanScreen extends ConsumerStatefulWidget {
  const QRScanScreen({super.key});

  @override
  ConsumerState<QRScanScreen> createState() => _QRScanScreenState();
}

class _QRScanScreenState extends ConsumerState<QRScanScreen> {
  MobileScannerController? _controller;
  bool _isProcessing = false;
  bool _hasError = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.normal,
      facing: CameraFacing.back,
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;

    for (final barcode in capture.barcodes) {
      final rawValue = barcode.rawValue;
      if (rawValue == null || rawValue.isEmpty) continue;

      setState(() {
        _isProcessing = true;
      });

      _processQRCode(rawValue);
      return;
    }
  }

  Future<void> _processQRCode(String qrData) async {
    try {
      // Request current coordinates
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

      await ref.read(attendanceProvider.notifier).checkIn(
        method: 'qr',
        qrCode: qrData,
        latitude: latitude,
        longitude: longitude,
      );

      if (mounted) {
        final state = ref.read(attendanceProvider);
        if (state.error == null) {
          Navigator.of(context).pop(true);
        } else {
          setState(() {
            _hasError = true;
            _errorMessage = state.error;
            _isProcessing = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _hasError = true;
          _errorMessage = 'Failed to process QR code: $e';
          _isProcessing = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan QR Code'),
        actions: [
          IconButton(
            icon: ValueListenableBuilder<MobileScannerState>(
              valueListenable: _controller!,
              builder: (_, state, __) {
                return Icon(
                  state.torchState == TorchState.on
                      ? Icons.flash_on_rounded
                      : Icons.flash_off_rounded,
                );
              },
            ),
            onPressed: () => _controller!.toggleTorch(),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(
            controller: _controller!,
            onDetect: _onDetect,
          ),
          _buildOverlay(theme),
          if (_isProcessing)
            Container(
              color: Colors.black54,
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Processing check-in...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
          if (_hasError) _buildErrorOverlay(theme),
        ],
      ),
    );
  }

  Widget _buildOverlay(ThemeData theme) {
    return Center(
      child: Container(
        width: 280,
        height: 280,
        decoration: BoxDecoration(
          border: Border.all(
            color: theme.colorScheme.primary.withValues(alpha: 0.7),
            width: 3,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Stack(
          children: [
            Positioned(
              top: -1,
              left: -1,
              right: -1,
              height: 3,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      theme.colorScheme.primary,
                      Colors.transparent,
                    ],
                  ),
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildErrorOverlay(ThemeData theme) {
    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: theme.colorScheme.errorContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline_rounded,
              color: theme.colorScheme.onErrorContainer,
              size: 32,
            ),
            const SizedBox(height: 8),
            Text(
              _errorMessage ?? 'Scan failed',
              style: TextStyle(color: theme.colorScheme.onErrorContainer),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: () {
                setState(() {
                  _hasError = false;
                  _errorMessage = null;
                  _isProcessing = false;
                });
              },
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
