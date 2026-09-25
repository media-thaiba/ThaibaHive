import 'package:flutter/material.dart';

class QrAssetScannerScreen extends StatefulWidget {
  final Function(String assetTag)? onAssetScanned;

  const QrAssetScannerScreen({super.key, this.onAssetScanned});

  @override
  State<QrAssetScannerScreen> createState() => _QrAssetScannerScreenState();
}

class _QrAssetScannerScreenState extends State<QrAssetScannerScreen> {
  final TextEditingController _manualInputController = TextEditingController();
  bool _isScanning = true;
  String? _scannedTag;

  @override
  void dispose() {
    _manualInputController.dispose();
    super.dispose();
  }

  void _handleAssetTagDetected(String tag) {
    setState(() {
      _scannedTag = tag;
      _isScanning = false;
    });

    if (widget.onAssetScanned != null) {
      widget.onAssetScanned!(tag);
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Asset Tag Identified: $tag — On-site presence verified.'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scan Equipment QR / NFC'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Viewport Simulation Area
            Container(
              height: 280,
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Theme.of(context).primaryColor, width: 2),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Scanner Reticle Overlay
                  Container(
                    width: 200,
                    height: 200,
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.cyanAccent.withOpacity(0.8), width: 2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: _isScanning
                          ? const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.qr_code_scanner, size: 64, color: Colors.cyanAccent),
                                SizedBox(height: 8),
                                Text(
                                  'Align Asset QR / Tap NFC',
                                  style: TextStyle(color: Colors.white70, fontSize: 12),
                                ),
                              ],
                            )
                          : Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.check_circle, size: 64, color: Colors.greenAccent),
                                const SizedBox(height: 8),
                                Text(
                                  _scannedTag ?? '',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'monospace',
                                  ),
                                ),
                              ],
                            ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Quick Demo Scan Buttons
            Text(
              'Simulate Optical / NFC Check-In:',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ActionChip(
                  avatar: const Icon(Icons.ac_unit, size: 16),
                  label: const Text('CHILLER-01 (Basement)'),
                  onPressed: () => _handleAssetTagDetected('CHILLER-01'),
                ),
                ActionChip(
                  avatar: const Icon(Icons.air, size: 16),
                  label: const Text('AHU-04 (Roof)'),
                  onPressed: () => _handleAssetTagDetected('AHU-04'),
                ),
                ActionChip(
                  avatar: const Icon(Icons.elevator, size: 16),
                  label: const Text('ELEV-NORTH-01'),
                  onPressed: () => _handleAssetTagDetected('ELEV-NORTH-01'),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Manual Tag Input
            const Divider(),
            const SizedBox(height: 8),
            Text(
              'Manual Asset Tag Entry:',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _manualInputController,
                    decoration: const InputDecoration(
                      hintText: 'e.g. PUMP-CHW-02',
                      border: OutlineInputBorder(),
                      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  onPressed: () {
                    final tag = _manualInputController.text.trim();
                    if (tag.isNotEmpty) {
                      _handleAssetTagDetected(tag);
                    }
                  },
                  child: const Text('Verify'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
