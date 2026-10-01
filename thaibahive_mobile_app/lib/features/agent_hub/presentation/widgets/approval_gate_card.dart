import 'package:flutter/material.dart';
import '../../data/models/agent_models.dart';

class ApprovalGateCard extends StatelessWidget {
  final MobileApprovalGate gate;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  final VoidCallback? onTap;

  const ApprovalGateCard({
    super.key,
    required this.gate,
    required this.onApprove,
    required this.onReject,
    this.onTap,
  });

  Color _severityColor(String severity) {
    switch (severity.toLowerCase()) {
      case 'critical':
        return Colors.red.shade700;
      case 'high':
        return Colors.orange.shade800;
      case 'medium':
        return Colors.amber.shade800;
      case 'low':
      default:
        return Colors.blue.shade700;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sevColor = _severityColor(gate.severity);

    return Card(
      elevation: 2,
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 0),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: gate.isCritical ? Colors.red.shade300 : Colors.grey.shade200,
          width: gate.isCritical ? 1.5 : 1.0,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row: Severity Chip & Action Type
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: sevColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: sevColor.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          gate.isCritical ? Icons.warning_amber_rounded : Icons.shield_outlined,
                          size: 14,
                          color: sevColor,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          gate.severity.toUpperCase(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: sevColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    gate.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Title / Required Permission
              Text(
                gate.actionType ?? gate.requiredPermission,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),

              // Subtitle info
              Text(
                'Workflow Run: ${gate.runId}',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
              ),
              if (gate.payload != null && gate.payload!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade50,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    gate.payload.toString(),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: Colors.grey.shade800),
                  ),
                ),
              ],
              const SizedBox(height: 12),

              // Action Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    onPressed: onReject,
                    icon: const Icon(Icons.close, size: 16, color: Colors.red),
                    label: const Text('Reject', style: TextStyle(color: Colors.red)),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.red.shade200),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    onPressed: onApprove,
                    icon: Icon(
                      gate.isCritical ? Icons.fingerprint : Icons.check,
                      size: 16,
                    ),
                    label: Text(gate.isCritical ? 'Approve & Sign' : 'Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade700,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
