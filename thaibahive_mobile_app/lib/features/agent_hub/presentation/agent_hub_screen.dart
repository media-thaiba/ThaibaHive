import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/agent_hub_providers.dart';
import 'widgets/agent_status_card.dart';
import 'widgets/approval_gate_card.dart';
import 'widgets/workflow_run_card.dart';

class AgentHubScreen extends ConsumerStatefulWidget {
  const AgentHubScreen({super.key});

  @override
  ConsumerState<AgentHubScreen> createState() => _AgentHubScreenState();
}

class _AgentHubScreenState extends ConsumerState<AgentHubScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _showRejectionDialog(MobileApprovalGate gate) {
    final textController = TextEditingController();

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Reject Workflow Action'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Are you sure you want to reject "${gate.actionType ?? gate.requiredPermission}"?'),
            const SizedBox(height: 12),
            TextField(
              controller: textController,
              decoration: const InputDecoration(
                labelText: 'Rejection Reason / Justification',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogCtx).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              ref.read(agentHubProvider.notifier).decideApproval(
                    gate,
                    decision: 'rejected',
                    reason: textController.text.trim().isNotEmpty ? textController.text.trim() : null,
                  );
            },
            child: const Text('Confirm Rejection'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(agentHubProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('AIGENT-OS Cockpit'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(agentHubProvider.notifier).refreshHub(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('Approvals'),
                  if (state.pendingApprovals.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.red.shade600,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${state.pendingApprovals.length}',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const Tab(text: 'Domain Fleet'),
            const Tab(text: 'Workflow Runs'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Emergency Kill-Switch Banner
          if (state.isKillSwitchEngaged)
            Container(
              width: double.infinity,
              color: Colors.red.shade700,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: const Row(
                children: [
                  Icon(Icons.warning_rounded, color: Colors.white, size: 20),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'EMERGENCY KILL-SWITCH ACTIVE: All autonomous agent tasks are halted.',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

          // Error banner if any
          if (state.errorMessage != null)
            Container(
              width: double.infinity,
              color: Colors.amber.shade100,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: Colors.amber.shade900, size: 18),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.errorMessage!,
                      style: TextStyle(color: Colors.amber.shade900, fontSize: 12),
                    ),
                  ),
                ],
              ),
            ),

          // Tab Views
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => ref.read(agentHubProvider.notifier).refreshHub(),
              child: TabBarView(
                controller: _tabController,
                children: [
                  // Tab 1: HITL Approvals
                  ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      if (state.pendingApprovals.isEmpty)
                        Card(
                          elevation: 0,
                          color: Colors.grey.shade50,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 40, horizontal: 16),
                            child: Column(
                              children: [
                                Icon(Icons.check_circle_outline, size: 48, color: Colors.green),
                                SizedBox(height: 12),
                                Text(
                                  'All Caught Up!',
                                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                                ),
                                SizedBox(height: 4),
                                Text(
                                  'No pending supervisor approval gates requiring triage.',
                                  style: TextStyle(color: Colors.grey, fontSize: 13),
                                  textAlign: TextAlign.center,
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        ...state.pendingApprovals.map(
                          (gate) => ApprovalGateCard(
                            gate: gate,
                            onApprove: () => ref.read(agentHubProvider.notifier).decideApproval(gate, decision: 'approved'),
                            onReject: () => _showRejectionDialog(gate),
                          ),
                        ),
                    ],
                  ),

                  // Tab 2: Domain Fleet
                  ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text(
                        'Autonomous Domain Agents',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      ...state.agents.map((agent) => AgentStatusCard(agent: agent)),
                    ],
                  ),

                  // Tab 3: Workflow Runs
                  ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      const Text(
                        'Recent Workflow Executions',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      if (state.recentRuns.isEmpty)
                        Card(
                          elevation: 0,
                          color: Colors.grey.shade50,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 36, horizontal: 16),
                            child: Center(
                              child: Text(
                                'No recent workflow runs logged.',
                                style: TextStyle(color: Colors.grey),
                              ),
                            ),
                          ),
                        )
                      else
                        ...state.recentRuns.map((run) => WorkflowRunCard(run: run)),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
