import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/fee_providers.dart';

class FeeCheckoutScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> extra;

  const FeeCheckoutScreen({Key? key, required this.extra}) : super(key: key);

  @override
  ConsumerState<FeeCheckoutScreen> createState() => _FeeCheckoutScreenState();
}

class _FeeCheckoutScreenState extends ConsumerState<FeeCheckoutScreen> {
  String _selectedMethod = 'upi';
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final double amount = (widget.extra['amount'] as num?)?.toDouble() ?? 0.0;
    final String title = widget.extra['title'] ?? 'Fee Installment';
    final String? installmentId = widget.extra['installmentId'];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout & Pay'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              elevation: 0,
              color: Colors.blue.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(color: Colors.blue.shade200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Amount Payable:', style: TextStyle(color: Colors.black87)),
                        Text(
                          '₹${amount.toStringAsFixed(0)}',
                          style: TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            color: Colors.blue.shade900,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            const Text(
              'Select Payment Gateway',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const SizedBox(height: 10),
            RadioListTile<String>(
              value: 'upi',
              groupValue: _selectedMethod,
              title: const Text('UPI Intent / App Handoff'),
              subtitle: const Text('GPay, PhonePe, Paytm, BHIM'),
              secondary: const Icon(Icons.qr_code_2, color: Colors.blue),
              onChanged: (val) => setState(() => _selectedMethod = val!),
            ),
            RadioListTile<String>(
              value: 'razorpay',
              groupValue: _selectedMethod,
              title: const Text('Cards & Net Banking'),
              subtitle: const Text('Razorpay Gateway'),
              secondary: const Icon(Icons.credit_card, color: Colors.blue),
              onChanged: (val) => setState(() => _selectedMethod = val!),
            ),
            RadioListTile<String>(
              value: 'stripe',
              groupValue: _selectedMethod,
              title: const Text('International Cards'),
              subtitle: const Text('Stripe Global Payment Gateway'),
              secondary: const Icon(Icons.public, color: Colors.blue),
              onChanged: (val) => setState(() => _selectedMethod = val!),
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: _isProcessing
                  ? null
                  : () async {
                      setState(() => _isProcessing = true);
                      final success = await ref
                          .read(feeProvider.notifier)
                          .executeUpiPayment(amount, installmentId);
                      setState(() => _isProcessing = false);

                      if (success && mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Payment executed successfully! Receipt generated.'),
                            backgroundColor: Colors.green,
                          ),
                        );
                        context.pop();
                      }
                    },
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: _isProcessing
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('Pay ₹${amount.toStringAsFixed(0)} Now', style: const TextStyle(fontSize: 16)),
            ),
          ],
        ),
      ),
    );
  }
}
