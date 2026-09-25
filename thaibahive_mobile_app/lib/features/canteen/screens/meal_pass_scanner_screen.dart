import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/canteen_cashier_provider.dart';

class MealPassScannerScreen extends ConsumerStatefulWidget {
  const MealPassScannerScreen({super.key});

  @override
  ConsumerState<MealPassScannerScreen> createState() => _MealPassScannerScreenState();
}

class _MealPassScannerScreenState extends ConsumerState<MealPassScannerScreen> {
  final TextEditingController _passCodeController = TextEditingController();
  bool _isProcessing = false;

  void _handleRedeem() async {
    final passCode = _passCodeController.text.trim();
    if (passCode.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please scan or enter a Meal Pass QR Code')),
      );
      return;
    }

    setState(() => _isProcessing = true);
    await Future.delayed(const Duration(milliseconds: 600));

    setState(() => _isProcessing = false);
    _passCodeController.clear();

    if (mounted) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          icon: const Icon(Icons.check_circle, color: Colors.green, size: 48),
          title: const Text('Redemption Successful'),
          content: const Text('Meal pass balance deducted successfully.'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('OK'),
            ),
          ],
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(canteenCashierProvider);
    final total = ref.read(canteenCashierProvider.notifier).totalAmount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meal Pass Cashier Scanner'),
        backgroundColor: Colors.teal,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Icon(Icons.qr_code_scanner, size: 64, color: Colors.teal),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _passCodeController,
                      decoration: const InputDecoration(
                        labelText: 'Meal Pass QR Code',
                        hintText: 'e.g. CMP-88192-QR',
                        border: OutlineInputBorder(),
                        suffixIcon: Icon(Icons.camera_alt),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Redemption Items', style: TextStyle(fontWeight: FontWeight.bold)),
                    const Divider(),
                    ...cart.map((item) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('${item.name} x ${item.qty}'),
                              Text('₹${(item.price * item.qty).toStringAsFixed(2)}'),
                            ],
                          ),
                        )),
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Amount', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text('₹${total.toStringAsFixed(2)}',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 16)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            ElevatedButton(
              onPressed: _isProcessing ? null : _handleRedeem,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.teal,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _isProcessing
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Process Redemption', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
