import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/purchases_provider.dart';

class PurchasesScreen extends ConsumerStatefulWidget {
  const PurchasesScreen({super.key});

  @override
  ConsumerState<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends ConsumerState<PurchasesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(purchasesProvider.notifier).loadPurchases());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(purchasesProvider);
    final notifier = ref.read(purchasesProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Purchase Requests',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: DropdownButtonFormField<String?>(
              value: state.statusFilter,
              decoration: const InputDecoration(
                  labelText: 'Status', isDense: true),
              items: [
                const DropdownMenuItem(value: null, child: Text('All')),
                const DropdownMenuItem(
                    value: 'draft', child: Text('Draft')),
                const DropdownMenuItem(
                    value: 'pending', child: Text('Pending')),
                const DropdownMenuItem(
                    value: 'approved', child: Text('Approved')),
                const DropdownMenuItem(
                    value: 'ordered', child: Text('Ordered')),
                const DropdownMenuItem(
                    value: 'received', child: Text('Received')),
                const DropdownMenuItem(
                    value: 'rejected', child: Text('Rejected')),
              ],
              onChanged: (v) {
                notifier.setStatusFilter(v);
                notifier.loadPurchases();
              },
            ),
          ),
          Expanded(
            child: state.isLoading
                ? const ListShimmer()
                : state.error != null
                    ? AppErrorWidget(
                        message: state.error!,
                        onRetry: () => notifier.loadPurchases(),
                      )
                    : state.purchases.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No purchase requests',
                            icon: Icons.shopping_cart_rounded)
                        : RefreshIndicator(
                            onRefresh: () => notifier.loadPurchases(),
                            child: ListView.builder(
                              itemCount: state.purchases.length,
                              itemBuilder: (_, i) {
                                final p = state.purchases[i];
                                return Card(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 4),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(p.title,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w600,
                                                      fontSize: 16)),
                                            ),
                                            _statusBadge(p.status, theme),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        ...p.items
                                            .take(3)
                                            .map((item) => Padding(
                                                  padding:
                                                      const EdgeInsets.only(
                                                          bottom: 2),
                                                  child: Text(
                                                      '${item.name} × ${item.quantity}'),
                                                )),
                                        if (p.items.length > 3)
                                          Text('+${p.items.length - 3} more',
                                              style: TextStyle(
                                                  color: Colors.grey[600],
                                                  fontSize: 12)),
                                        const Divider(),
                                        Row(
                                          children: [
                                            Text('Total: ',
                                                style: TextStyle(
                                                    color: Colors.grey[600])),
                                            Text(
                                                '\$${p.totalEstimatedCost.toStringAsFixed(2)}',
                                                style: const TextStyle(
                                                    fontWeight:
                                                        FontWeight.w600)),
                                            const Spacer(),
                                            Text(p.createdAt.timeAgo(),
                                                style: theme.textTheme
                                                    .bodySmall),
                                          ],
                                        ),
                                      ],
                                    ),
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

  Widget _statusBadge(String status, ThemeData theme) {
    final (color, label) = _statusInfo(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(label,
          style: TextStyle(
              color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }

  (Color, String) _statusInfo(String status) {
    switch (status) {
      case 'draft':
        return (Colors.grey, 'Draft');
      case 'pending':
        return (Colors.orange, 'Pending');
      case 'approved':
        return (Colors.blue, 'Approved');
      case 'ordered':
        return (Colors.purple, 'Ordered');
      case 'received':
        return (Colors.green, 'Received');
      case 'rejected':
        return (Colors.red, 'Rejected');
      default:
        return (Colors.grey, status);
    }
  }

  void _showCreateDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final itemsData = <Map<String, dynamic>>[];

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
        child: StatefulBuilder(
          builder: (ctx, setDialogState) => SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.7,
            child: ListView(
              children: [
                Text('New Purchase Request',
                    style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 16),
                TextField(
                    controller: titleCtrl,
                    decoration:
                        const InputDecoration(labelText: 'Title')),
                const SizedBox(height: 12),
                TextField(
                    controller: descCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Description (optional)'),
                    maxLines: 2),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Text('Items',
                        style: Theme.of(ctx).textTheme.titleSmall),
                    const Spacer(),
                    TextButton.icon(
                      onPressed: () {
                        final nameCtrl = TextEditingController();
                        final qtyCtrl = TextEditingController();
                        final costCtrl = TextEditingController();
                        showDialog(
                          context: ctx,
                          builder: (dCtx) => AlertDialog(
                            title: const Text('Add Item'),
                            content: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextField(
                                    controller: nameCtrl,
                                    decoration: const InputDecoration(
                                        labelText: 'Item Name')),
                                TextField(
                                    controller: qtyCtrl,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                        labelText: 'Quantity')),
                                TextField(
                                    controller: costCtrl,
                                    keyboardType: TextInputType.number,
                                    decoration: const InputDecoration(
                                        labelText: 'Est. Cost')),
                              ],
                            ),
                            actions: [
                              TextButton(
                                  onPressed: () =>
                                      Navigator.of(dCtx).pop(),
                                  child: const Text('Cancel')),
                              FilledButton(
                                onPressed: () {
                                  final qty =
                                      int.tryParse(qtyCtrl.text) ?? 1;
                                  final cost =
                                      double.tryParse(costCtrl.text) ??
                                          0;
                                  if (nameCtrl.text.isNotEmpty) {
                                    setDialogState(() {
                                      itemsData.add({
                                        'name': nameCtrl.text,
                                        'quantity': qty,
                                        'estimated_cost': cost,
                                      });
                                    });
                                  }
                                  Navigator.of(dCtx).pop();
                                },
                                child: const Text('Add'),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('Add Item'),
                    ),
                  ],
                ),
                ...itemsData.map((item) => ListTile(
                      dense: true,
                      title: Text(item['name'] as String),
                      subtitle: Text(
                          'Qty: ${item['quantity']} · \$${(item['estimated_cost'] as double).toStringAsFixed(2)}'),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline,
                            size: 18),
                        onPressed: () {
                          setDialogState(
                              () => itemsData.remove(item));
                        },
                      ),
                    )),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () async {
                    if (titleCtrl.text.isEmpty || itemsData.isEmpty) return;
                    final total = itemsData.fold<double>(
                        0,
                        (s, item) =>
                            s +
                            (item['quantity'] as int) *
                                (item['estimated_cost'] as double));
                    await ref
                        .read(purchasesProvider.notifier)
                        .createPurchase({
                          'title': titleCtrl.text,
                          'description': descCtrl.text,
                          'items': itemsData,
                          'total_estimated_cost': total,
                          'status': 'pending',
                        });
                    if (ctx.mounted) Navigator.of(ctx).pop();
                  },
                  child: const Text('Submit Request'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
