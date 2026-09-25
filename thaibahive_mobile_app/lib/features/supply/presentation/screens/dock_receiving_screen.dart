// Dock Receiving & Barcode Scanner Screen (SUPPLY-020)

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/supply_service.dart';

class DockReceivingScreen extends ConsumerStatefulWidget {
  const DockReceivingScreen({super.key});

  @override
  ConsumerState<DockReceivingScreen> createState() => _DockReceivingScreenState();
}

class _DockReceivingScreenState extends ConsumerState<DockReceivingScreen> {
  final TextEditingController _skuController = TextEditingController();
  final TextEditingController _qtyController = TextEditingController(text: '1');
  String _selectedCondition = 'good';
  String? _selectedPoNumber;

  @override
  void dispose() {
    _skuController.dispose();
    _qtyController.dispose();
    super.dispose();
  }

  void _handleSimulatedScan(String barcode) {
    setState(() {
      _skuController.text = barcode;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Barcode Scanned: $barcode')),
    );
  }

  Future<void> _submitReceipt() async {
    if (_selectedPoNumber == null || _skuController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select PO and scan/enter SKU')),
      );
      return;
    }

    final service = ref.read(supplyDockServiceProvider);
    final receipt = await service.processDockScan(
      poId: _selectedPoNumber!,
      barcodeScanned: _skuController.text,
      itemSku: _skuController.text,
      quantityReceived: int.tryParse(_qtyController.text) ?? 1,
      packageCondition: _selectedCondition,
      isOnline: true,
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Goods Receipt Logged: ${receipt.receiptId}'),
          backgroundColor: Colors.green,
        ),
      );
      setState(() {
        _skuController.clear();
        _qtyController.text = '1';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final incomingOrdersAsync = ref.watch(incomingDockOrdersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Dock Receiving Handheld'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_scanner),
            tooltip: 'Simulate Barcode Scan',
            onPressed: () => _handleSimulatedScan('SKU-H100-PCIE-80G'),
          ),
        ],
      ),
      body: incomingOrdersAsync.when(
        data: (orders) => SingleChildScrollView(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Select Incoming Purchase Order',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        value: _selectedPoNumber,
                        hint: const Text('Choose PO'),
                        items: orders.map((o) {
                          return DropdownMenuItem(
                            value: o.poNumber,
                            child: Text('${o.poNumber} • ${o.vendorName}'),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedPoNumber = val;
                          });
                        },
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
                      const Text(
                        'Package Inspection & Receiving',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _skuController,
                        decoration: const InputDecoration(
                          labelText: 'Scanned Item SKU / Barcode',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.barcode_reader),
                        ),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: _qtyController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Quantity Received',
                          border: OutlineInputBorder(),
                          prefixIcon: Icon(Icons.numbers),
                        ),
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: _selectedCondition,
                        decoration: const InputDecoration(
                          labelText: 'Package Condition',
                          border: OutlineInputBorder(),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'good', child: Text('Good Condition')),
                          DropdownMenuItem(value: 'damaged', child: Text('Damaged (Quarantine)')),
                          DropdownMenuItem(value: 'tampered', child: Text('Tampered / Seal Broken')),
                        ],
                        onChanged: (val) {
                          setState(() {
                            _selectedCondition = val ?? 'good';
                          });
                        },
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.check_circle_outline),
                          label: const Text('Confirm & Log Goods Receipt'),
                          onPressed: _submitReceipt,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error loading orders: $err')),
      ),
    );
  }
}
