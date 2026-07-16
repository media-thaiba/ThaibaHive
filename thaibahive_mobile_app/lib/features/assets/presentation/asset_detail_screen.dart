import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/assets_provider.dart';

class AssetDetailScreen extends ConsumerStatefulWidget {
  final String assetId;

  const AssetDetailScreen({super.key, required this.assetId});

  @override
  ConsumerState<AssetDetailScreen> createState() => _AssetDetailScreenState();
}

class _AssetDetailScreenState extends ConsumerState<AssetDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() =>
        ref.read(assetsProvider.notifier).loadAssetDetail(widget.assetId));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(assetsProvider);
    final theme = Theme.of(context);
    final asset = state.selectedAsset;

    return AppScaffold(
      title: 'Asset Details',
      body: state.isLoading
          ? const PageShimmer()
          : asset == null
              ? const Center(child: Text('Asset not found'))
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(asset.name,
                                      style: theme.textTheme.titleLarge
                                          ?.copyWith(
                                              fontWeight: FontWeight.w600)),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: _statusColor(asset.status, theme)
                                        .withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(asset.status,
                                      style: TextStyle(
                                        color: _statusColor(
                                            asset.status, theme),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                      )),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            _detailRow('Type', asset.type),
                            _detailRow(
                                'Serial Number', asset.serialNumber ?? '-'),
                            _detailRow(
                                'Model', asset.modelNumber ?? '-'),
                            _detailRow(
                                'Manufacturer', asset.manufacturer ?? '-'),
                            _detailRow('Location', asset.location ?? '-'),
                            if (asset.assignedToName != null)
                              _detailRow('Assigned to', asset.assignedToName!),
                            if (asset.purchaseDate != null)
                              _detailRow('Purchase Date',
                                  asset.purchaseDate!.toDisplayDate()),
                            if (asset.purchaseCost != null)
                              _detailRow('Purchase Cost',
                                  '\$${asset.purchaseCost!.toStringAsFixed(2)}'),
                            if (asset.notes != null) ...[
                              const Divider(),
                              Text('Notes',
                                  style: theme.textTheme.titleSmall),
                              const SizedBox(height: 4),
                              Text(asset.notes!),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text('Service History',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ...state.serviceHistory.map((s) => Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                        child: Text(s.description,
                                            style: const TextStyle(
                                                fontWeight:
                                                    FontWeight.w500))),
                                    Text(s.serviceDate.toDisplayDate(),
                                        style:
                                            theme.textTheme.bodySmall),
                                  ],
                                ),
                                if (s.cost != null)
                                  Text(
                                      'Cost: \$${s.cost!.toStringAsFixed(2)}'),
                                if (s.performedBy != null)
                                  Text('By: ${s.performedBy}'),
                              ],
                            ),
                          ),
                        )),
                    if (state.serviceHistory.isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text('No service history',
                              style: TextStyle(color: Colors.grey[600])),
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

  Widget _detailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(label,
                style: const TextStyle(
                    color: Colors.grey, fontWeight: FontWeight.w500)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
