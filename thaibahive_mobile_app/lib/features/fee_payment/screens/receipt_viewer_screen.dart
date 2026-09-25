import 'package:flutter/material.dart';
import '../models/fee_models.dart';

class ReceiptViewerScreen extends StatelessWidget {
  final MobileFeeReceipt receipt;

  const ReceiptViewerScreen({Key? key, required this.receipt}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Receipt #${receipt.receiptNumber}'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(20.0),
                child: Column(
                  children: [
                    const Icon(Icons.verified, color: Colors.green, size: 48),
                    const SizedBox(height: 12),
                    const Text(
                      'Official Fee Receipt',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Receipt: ${receipt.receiptNumber}',
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const Divider(height: 32),
                    _buildRow('Student ID', receipt.studentId),
                    const SizedBox(height: 8),
                    _buildRow('Date Issued', receipt.issuedAt),
                    const SizedBox(height: 8),
                    _buildRow('Payment Mode', receipt.paymentMethod.toUpperCase()),
                    const SizedBox(height: 8),
                    _buildRow('Amount Paid', '₹${receipt.amount.toStringAsFixed(0)}', isBold: true),
                    const Divider(height: 32),
                    Text(
                      'HMAC Hash: ${receipt.receiptHash.substring(0, 16)}...',
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 10, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            ElevatedButton.icon(
              onPressed: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Downloading encrypted receipt PDF...')),
                );
              },
              icon: const Icon(Icons.download),
              label: const Text('Download PDF Receipt'),
              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value, {bool isBold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.black54, fontSize: 13)),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }
}
