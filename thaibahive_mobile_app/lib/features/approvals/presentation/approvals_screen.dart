import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../models/approval_item_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/approvals_provider.dart';

class ApprovalsScreen extends ConsumerStatefulWidget {
  const ApprovalsScreen({super.key});

  @override
  ConsumerState<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends ConsumerState<ApprovalsScreen> {
  String _selectedType = 'all';
  final _types = ['all', 'leave', 'booking', 'purchase', 'expense'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final approvalsAsync = ref.watch(approvalsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Approvals')),
      body: Column(
        children: [
          Container(
            color: theme.colorScheme.surface,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: _types.map((type) {
                  final label = type == 'all' ? 'All' : type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(
                          '${label[0].toUpperCase()}${label.substring(1)}'),
                      selected: _selectedType == type,
                      onSelected: (_) {
                        setState(() => _selectedType = type);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            child: approvalsAsync.when(
              data: (approvals) {
                final filtered = _selectedType == 'all'
                    ? approvals
                    : approvals
                        .where((a) => a.type == _selectedType)
                        .toList();
                if (filtered.isEmpty) {
                  return const EmptyStateWidget(
                    icon: Icons.check_circle_outline_rounded,
                    title: 'All Caught Up',
                    message: 'No pending approvals.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.read(approvalsListProvider.notifier).refresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(top: 8, bottom: 16),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) => _ApprovalCard(
                      item: filtered[i],
                      onApprove: () => _handleAction(
                          filtered[i], 'approved'),
                      onReject: () => _handleAction(
                          filtered[i], 'rejected'),
                    ),
                  ),
                );
              },
              loading: () => const PageShimmer(),
              error: (e, _) => AppErrorWidget(
                message: e.toString(),
                onRetry: () =>
                    ref.read(approvalsListProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _handleAction(
      ApprovalItemModel item, String status) async {
    try {
      final notifier = ref.read(approvalsListProvider.notifier);
      if (status == 'approved') {
        await notifier.approve(item.type, item.id);
      } else {
        await notifier.reject(item.type, item.id);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                '${item.title} ${status} successfully'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }
}

class _ApprovalCard extends StatelessWidget {
  final ApprovalItemModel item;
  final VoidCallback onApprove;
  final VoidCallback onReject;
  const _ApprovalCard({
    required this.item,
    required this.onApprove,
    required this.onReject,
  });

  IconData _typeIcon(String type) {
    switch (type) {
      case 'leave':
        return Icons.beach_access_rounded;
      case 'booking':
        return Icons.book_online_rounded;
      case 'purchase':
        return Icons.shopping_cart_rounded;
      case 'expense':
        return Icons.receipt_rounded;
      default:
        return Icons.approval_rounded;
    }
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'leave':
        return Colors.blue;
      case 'booking':
        return Colors.purple;
      case 'purchase':
        return Colors.orange;
      case 'expense':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _typeColor(item.type);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(_typeIcon(item.type),
                      color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: theme.textTheme.titleSmall
                            ?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      if (item.requester != null)
                        Text(
                          'Requested by ${item.requester!.fullName}',
                          style: theme.textTheme.bodySmall,
                        ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    item.type.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: color,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _formatDate(item.createdAt),
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onReject,
                    icon: const Icon(Icons.close_rounded, size: 18),
                    label: const Text('Reject'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: const BorderSide(color: Colors.red),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: onApprove,
                    icon: const Icon(Icons.check_rounded, size: 18),
                    label: const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(String date) {
    try {
      return DateTime.parse(date).toDisplayDate();
    } catch (_) {
      return date;
    }
  }
}
