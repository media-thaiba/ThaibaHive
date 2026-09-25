import 'package:flutter/material.dart';
import '../models/facility_models.dart';
import 'offline_signature_sheet.dart';

class WorkOrderDetailScreen extends StatelessWidget {
  final TechnicianWorkOrder workOrder;

  const WorkOrderDetailScreen({super.key, required this.workOrder});

  void _showCompletionDialog(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => OfflineSignatureSheet(
        workOrderNumber: workOrder.workOrderNumber,
        onComplete: (signatureHash, notes) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Work Order ${workOrder.workOrderNumber} submitted for Merkle anchoring.'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.of(context).pop();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(workOrder.workOrderNumber),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status & Priority Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Chip(
                  label: Text(
                    workOrder.priority.toUpperCase(),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                  backgroundColor: workOrder.priority == 'emergency' ? Colors.red.shade100 : Colors.blue.shade100,
                ),
                Text(
                  'Status: ${workOrder.status.toUpperCase()}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Title
            Text(
              workOrder.title,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 8),

            // Description
            Text(
              workOrder.description,
              style: TextStyle(color: Colors.grey.shade800),
            ),
            const SizedBox(height: 16),
            const Divider(),

            // Location & Spatial Coordinates
            Text(
              'Location & Spatial Navigation',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            ListTile(
              leading: const Icon(Icons.location_on, color: Colors.blue),
              title: Text('${workOrder.buildingId} • ${workOrder.floorId}'),
              subtitle: Text(workOrder.roomId != null ? 'Room / Area: ${workOrder.roomId}' : 'General Area'),
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: 8),

            // Equipment Manual / Diagnostic Steps
            Text(
              'Required Diagnostic Procedures',
              style: Theme.of(context).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Card(
              color: Colors.grey.shade50,
              child: const Padding(
                padding: EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('1. Perform optical QR scan of equipment asset tag to verify presence.'),
                    SizedBox(height: 4),
                    Text('2. Lockout / Tagout electrical disconnect before mechanical housing removal.'),
                    SizedBox(height: 4),
                    Text('3. Replace worn components according to OEM maintenance specifications.'),
                    SizedBox(height: 4),
                    Text('4. Verify post-repair vibration / telemetry is within permissible limits.'),
                    SizedBox(height: 4),
                    Text('5. Capture digital signature & submit resolution log.'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Action Buttons
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check_circle_outline),
                label: const Text('Complete & Sign Work Order'),
                onPressed: () => _showCompletionDialog(context),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
