import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/agent_hub_providers.dart';
import 'plugin_detail_screen.dart';
import 'widgets/agent_status_card.dart';
import 'widgets/approval_gate_card.dart';
import 'widgets/live_snippet_card.dart';
import 'widgets/plugin_card.dart';
import 'widgets/workflow_run_card.dart';

class AgentHubScreen extends ConsumerStatefulWidget {
  final String? initialGateId;

  const AgentHubScreen({super.key, this.initialGateId});

  @override
  ConsumerState<AgentHubScreen> createState() => _AgentHubScreenState();
}

class _AgentHubScreenState extends ConsumerState<AgentHubScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    if (widget.initialGateId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        ref.read(agentHubProvider.notifier).selectGate(widget.initialGateId);
      });
    }
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

  void _showRunWorkflowDialog() {
    final idController = TextEditingController(text: 'sample-academic-check');
    final inputKeyController = TextEditingController(text: 'priority');
    final inputValueController = TextEditingController(text: 'normal');

    showDialog(
      context: context,
      builder: (dialogCtx) => AlertDialog(
        title: const Text('Trigger Autonomous Workflow'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: idController,
              decoration: const InputDecoration(
                labelText: 'Workflow Identifier',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: inputKeyController,
                    decoration: const InputDecoration(
                      labelText: 'Input Key',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: inputValueController,
                    decoration: const InputDecoration(
                      labelText: 'Value',
                      border: OutlineInputBorder(),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogCtx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(dialogCtx);
              final wfId = idController.text.trim();
              if (wfId.isNotEmpty) {
                final inputs = <String, dynamic>{
                  if (inputKeyController.text.trim().isNotEmpty)
                    inputKeyController.text.trim(): inputValueController.text.trim(),
                };
                ref.read(agentHubProvider.notifier).triggerWorkflowRun(wfId, inputs: inputs);
              }
            },
            child: const Text('Launch Run'),
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
            icon: const Icon(Icons.play_arrow_outlined),
            tooltip: 'Trigger Run',
            onPressed: _showRunWorkflowDialog,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(agentHubProvider.notifier).refreshHub(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          tabAlignment: TabAlignment.start,
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
            const Tab(text: 'Plugins'),
            Tab(
              child: Row(
                children: [
                  const Text('Live Stream'),
                  if (state.liveSnippets.isNotEmpty) ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade700,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${state.liveSnippets.length}',
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

          // Offline cached banner
          if (state.isOfflineCached)
            Container(
              width: double.infinity,
              color: Colors.blueGrey.shade700,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: const Row(
                children: [
                  Icon(Icons.cloud_off, color: Colors.white, size: 16),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'OFFLINE MODE: Displaying cached agent plugins.',
                      style: TextStyle(color: Colors.white, fontSize: 12),
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

                  // Tab 2: Plugins (Installed + Marketplace)
                  ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Section 1: Installed Plugins
                      const Text(
                        'Installed Plugins',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      if (state.installedPlugins.isEmpty)
                        Card(
                          elevation: 0,
                          color: Colors.grey.shade50,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                            child: Center(
                              child: Text('No plugins installed yet.', style: TextStyle(color: Colors.grey)),
                            ),
                          ),
                        )
                      else
                        ...state.installedPlugins.map((plugin) {
                          return PluginCard(
                            plugin: plugin,
                            onToggle: (enabled) => ref.read(agentHubProvider.notifier).togglePlugin(plugin.id, enabled),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => PluginDetailScreen(pluginId: plugin.id, initialPlugin: plugin),
                                ),
                              );
                            },
                          );
                        }),

                      const SizedBox(height: 20),

                      // Section 2: Marketplace Catalog
                      const Text(
                        'Marketplace Catalog',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      if (state.marketplacePlugins.isEmpty)
                        Card(
                          elevation: 0,
                          color: Colors.grey.shade50,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                            child: Center(
                              child: Text('Marketplace catalog empty.', style: TextStyle(color: Colors.grey)),
                            ),
                          ),
                        )
                      else
                        ...state.marketplacePlugins
                            .where((mp) => !state.installedPlugins.any((ip) => ip.id == mp.id))
                            .map((plugin) {
                          return PluginCard(
                            plugin: plugin,
                            onInstall: () => ref.read(agentHubProvider.notifier).installPlugin(plugin.id),
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => PluginDetailScreen(pluginId: plugin.id, initialPlugin: plugin),
                                ),
                              );
                            },
                          );
                        }),
                    ],
                  ),

                  // Tab 3: Live Multimodal Stream
                  ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Live Session Feed',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          if (state.liveSnippets.isNotEmpty)
                            TextButton.icon(
                              icon: const Icon(Icons.clear_all, size: 16),
                              label: const Text('Clear', style: TextStyle(fontSize: 12)),
                              onPressed: () => ref.read(agentHubProvider.notifier).clearLiveSnippets(),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (state.liveSnippets.isEmpty)
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
                              child: Column(
                                children: [
                                  Icon(Icons.mic_none, size: 40, color: Colors.grey),
                                  SizedBox(height: 8),
                                  Text(
                                    'Listening for live multimodal events...',
                                    style: TextStyle(color: Colors.grey, fontSize: 13),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        )
                      else
                        ...state.liveSnippets.map((snippet) => LiveSnippetCard(snippet: snippet)),
                    ],
                  ),

                  // Tab 4: Domain Fleet
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

                  // Tab 5: Workflow Runs
                  ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          const Text(
                            'Recent Workflow Executions',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          const Spacer(),
                          TextButton.icon(
                            icon: const Icon(Icons.add, size: 16),
                            label: const Text('Trigger', style: TextStyle(fontSize: 12)),
                            onPressed: _showRunWorkflowDialog,
                          ),
                        ],
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
