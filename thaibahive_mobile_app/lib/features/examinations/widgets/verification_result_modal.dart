import 'package:flutter/material.dart';
import '../providers/hall_ticket_provider.dart';

class VerificationResultModal extends StatelessWidget {
  final VerificationResult result;

  const VerificationResultModal({
    super.key,
    required this.result,
  });

  @override
  Widget build(BuildContext context) {
    final isSuccess = result.isValid;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSuccess ? Icons.check_circle_outline : Icons.cancel_outlined,
            size: 64,
            color: isSuccess ? Colors.green : Colors.red,
          ),
          const SizedBox(height: 16),
          Text(
            isSuccess ? 'Hall Ticket Cleared' : 'Verification Blocked',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isSuccess ? Colors.green.shade900 : Colors.red.shade900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            result.message,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 14, color: Colors.black87),
          ),
          if (result.studentName != null) ...[
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Student Name:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(result.studentName!),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Register No:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(result.registerNumber ?? '-'),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Assigned Seat:', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(result.seatNumber ?? '-'),
              ],
            ),
          ],
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: isSuccess ? Colors.green : Colors.red,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 12),
              ),
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Dismiss'),
            ),
          ),
        ],
      ),
    );
  }
}
