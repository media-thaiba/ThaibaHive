import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/agent_hub_providers.dart';

class AgentHubScreen extends ConsumerStatefulWidget {
  const AgentHubScreen({super.key});

  @override
  ConsumerState<AgentHubScreen> createState() => _AgentHubScreenState();
}

class _AgentHubScreenState extends ConsumerState<AgentHubScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(agentHubProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Agentic Workflows Hub'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(agentHubProvider.notifier).refreshHub(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(agentHubProvider.notifier).refreshHub(),
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Kill-Switch Alert if active
            if (state.isKillSwitchEngaged)
              Card(
                color: Colors.red.shade100,
                child: const ListTile(
                  leading: Icon(Icons.shield, color: Colors.red),
                  title: Text('EMERGENCY KILL-SWITCH ACTIVE', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
                  subtitle: Text('All autonomous workflows are currently paused by administration.'),
                ),
              ),

            // Pending Approvals Section
            const Text('Pending Approvals', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (state.pendingApprovals.isEmpty)
              const Card(
                child: Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Center(
                    child: Text('No pending supervisor approval requests.', style: TextStyle(color: Colors.grey)),
                  ),
                ),
              )
            else
              ...state.pendingApprovals.map((gate) => Card(
                    child: ListTile(
                      title: Text(gate.requiredPermission, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('Run: ${gate.runId} • Severity: ${gate.severity}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.check_circle, color: Colors.green),
                            onPressed: () => ref.read(agentHubProvider.notifier).decideApproval(gate.id, 'approved'),
                          ),
                          IconButton(
                            icon: const Icon(Icons.cancel, color: Colors.red),
                            onPressed: () => ref.read(agentHubProvider.notifier).decideApproval(gate.id, 'rejected'),
                          ),
                        ],
                      ),
                    ),
                  )),

            const SizedBox(height: 24),
            // Autonomous Fleet Section
            const Text('Autonomous Domain Fleet', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            ...state.agents.map((agent) => Card(
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.blue.shade50,
                      child: const Icon(Icons.smart_toy, color: Colors.blue),
                    ),
                    title: Text(agent.role, style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text('${agent.domain} • ${agent.id}'),
                    trailing: Chip(
                      label: Text(agent.status),
                      backgroundColor: agent.status == 'idle' ? Colors.green.shade50 : Colors.blue.shade50,
                    ),
                  ),
                )),
          ],
        ),
      ),
    );
  }
}
