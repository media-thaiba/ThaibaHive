import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/smart_campus_provider.dart';

class BiometricScannerScreen extends ConsumerWidget {
  const BiometricScannerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(smartCampusProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edge Biometrics & ZKP'),
        backgroundColor: Colors.teal.shade900,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.fingerprint, size: 80, color: Colors.tealAccent),
            const SizedBox(height: 16),
            const Text(
              'Zero-Knowledge Biometric Attendance',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Total punches verified: ${state.summary?.biometricPunches ?? 0}',
              style: const TextStyle(color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
