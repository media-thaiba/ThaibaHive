import 'package:flutter/material.dart';
import '../../data/models/agent_models.dart';

class PluginCard extends StatelessWidget {
  final MobileAgentPlugin plugin;
  final ValueChanged<bool>? onToggle;
  final VoidCallback? onTap;
  final VoidCallback? onInstall;
  final VoidCallback? onUninstall;

  const PluginCard({
    super.key,
    required this.plugin,
    this.onToggle,
    this.onTap,
    this.onInstall,
    this.onUninstall,
  });

  Color _categoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'security':
        return Colors.red.shade700;
      case 'finance':
        return Colors.green.shade700;
      case 'academic':
        return Colors.purple.shade700;
      case 'analytics':
        return Colors.blue.shade700;
      case 'utility':
        return Colors.orange.shade700;
      default:
        return Colors.teal.shade700;
    }
  }

  @override
  Widget build(BuildContext context) {
    final catColor = _categoryColor(plugin.category);

    return Card(
      elevation: 1,
      margin: const EdgeInsets.symmetric(vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.grey.shade200),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header: Title, Category Badge, Switch / Install Button
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Flexible(
                              child: Text(
                                plugin.displayName,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (plugin.authorVerified) ...[
                              const SizedBox(width: 4),
                              const Icon(Icons.verified, size: 16, color: Colors.blue),
                            ],
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'v${plugin.version} • ${plugin.pluginKey}',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                        ),
                      ],
                    ),
                  ),
                  if (plugin.isInstalled)
                    Switch(
                      value: plugin.isEnabled,
                      onChanged: onToggle,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    )
                  else if (onInstall != null)
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        visualDensity: VisualDensity.compact,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      ),
                      onPressed: onInstall,
                      child: const Text('Install', style: TextStyle(fontSize: 12)),
                    ),
                ],
              ),

              const SizedBox(height: 8),

              // Summary
              Text(
                plugin.summary,
                style: TextStyle(fontSize: 13, color: Colors.grey.shade800),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),

              const SizedBox(height: 10),

              // Footer: Category, Rating, Installed Count
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: catColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      plugin.category.toUpperCase(),
                      style: TextStyle(
                        color: catColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 10,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (plugin.ratingAvg > 0) ...[
                    const Icon(Icons.star, size: 14, color: Colors.amber),
                    const SizedBox(width: 2),
                    Text(
                      '${plugin.ratingAvg.toStringAsFixed(1)} (${plugin.ratingCount})',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (plugin.installedCount > 0)
                    Text(
                      '${plugin.installedCount} installs',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                    ),
                  const Spacer(),
                  if (plugin.grantedPermissions.isNotEmpty)
                    Text(
                      '${plugin.grantedPermissions.length} permissions',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
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
