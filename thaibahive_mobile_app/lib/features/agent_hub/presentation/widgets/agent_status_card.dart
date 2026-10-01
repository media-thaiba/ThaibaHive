import 'package:flutter/material.dart';
import '../../data/models/agent_models.dart';

class AgentStatusCard extends StatelessWidget {
  final MobileAgentInfo agent;
  final VoidCallback? onTap;

  const AgentStatusCard({
    super.key,
    required this.agent,
    this.onTap,
  });

  IconData _domainIcon(String domain) {
    switch (domain.toLowerCase()) {
      case 'academic':
        return Icons.school_outlined;
      case 'finance':
        return Icons.account_balance_wallet_outlined;
      case 'security':
        return Icons.security_outlined;
      case 'facilities':
        return Icons.domain_outlined;
      case 'hr':
        return Icons.badge_outlined;
      default:
        return Icons.smart_toy_outlined;
    }
  }

  Color _statusColor(String status) {
    switch (status.toLowerCase()) {
      case 'busy':
      case 'running':
        return Colors.blue;
      case 'idle':
      case 'active':
        return Colors.green;
      case 'error':
      case 'failed':
        return Colors.red;
      case 'paused':
      default:
        return Colors.amber;
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _statusColor(agent.status);

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
          radius: 22,
          backgroundColor: Colors.blue.shade50,
          child: Icon(_domainIcon(agent.domain), color: Colors.blue.shade700),
        ),
        title: Text(
          agent.role,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text(
              'Domain: ${agent.domain.toUpperCase()} • ID: ${agent.id}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Text(
                  'Load: ${agent.currentLoad}/${agent.maxConcurrency}',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: agent.maxConcurrency > 0 ? (agent.currentLoad / agent.maxConcurrency).clamp(0.0, 1.0) : 0.0,
                      backgroundColor: Colors.grey.shade100,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        agent.currentLoad >= agent.maxConcurrency ? Colors.red : Colors.blue,
                      ),
                      minHeight: 4,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            agent.status.toUpperCase(),
            style: TextStyle(
              color: statusColor,
              fontWeight: FontWeight.bold,
              fontSize: 11,
            ),
          ),
        ),
      ),
    );
  }
}
