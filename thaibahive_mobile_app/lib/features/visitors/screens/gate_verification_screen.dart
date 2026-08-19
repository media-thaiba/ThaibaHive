import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/gatekeeper_provider.dart';

class GateVerificationScreen extends ConsumerStatefulWidget {
  const GateVerificationScreen({super.key});

  @override
  ConsumerState<GateVerificationScreen> createState() => _GateVerificationScreenState();
}

class _GateVerificationScreenState extends ConsumerState<GateVerificationScreen> {
  final TextEditingController _qrController = TextEditingController();
  bool _isVerifying = false;
  String? _verificationResult;

  void _verifyPayload() async {
    final payload = _qrController.text.trim();
    if (payload.isEmpty) return;

    setState(() => _isVerifying = true);
    await Future.delayed(const Duration(milliseconds: 500));
    setState(() {
      _isVerifying = false;
      _verificationResult = payload.contains("VIS|") ? "APPROVED" : "INVALID";
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Gatekeeper Security Scanner'),
        backgroundColor: Colors.blueGrey.shade900,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Icon(Icons.security, size: 64, color: Colors.blueGrey),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _qrController,
                      decoration: const InputDecoration(
                        labelText: 'Scan Visitor Gate Pass QR',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.camera_alt),
                      ),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: _isVerifying ? null : _verifyPayload,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blueGrey.shade900,
                        foregroundColor: Colors.white,
                      ),
                      child: _isVerifying
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Verify Visitor Signature'),
                    ),
                  ],
                ),
              ),
            ),
            if (_verificationResult != null) ...[
              const SizedBox(height: 20),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _verificationResult == "APPROVED" ? Colors.green.shade100 : Colors.red.shade100,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: _verificationResult == "APPROVED" ? Colors.green : Colors.red,
                    width: 2,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      _verificationResult == "APPROVED" ? Icons.verified_user : Icons.gpp_bad,
                      size: 48,
                      color: _verificationResult == "APPROVED" ? Colors.green.shade900 : Colors.red.shade900,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _verificationResult == "APPROVED" ? 'VISITOR APPROVED FOR ENTRY' : 'GATE PASS INVALID / DENIED',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: _verificationResult == "APPROVED" ? Colors.green.shade900 : Colors.red.shade900,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
