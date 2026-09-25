import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/alumni_models.dart';
import '../providers/alumni_provider.dart';

class EventPassWalletScreen extends ConsumerWidget {
  final MobileEventPass? pass;

  const EventPassWalletScreen({super.key, this.pass});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(alumniProvider);
    final activePass = pass ?? (state.eventPasses.isNotEmpty ? state.eventPasses.first : null);

    if (activePass == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Digital Event Wallet')),
        body: const Center(
          child: Text('No active event passes stored offline in wallet.'),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Gate Verification Pass'),
        backgroundColor: Colors.teal.shade800,
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    activePass.eventTitle,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    activePass.venue,
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const Divider(height: 32),
                  // Mock High Contrast QR Box
                  Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      color: Colors.black,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Container(
                        width: 150,
                        height: 150,
                        color: Colors.white,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.qr_code, size: 100, color: Colors.black),
                            Text(
                              activePass.ticketNumber,
                              style: const TextStyle(fontSize: 9, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Attendee: ${activePass.attendeeName}',
                    style: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'HMAC Hash: ${activePass.ticketPassHash.substring(0, 16)}...',
                    style: TextStyle(fontSize: 10, fontFamily: 'monospace', color: Colors.grey.shade500),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: activePass.isCheckedIn ? Colors.grey.shade200 : Colors.green.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: activePass.isCheckedIn ? Colors.grey : Colors.green),
                    ),
                    child: Text(
                      activePass.isCheckedIn ? 'ALREADY CHECKED IN' : 'VALID FOR SCANNER ENTRY',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: activePass.isCheckedIn ? Colors.grey.shade700 : Colors.green.shade800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
