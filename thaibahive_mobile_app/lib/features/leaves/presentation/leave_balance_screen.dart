import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/leave_balance_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/leaves_provider.dart';

class LeaveBalanceScreen extends ConsumerWidget {
  const LeaveBalanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final balancesAsync = ref.watch(leaveBalanceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Leave Balance')),
      body: balancesAsync.when(
        data: (balances) {
          if (balances.isEmpty) {
            return const EmptyStateWidget(
              icon: Icons.balance_rounded,
              title: 'No Leave Balance',
              message: 'Leave balance information is not available.',
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: balances.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (_, i) => _BalanceCard(balance: balances[i]),
          );
        },
        loading: () => const PageShimmer(),
        error: (e, _) => AppErrorWidget(
          message: e.toString(),
          onRetry: () => ref.invalidate(leaveBalanceProvider),
        ),
      ),
    );
  }
}

class _BalanceCard extends StatelessWidget {
  final LeaveBalanceModel balance;
  const _BalanceCard({required this.balance});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final usedRatio =
        balance.totalDays > 0 ? balance.usedDays / balance.totalDays : 0.0;
    final remainingRatio =
        balance.totalDays > 0 ? balance.remainingDays / balance.totalDays : 0.0;

    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    balance.leaveType?.name ?? 'Leave Type',
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                ),
                Text(
                  '${balance.year}',
                  style: theme.textTheme.labelSmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _StatChip(
                    label: 'Total',
                    value: balance.totalDays.toInt().toString(),
                    color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                _StatChip(
                    label: 'Used',
                    value: balance.usedDays.toInt().toString(),
                    color: Colors.orange),
                const SizedBox(width: 8),
                _StatChip(
                    label: 'Remaining',
                    value: balance.remainingDays.toInt().toString(),
                    color: Colors.green),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: usedRatio.clamp(0.0, 1.0),
                minHeight: 6,
                backgroundColor: theme.colorScheme.surfaceVariant,
                valueColor: AlwaysStoppedAnimation<Color>(
                  usedRatio > 0.8
                      ? Colors.red
                      : usedRatio > 0.6
                          ? Colors.orange
                          : Colors.green,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${(usedRatio * 100).toInt()}% used',
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _StatChip({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
