import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/assets_provider.dart';

class AssetsScreen extends ConsumerStatefulWidget {
  const AssetsScreen({super.key});

  @override
  ConsumerState<AssetsScreen> createState() => _AssetsScreenState();
}

class _AssetsScreenState extends ConsumerState<AssetsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(assetsProvider.notifier).loadAssets());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assetsProvider);
    final notifier = ref.read(assetsProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Assets',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    value: state.typeFilter,
                    decoration: const InputDecoration(
                        labelText: 'Type', isDense: true),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...['Furniture', 'Electronics', 'Vehicle', 'Equipment',
                              'Other']
                          .map((t) => DropdownMenuItem(
                              value: t.toLowerCase(), child: Text(t))),
                    ],
                    onChanged: (v) => notifier.setTypeFilter(v),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    value: state.statusFilter,
                    decoration: const InputDecoration(
                        labelText: 'Status', isDense: true),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...['Available', 'In Use', 'Maintenance', 'Retired']
                          .map((s) => DropdownMenuItem(
                              value: s.toLowerCase(), child: Text(s))),
                    ],
                    onChanged: (v) => notifier.setStatusFilter(v),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading
                ? const ListShimmer()
                : state.error != null
                    ? AppErrorWidget(
                        message: state.error!,
                        onRetry: () => notifier.loadAssets(),
                      )
                    : notifier.filteredAssets.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No assets found',
                            icon: Icons.inventory_2_rounded)
                        : RefreshIndicator(
                            onRefresh: () => notifier.loadAssets(),
                            child: ListView.builder(
                              itemCount: notifier.filteredAssets.length,
                              itemBuilder: (_, i) {
                                final a = notifier.filteredAssets[i];
                                return Card(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 4),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: _statusColor(a.status,
                                              theme)
                                          .withValues(alpha: 0.2),
                                      child: Icon(Icons.inventory_2_rounded,
                                          color:
                                              _statusColor(a.status, theme),
                                          size: 22),
                                    ),
                                    title: Text(a.name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600)),
                                    subtitle: Text(
                                        '${a.type} · ${a.serialNumber ?? 'No S/N'}'),
                                    trailing: Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: _statusColor(a.status, theme)
                                            .withValues(alpha: 0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(a.status,
                                          style: TextStyle(
                                            color: _statusColor(
                                                a.status, theme),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                          )),
                                    ),
                                    onTap: () =>
                                        context.push('/assets/${a.id}'),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status, ThemeData theme) {
    switch (status) {
      case 'available':
        return Colors.green;
      case 'in_use':
        return Colors.blue;
      case 'maintenance':
        return Colors.orange;
      case 'retired':
        return Colors.grey;
      default:
        return theme.colorScheme.primary;
    }
  }

  void _showCreateDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final serialCtrl = TextEditingController();
    final modelCtrl = TextEditingController();
    final manufacturerCtrl = TextEditingController();
    final locationCtrl = TextEditingController();
    final notesCtrl = TextEditingController();
    String type = 'equipment';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.7,
          child: ListView(
            children: [
              Text('Add Asset',
                  style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                  controller: nameCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Name')),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: type,
                decoration:
                    const InputDecoration(labelText: 'Type'),
                items: ['furniture', 'electronics', 'vehicle',
                        'equipment', 'other']
                    .map((t) => DropdownMenuItem(
                        value: t, child: Text(t.capitalize())))
                    .toList(),
                onChanged: (v) => type = v!,
              ),
              const SizedBox(height: 12),
              TextField(
                  controller: serialCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Serial Number (optional)')),
              const SizedBox(height: 12),
              TextField(
                  controller: modelCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Model (optional)')),
              const SizedBox(height: 12),
              TextField(
                  controller: manufacturerCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Manufacturer (optional)')),
              const SizedBox(height: 12),
              TextField(
                  controller: locationCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Location (optional)')),
              const SizedBox(height: 12),
              TextField(
                  controller: notesCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Notes (optional)'),
                  maxLines: 2),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  if (nameCtrl.text.isEmpty) return;
                  await ref
                      .read(assetsProvider.notifier)
                      .createAsset({
                        'name': nameCtrl.text,
                        'type': type,
                        'serial_number': serialCtrl.text,
                        'model_number': modelCtrl.text,
                        'manufacturer': manufacturerCtrl.text,
                        'location': locationCtrl.text,
                        'notes': notesCtrl.text,
                        'status': 'available',
                      });
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: const Text('Add Asset'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

extension on String {
  String capitalize() =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';
}
