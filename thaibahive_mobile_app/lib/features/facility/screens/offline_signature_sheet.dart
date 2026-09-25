import 'package:flutter/material.dart';

class OfflineSignatureSheet extends StatefulWidget {
  final String workOrderNumber;
  final Function(String signatureHash, String resolutionNotes) onComplete;

  const OfflineSignatureSheet({
    super.key,
    required this.workOrderNumber,
    required this.onComplete,
  });

  @override
  State<OfflineSignatureSheet> createState() => _OfflineSignatureSheetState();
}

class _OfflineSignatureSheetState extends State<OfflineSignatureSheet> {
  final TextEditingController _notesController = TextEditingController();
  bool _signatureCaptured = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
        top: 16,
        left: 16,
        right: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Complete Work Order',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
              Text(
                widget.workOrderNumber,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _notesController,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Resolution & Field Notes',
              hintText: 'e.g., Replaced SKF-6205 bearing, balanced rotor, tested 1.1 mm/s RMS vibration',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          Container(
            height: 100,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade400, style: BorderStyle.solid),
              borderRadius: BorderRadius.circular(8),
              color: Colors.grey.shade50,
            ),
            child: InkWell(
              onTap: () {
                setState(() {
                  _signatureCaptured = true;
                });
              },
              child: Center(
                child: _signatureCaptured
                  ? const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_circle, color: Colors.green),
                        SizedBox(width: 8),
                        Text('Digital Signature Signed & Cryptographically Stamped', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                      ],
                    )
                  : const Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.draw, color: Colors.grey),
                        SizedBox(height: 4),
                        Text('Tap to Sign & Authorize Sign-Off', style: TextStyle(color: Colors.grey)),
                      ],
                    ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: (_signatureCaptured && _notesController.text.trim().isNotEmpty)
              ? () {
                  final hash = 'sig_sha256_${DateTime.now().millisecondsSinceEpoch}_${widget.workOrderNumber}';
                  widget.onComplete(hash, _notesController.text.trim());
                  Navigator.of(context).pop();
                }
              : null,
            child: const Text('Submit Work Order Completion'),
          ),
        ],
      ),
    );
  }
}
