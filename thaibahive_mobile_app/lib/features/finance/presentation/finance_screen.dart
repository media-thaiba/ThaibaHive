import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/status_badge.dart';
import '../data/finance_provider.dart';

final _currency = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

/// Finance hub — Sprint-103 entry point for mobile finance operations.
class FinanceScreen extends ConsumerStatefulWidget {
  const FinanceScreen({super.key});

  @override
  ConsumerState<FinanceScreen> createState() => _FinanceScreenState();
}

class _FinanceScreenState extends ConsumerState<FinanceScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      await ref.read(financeApprovalsProvider.notifier).load();
      await ref.read(financeReconciliationProvider.notifier).load();
    });
  }

  @override
  Widget build(BuildContext context) {
    final approvals = ref.watch(financeApprovalsProvider);
    final recon = ref.watch(financeReconciliationProvider);
    final theme = Theme.of(context);

    final pending = approvals.approvals.where((p) => p.isPending).length;
    final flagged = recon.sessions.where((s) => s.hasVariance).length;

    return AppScaffold(
      title: 'Finance',
      showBack: false,
      body: (approvals.isLoading && recon.isLoading)
          ? const ListShimmer(itemCount: 4)
          : RefreshIndicator(
              onRefresh: () async {
                await ref.read(financeApprovalsProvider.notifier).load();
                await ref.read(financeReconciliationProvider.notifier).load();
              },
              child: ListView(
                padding: const EdgeInsets.only(top: 8, bottom: 32),
                children: [
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Overview',
                            style: theme.textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.w700)),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _MetricTile(
                                label: 'Pending approvals',
                                value: '$pending',
                                color: const Color(0xFFEF6C00),
                                icon: Icons.how_to_vote_rounded,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: _MetricTile(
                                label: 'Flagged reconciliations',
                                value: '$flagged',
                                color: flagged > 0
                                    ? Colors.red
                                    : const Color(0xFF1a8a3e),
                                icon: Icons.rule_rounded,
                              ),
                            ),
                          ],
                        ),
                        if (recon.sessions.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Last reconciliation',
                                  style: theme.textTheme.bodySmall?.copyWith(
                                      color: theme
                                          .colorScheme.onSurface
                                          .withValues(alpha: 0.6))),
                              Text(
                                _currency.format(
                                    recon.sessions.first.totalFeeLedgerAmount),
                                style: theme.textTheme.bodyMedium
                                    ?.copyWith(fontWeight: FontWeight.w700),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  _NavTile(
                    title: 'Purchase Approvals',
                    subtitle: 'Multi-stage approvals with Merkle audit trail',
                    icon: Icons.how_to_vote_rounded,
                    color: const Color(0xFF3F51B5),
                    badge: pending > 0 ? '$pending' : null,
                    onTap: () => context.push('/finance/approvals'),
                  ),
                  _NavTile(
                    title: 'Bank Reconciliation',
                    subtitle: '3-way ledger and bank statement matching',
                    icon: Icons.rule_rounded,
                    color: const Color(0xFFC62828),
                    badge: flagged > 0 ? '$flagged' : null,
                    onTap: () => context.push('/finance/reconciliation'),
                  ),
                ],
              ),
            ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _MetricTile({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 10),
          Text(value,
              style: theme.textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800, color: color)),
          const SizedBox(height: 2),
          Text(label,
              style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.65),
                  height: 1.2)),
        ],
      ),
    );
  }
}

class _NavTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final String? badge;
  final VoidCallback onTap;

  const _NavTile({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AppCard(
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(height: 3),
                Text(subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.6),
                        height: 1.3)),
              ],
            ),
          ),
          if (badge != null)
            StatusBadge(
                label: badge!,
                variant: StatusBadgeVariant.warning,
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3)),
          const SizedBox(width: 6),
          Icon(Icons.chevron_right_rounded,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4)),
        ],
      ),
    );
  }
}
