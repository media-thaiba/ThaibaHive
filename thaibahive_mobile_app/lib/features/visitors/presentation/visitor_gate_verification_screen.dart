import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

class VisitorGateVerificationScreen extends ConsumerStatefulWidget {
  const VisitorGateVerificationScreen({super.key});

  @override
  ConsumerState<VisitorGateVerificationScreen> createState() => _VisitorGateVerificationScreenState();
}

class _VisitorGateVerificationScreenState extends ConsumerState<VisitorGateVerificationScreen> {
  MobileScannerController? _scannerController;
  bool _isVerifying = false;
  Map<String, dynamic>? _visitorData;
  String? _statusMessage;
  String? _statusType; // 'approved', 'checked_in', 'expired'

  @override
  void initState() {
    super.initState();
    _scannerController = MobileScannerController();
  }

  @override
  void dispose() {
    _scannerController?.dispose();
    super.dispose();
  }

  Future<void> _verifyVisitorQr(String qrData) async {
    if (_isVerifying) return;
    setState(() {
      _isVerifying = true;
      _statusMessage = null;
    });

    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get('/api/visitors/verify?passToken=${Uri.encodeComponent(qrData)}');
      final data = response.data;

      setState(() {
        _isVerifying = false;
        _visitorData = data['visitor'] as Map<String, dynamic>?;
        _statusType = data['verificationStatus']?.toString();
      });
    } catch (e) {
      setState(() {
        _isVerifying = false;
        _statusMessage = 'Invalid or unverified visitor pass: $e';
        _statusType = 'error';
      });
    }
  }

  Future<void> _logGateAction(String action) async {
    if (_visitorData == null) return;
    final visitorId = _visitorData!['id']?.toString();

    try {
      final client = ref.read(apiClientProvider);
      await client.post('/api/visitors/gate-checkin', data: {
        'visitorId': visitorId,
        'action': action,
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Visitor successfully ${action == 'check_in' ? 'Checked In' : 'Checked Out'}!')),
        );
        setState(() {
          _visitorData = null;
          _statusType = null;
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Gate action failed: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Visitor Gate Pass Verification'),
      ),
      body: Column(
        children: [
          Expanded(
            flex: 5,
            child: _visitorData == null
                ? MobileScanner(
                    controller: _scannerController!,
                    onDetect: (capture) {
                      for (final b in capture.barcodes) {
                        if (b.rawValue != null && b.rawValue!.isNotEmpty) {
                          _verifyVisitorQr(b.rawValue!);
                          break;
                        }
                      }
                    },
                  )
                : Container(
                    padding: const EdgeInsets.all(20),
                    color: _statusType == 'approved'
                        ? Colors.green.shade50
                        : _statusType == 'checked_in'
                            ? Colors.blue.shade50
                            : Colors.red.shade50,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Icon(
                          _statusType == 'approved'
                              ? Icons.verified_user_rounded
                              : _statusType == 'checked_in'
                                  ? Icons.how_to_reg_rounded
                                  : Icons.cancel_rounded,
                          size: 72,
                          color: _statusType == 'approved'
                              ? Colors.green
                              : _statusType == 'checked_in'
                                  ? Colors.blue
                                  : Colors.red,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          _visitorData!['name']?.toString() ?? 'Visitor',
                          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                          textAlign: TextAlign.center,
                        ),
                        Text(
                          'Host: ${_visitorData!['hostName'] ?? 'General Visit'}',
                          style: theme.textTheme.titleMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'Purpose: ${_visitorData!['purpose'] ?? 'Campus Visit'}',
                          style: theme.textTheme.bodyMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => setState(() => _visitorData = null),
                                child: const Text('Scan Next'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: FilledButton(
                                onPressed: () => _logGateAction(_statusType == 'checked_in' ? 'check_out' : 'check_in'),
                                style: FilledButton.styleFrom(
                                  backgroundColor: _statusType == 'checked_in' ? Colors.blue.shade700 : Colors.green.shade700,
                                ),
                                child: Text(_statusType == 'checked_in' ? 'Gate Check Out' : 'Gate Check In'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
          ),
          if (_isVerifying)
            const Padding(
              padding: EdgeInsets.all(16),
              child: CircularProgressIndicator(),
            ),
          if (_statusMessage != null)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(_statusMessage!, style: TextStyle(color: theme.colorScheme.error)),
            ),
        ],
      ),
    );
  }
}
