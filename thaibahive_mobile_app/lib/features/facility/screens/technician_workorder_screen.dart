import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/facility_models.dart';
import '../providers/facility_providers.dart';
import 'offline_signature_sheet.dart';

class TechnicianWorkOrderScreen extends ConsumerWidget {
  const TechnicianWorkOrderScreen({super.key});

  Color _getPriorityColor(String priority) {
    switch (priority.toLowerCase()) {
      case 'emergency':
        return Colors.red.shade700;
      case 'urgent':
        return Colors.orange.shade700;
      case 'preventive':
        return Colors.blue.shade700;
      default:
        return Colors.grey.shade700;
    }
  }

  void _showCompleteSheet(BuildContext context, TechnicianWorkOrder wo) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => OfflineSignatureSheet(
        workOrderNumber: wo.workOrderNumber,
        onComplete: (signatureHash, notes) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Work order ${wo.workOrderNumber} marked completed & queued for Merkle sync'),
              backgroundColor: Colors.green,
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final workOrdersAsync = ref.watch(technicianWorkOrdersProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Field Technician Work Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.refresh(technicianWorkOrdersProvider),
          ),
        ],
      ),
      body: workOrdersAsync.when(
        data: (workOrders) {
          if (workOrders.isEmpty) {
            return const Center(
              child: Text('No active work orders assigned.'),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(12),
            itemCount: workOrders.length,
            itemBuilder: (context, index) {
              final wo = workOrders[index];
              final priorityColor = _getPriorityColor(wo.priority);

              return Card(
                elevation: 2,
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                  side: BorderSide(
                    color: wo.priority == 'emergency' ? Colors.red.shade300 : Colors.grey.shade200,
                    width: wo.priority == 'emergency' ? 1.5 : 1.0,
                  ),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: priorityColor.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              wo.priority.toUpperCase(),
                              style: TextStyle(
                                color: priorityColor,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          Text(
                            wo.workOrderNumber,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        wo.title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        wo.description,
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          Icon(Icons.location_on, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Text(
                            '${wo.buildingId} • ${wo.floorId} ${wo.roomId != null ? '(${wo.roomId})' : ''}',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                          ),
                          const Spacer(),
                          Icon(Icons.timer, size: 16, color: Colors.grey.shade600),
                          const SizedBox(width: 4),
                          Text(
                            '${wo.estimatedDurationMinutes} mins',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          if (wo.status == 'assigned')
                            ElevatedButton.icon(
                              icon: const Icon(Icons.play_arrow, size: 16),
                              label: const Text('Start Work'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).primaryColor,
                                foregroundColor: Colors.white,
                              ),
                              onPressed: () {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Work order started. Timer running.')),
                                );
                              },
                            ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            icon: const Icon(Icons.check, size: 16),
                            label: const Text('Complete & Sign'),
                            onPressed: () => _showCompleteSheet(context, wo),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
