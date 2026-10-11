import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../application/agent_hub_providers.dart';

class PluginDetailScreen extends ConsumerStatefulWidget {
  final String pluginId;
  final MobileAgentPlugin? initialPlugin;

  const PluginDetailScreen({
    super.key,
    required this.pluginId,
    this.initialPlugin,
  });

  @override
  ConsumerState<PluginDetailScreen> createState() => _PluginDetailScreenState();
}

class _PluginDetailScreenState extends ConsumerState<PluginDetailScreen> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(agentHubProvider);

    // Locate plugin in installed or marketplace
    MobileAgentPlugin? plugin = widget.initialPlugin;
    if (plugin == null) {
      final matchingInstalled = state.installedPlugins.where((p) => p.id == widget.pluginId);
      if (matchingInstalled.isNotEmpty) {
        plugin = matchingInstalled.first;
      } else {
        final matchingMarket = state.marketplacePlugins.where((p) => p.id == widget.pluginId);
        if (matchingMarket.isNotEmpty) {
          plugin = matchingMarket.first;
        }
      }
    }

    if (plugin == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Plugin Details')),
        body: const Center(child: Text('Plugin not found')),
      );
    }

    final isInstalled = state.installedPlugins.any((p) => p.id == plugin!.id);
    final installedPlugin = isInstalled
        ? state.installedPlugins.firstWhere((p) => p.id == plugin!.id)
        : plugin;

    return Scaffold(
      appBar: AppBar(
        title: Text(installedPlugin.displayName),
        actions: [
          if (isInstalled)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              tooltip: 'Uninstall Plugin',
              onPressed: () async {
                final confirm = await showDialog<bool>(
                  context: context,
                  builder: (ctx) => AlertDialog(
                    title: const Text('Uninstall Plugin'),
                    content: Text('Are you sure you want to uninstall "${installedPlugin.displayName}"?'),
                    actions: [
                      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
                        onPressed: () => Navigator.pop(ctx, true),
                        child: const Text('Uninstall'),
                      ),
                    ],
                  ),
                );

                if (confirm == true && mounted) {
                  final ok = await ref.read(agentHubProvider.notifier).uninstallPlugin(installedPlugin.id);
                  if (ok && mounted) {
                    Navigator.pop(context);
                  }
                }
              },
            ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Header Card
          Card(
            elevation: 1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: Colors.indigo.shade50,
                        child: Icon(Icons.extension_outlined, color: Colors.indigo.shade700, size: 28),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    installedPlugin.displayName,
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                if (installedPlugin.authorVerified) ...[
                                  const SizedBox(width: 4),
                                  const Icon(Icons.verified, size: 18, color: Colors.blue),
                                ],
                              ],
                            ),
                            Text(
                              'v${installedPlugin.version} • ${installedPlugin.category.toUpperCase()}',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    installedPlugin.summary,
                    style: const TextStyle(fontSize: 14, height: 1.3),
                  ),
                  if (installedPlugin.description != null && installedPlugin.description!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      installedPlugin.description!,
                      style: TextStyle(fontSize: 13, color: Colors.grey.shade700, height: 1.3),
                    ),
                  ],
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      Column(
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.star, size: 16, color: Colors.amber),
                              const SizedBox(width: 4),
                              Text(
                                installedPlugin.ratingAvg.toStringAsFixed(1),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          Text(
                            '${installedPlugin.ratingCount} reviews',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                      Column(
                        children: [
                          Text(
                            '${installedPlugin.installedCount}',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Active Installs',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                      Column(
                        children: [
                          Text(
                            installedPlugin.scope.toUpperCase(),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                          Text(
                            'Scope',
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Status & Toggle if installed
          if (isInstalled) ...[
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: Colors.grey.shade200),
              ),
              child: SwitchListTile(
                title: const Text('Plugin Execution State', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Text(
                  installedPlugin.isEnabled ? 'Active & accepting tool calls' : 'Disabled (quarantined)',
                  style: TextStyle(color: installedPlugin.isEnabled ? Colors.green.shade700 : Colors.grey),
                ),
                value: installedPlugin.isEnabled,
                onChanged: (val) {
                  ref.read(agentHubProvider.notifier).togglePlugin(installedPlugin.id, val);
                },
              ),
            ),
            const SizedBox(height: 16),
          ],

          // Capabilities & Tool Permissions
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.shade200),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Capabilities & Tools', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 8),
                  if (installedPlugin.capabilities.isEmpty)
                    Text('No specific capability tags declared.', style: TextStyle(fontSize: 12, color: Colors.grey.shade600))
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: installedPlugin.capabilities.map((c) {
                        return Chip(
                          label: Text(c, style: const TextStyle(fontSize: 12)),
                          backgroundColor: Colors.blue.shade50,
                          padding: const EdgeInsets.all(2),
                        );
                      }).toList(),
                    ),
                  const SizedBox(height: 16),
                  const Text('Granted Permissions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 8),
                  if (installedPlugin.grantedPermissions.isEmpty)
                    Text('No permissions granted yet.', style: TextStyle(fontSize: 12, color: Colors.grey.shade600))
                  else
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: installedPlugin.grantedPermissions.map((p) {
                        return Chip(
                          avatar: const Icon(Icons.shield_outlined, size: 16, color: Colors.teal),
                          label: Text(p, style: const TextStyle(fontSize: 12)),
                          backgroundColor: Colors.teal.shade50,
                          padding: const EdgeInsets.all(2),
                        );
                      }).toList(),
                    ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // Install action button if not installed
          if (!isInstalled)
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              icon: const Icon(Icons.download),
              label: const Text('Install into Institution', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
              onPressed: () async {
                final ok = await ref.read(agentHubProvider.notifier).installPlugin(installedPlugin.id);
                if (ok && mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Installed ${installedPlugin.displayName} successfully!')),
                  );
                }
              },
            ),
        ],
      ),
    );
  }
}
