import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/status_badge.dart';
import '../data/finance_models.dart';
import '../data/finance_provider.dart';
import 'finance_status.dart';

final _currency = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

class PurchaseApprovalsScreen extends ConsumerStatefulWidget {
  const PurchaseApprovalsScreen({super.key});

  @override
  ConsumerState<PurchaseApprovalsScreen> createState() =>
      _PurchaseApprovalsScreenState();
}

class _PurchaseApprovalsScreenState
    extends ConsumerState<PurchaseApprovalsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(financeApprovalsProvider.notifier).load());
  }

  List<PurchaseApprovalModel> _filtered(List<PurchaseApprovalModel> all) {
    final filter = ref.watch(financeApprovalsProvider).statusFilter;
    switch (filter) {
      case 'pending':
        return all.where((p) => p.isPending).toList();
      case 'approved':
        return all.where((p) => p.status == 'approved').toList();
      case 'rejected':
        return all.where((p) => p.status == 'rejected').toList();
      default:
        return all;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(financeApprovalsProvider);
    final notifier = ref.read(financeApprovalsProvider.notifier);
    final theme = Theme.of(context);
    final items = _filtered(state.approvals);

    return AppScaffold(
      title: 'Purchase Approvals',
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Row(
              children: [
                _FilterChip(
                  label: 'All',
                  selected: state.statusFilter == 'all',
                  onTap: () => notifier.setStatusFilter('all'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Pending',
                  selected: state.statusFilter == 'pending',
                  onTap: () => notifier.setStatusFilter('pending'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Approved',
                  selected: state.statusFilter == 'approved',
                  onTap: () => notifier.setStatusFilter('approved'),
                ),
                const SizedBox(width: 8),
                _FilterChip(
                  label: 'Rejected',
                  selected: state.statusFilter == 'rejected',
                  onTap: () => notifier.setStatusFilter('rejected'),
                ),
              ],
            ),
          ),
          if (state.notice != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Container(
                width: double.infinity,
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.cloud_off_rounded,
                        size: 16, color: Colors.orange),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(state.notice!,
                          style: const TextStyle(
                              fontSize: 12, color: Colors.orange)),
                    ),
                    IconButton(
                      visualDensity: VisualDensity.compact,
                      icon: const Icon(Icons.close_rounded, size: 16),
                      onPressed: () => notifier.clearNotice(),
                    ),
                  ],
                ),
              ),
            ),
          Expanded(
            child: state.isLoading && state.approvals.isEmpty
                ? const ListShimmer()
                : state.error != null && state.approvals.isEmpty
                    ? AppErrorWidget(
                        message: state.error!,
                        onRetry: () => notifier.load(),
                      )
                    : items.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No purchase requests match this filter',
                            icon: Icons.how_to_vote_rounded)
                        : RefreshIndicator(
                            onRefresh: () => notifier.load(),
                            child: ListView.builder(
                              itemCount: items.length,
                              itemBuilder: (_, i) {
                                final p = items[i];
                                final acting =
                                    state.actingIds.contains(p.id);
                                return AppCard(
                                  onTap: () => context
                                      .push('/finance/approvals/${p.id}'),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(p.itemName,
                                                style: theme
                                                    .textTheme.titleMedium
                                                    ?.copyWith(
                                                        fontWeight:
                                                            FontWeight.w700)),
                                          ),
                                          StatusBadge(
                                            label: labelForStatus(p.status),
                                            variant: badgeForStatus(p.status),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        'Qty ${p.quantity} · ${_currency.format(p.estimatedCost)}',
                                        style: theme.textTheme.bodyMedium,
                                      ),
                                      if (p.justification != null &&
                                          p.justification!.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          p.justification!,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: theme.textTheme.bodySmall
                                              ?.copyWith(
                                                  color: theme
                                                      .colorScheme.onSurface
                                                      .withValues(alpha: 0.6)),
                                        ),
                                      ],
                                      if (p.isPending) ...[
                                        const SizedBox(height: 12),
                                        Row(
                                          children: [
                                            Expanded(
                                              child: OutlinedButton.icon(
                                                onPressed: acting
                                                    ? null
                                                    : () => _showDecisionSheet(
                                                        context, p, 'reject'),
                                                icon: const Icon(
                                                    Icons.close_rounded,
                                                    size: 16),
                                                label: const Text('Reject'),
                                                style: OutlinedButton.styleFrom(
                                                  foregroundColor: Colors.red,
                                                  side: BorderSide(
                                                      color: Colors.red
                                                          .withValues(
                                                              alpha: 0.4)),
                                                ),
                                              ),
                                            ),
                                            const SizedBox(width: 10),
                                            Expanded(
                                              child: FilledButton.icon(
                                                onPressed: acting
                                                    ? null
                                                    : () => _showDecisionSheet(
                                                        context, p, 'approve'),
                                                icon: acting
                                                    ? const SizedBox(
                                                        width: 14,
                                                        height: 14,
                                                        child:
                                                            CircularProgressIndicator(
                                                                strokeWidth:
                                                                    2),
                                                      )
                                                    : const Icon(
                                                        Icons.check_rounded,
                                                        size: 16),
                                                label: const Text('Approve'),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ],
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

  void _showDecisionSheet(
      BuildContext context, PurchaseApprovalModel purchase, String action) {
    final controller = TextEditingController();
    final isApprove = action == 'approve';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(sheetContext).viewInsets.bottom + 24,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isApprove ? 'Approve request' : 'Reject request',
              style: Theme.of(sheetContext)
                  .textTheme
                  .titleMedium
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              '${purchase.itemName} · ${_currency.format(purchase.estimatedCost)}',
              style: Theme.of(sheetContext).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Comments (optional)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(sheetContext),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () {
                      Navigator.pop(sheetContext);
                      ref.read(financeApprovalsProvider.notifier).act(
                            id: purchase.id,
                            action: action,
                            comments: controller.text.trim(),
                          );
                    },
                    child: Text(isApprove ? 'Approve' : 'Reject'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: selected
              ? theme.colorScheme.primary
              : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? theme.colorScheme.primary
                : theme.colorScheme.outline.withValues(alpha: 0.4),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: selected
                ? theme.colorScheme.onPrimary
                : theme.colorScheme.onSurface,
          ),
        ),
      ),
    );
  }
}
