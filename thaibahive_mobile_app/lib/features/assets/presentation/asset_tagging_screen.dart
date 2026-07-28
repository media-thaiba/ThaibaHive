import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/core/utils/nfc_helper.dart';

class AssetTaggingScreen extends ConsumerStatefulWidget {
  const AssetTaggingScreen({super.key});

  @override
  ConsumerState<AssetTaggingScreen> createState() => _AssetTaggingScreenState();
}

class _AssetTaggingScreenState extends ConsumerState<AssetTaggingScreen> {
  bool _isLoadingAssets = true;
  bool _isSaving = false;
  List<Map<String, dynamic>> _assetsList = [];
  String? _selectedAssetId;
  String _scanMode = 'camera'; // 'camera' or 'nfc'
  String? _scannedTag;
  MobileScannerController? _scannerController;

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController();
    _fetchAssets();
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    NfcManager.instance.stopSession().catchError((_) {});
    super.dispose();
  }

  Future<void> _fetchAssets() async {
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get('/api/assets');
      final list = (response.data['assets'] as List? ?? []).cast<Map<String, dynamic>>();
      setState(() {
        _assetsList = list;
        _isLoadingAssets = false;
        if (list.isNotEmpty) _selectedAssetId = list.first['id']?.toString();
      });
    } catch (e) {
      setState(() {
        _isLoadingAssets = false;
      });
    }
  }

  void _startNfcScan() async {
    final isAvailable = await NfcManager.instance.isAvailable();
    if (!isAvailable) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('NFC hardware unavailable on this device')),
        );
      }
      return;
    }

    NfcManager.instance.startSession(onDiscovered: (NfcTag tag) async {
      final tagId = NfcHelper.extractTagId(tag);

      if (mounted && tagId != null) {
        setState(() {
          _scannedTag = tagId;
        });
      }
      try {
        await NfcManager.instance.stopSession();
      } catch (_) {}
    });
  }

  Future<void> _bindTagToAsset() async {
    if (_selectedAssetId == null || _scannedTag == null) return;

    setState(() {
      _isSaving = true;
    });

    try {
      final client = ref.read(apiClientProvider);
      await client.post('/api/assets/$_selectedAssetId/tag', data: {
        _scanMode == 'nfc' ? 'nfcTagId' : 'barcode': _scannedTag,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Asset tag successfully bound!')),
        );
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to bind asset tag: $e')),
        );
        setState(() {
          _isSaving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Asset QR / Barcode / NFC Tagging'),
      ),
      body: _isLoadingAssets
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      DropdownButtonFormField<String>(
                        value: _selectedAssetId,
                        decoration: const InputDecoration(
                          labelText: 'Select Equipment Asset',
                          border: OutlineInputBorder(),
                        ),
                        items: _assetsList.map((asset) {
                          return DropdownMenuItem<String>(
                            value: asset['id']?.toString(),
                            child: Text('${asset['name']} (${asset['type'] ?? 'Asset'})'),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedAssetId = val;
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(value: 'camera', label: Text('Camera QR / Barcode'), icon: Icon(Icons.qr_code_scanner)),
                          ButtonSegment(value: 'nfc', label: Text('NFC Tag'), icon: Icon(Icons.nfc)),
                        ],
                        selected: {_scanMode},
                        onSelectionChanged: (set) {
                          setState(() {
                            _scanMode = set.first;
                            _scannedTag = null;
                          });
                          if (set.first == 'nfc') _startNfcScan();
                        },
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: _scanMode == 'camera'
                      ? MobileScanner(
                          controller: _scannerController!,
                          onDetect: (capture) {
                            for (final b in capture.barcodes) {
                              if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                                setState(() {
                                  _scannedTag = b.rawValue;
                                });
                                break;
                              }
                            }
                          },
                        )
                      : Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.nfc_rounded, size: 80, color: theme.colorScheme.primary),
                              const SizedBox(height: 16),
                              Text('Hold phone near NFC asset tag', style: theme.textTheme.titleMedium),
                            ],
                          ),
                        ),
                ),
                if (_scannedTag != null)
                  Container(
                    padding: const EdgeInsets.all(16),
                    color: theme.colorScheme.primaryContainer,
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Scanned Tag: $_scannedTag',
                            style: TextStyle(color: theme.colorScheme.onPrimaryContainer, fontWeight: FontWeight.bold),
                          ),
                        ),
                        FilledButton(
                          onPressed: _isSaving ? null : _bindTagToAsset,
                          child: _isSaving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Bind Tag'),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
    );
  }
}
