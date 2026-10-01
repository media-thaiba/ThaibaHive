import 'package:flutter/material.dart';
import '../../data/models/agent_models.dart';

class WorkflowRunCard extends StatelessWidget {
  final MobileWorkflowRun run;
  final VoidCallback? onTap;

  const WorkflowRunCard({
    super.key,
    required this.run,
    this.onTap,
  });

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return Colors.green;
      case 'running':
        return Colors.blue;
      case 'paused':
      case 'escalated_to_hitl':
        return Colors.amber;
      case 'failed':
      case 'compensated':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(run.status);

    return Card(
      elevation: 1,
      margin: const EdgeInsets.symmetric(vertical: 5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.12),
          child: Icon(
            run.status == 'running'
                ? Icons.sync
                : (run.status == 'completed' ? Icons.check_circle_outline : Icons.pending_actions),
            color: statusColor,
          ),
        ),
        title: Text(
          run.workflowName,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(
              'Run: ${run.id} • Steps: ${run.currentStep}/${run.totalSteps}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            if (run.error != null) ...[
              const SizedBox(height: 2),
              Text(
                'Error: ${run.error}',
                style: const TextStyle(fontSize: 11, color: Colors.red),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            run.status.toUpperCase(),
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: statusColor,
            ),
          ),
        ),
      ),
    );
  }
}
