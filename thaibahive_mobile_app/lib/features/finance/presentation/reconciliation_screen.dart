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

final _currency = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);

class ReconciliationScreen extends ConsumerStatefulWidget {
  const ReconciliationScreen({super.key});

  @override
  ConsumerState<ReconciliationScreen> createState() =>
      _ReconciliationScreenState();
}

class _ReconciliationScreenState extends ConsumerState<ReconciliationScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(financeReconciliationProvider.notifier).load());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(financeReconciliationProvider);
    final notifier = ref.read(financeReconciliationProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Bank Reconciliation',
      body: state.isLoading && state.sessions.isEmpty
          ? const ListShimmer()
          : state.error != null && state.sessions.isEmpty
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.load(),
                )
              : state.sessions.isEmpty
                  ? const EmptyStateWidget(
                      message:
                          'No reconciliation sessions yet. Run one from the web console.',
                      icon: Icons.rule_rounded)
                  : RefreshIndicator(
                      onRefresh: () => notifier.load(),
                      child: ListView.builder(
                        padding: const EdgeInsets.only(top: 8, bottom: 32),
                        itemCount: state.sessions.length,
                        itemBuilder: (_, i) => _sessionCard(
                            context, state.sessions[i], theme, notifier),
                      ),
                    ),
    );
  }

  Widget _sessionCard(
    BuildContext context,
    ReconciliationSessionModel session,
    ThemeData theme,
    FinanceReconciliationNotifier notifier,
  ) {
    return AppCard(
      onTap: () => context.push('/finance/reconciliation/${session.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  '${_formatDate(session.periodStart)} → ${_formatDate(session.periodEnd)}',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
              ),
              StatusBadge(
                label: labelForStatus(session.status),
                variant: badgeForStatus(session.status),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _miniStat(theme, 'Fee ledger', _currency.format(session.totalFeeLedgerAmount)),
              _miniStat(theme, 'Expense', _currency.format(session.totalExpenseLedgerAmount)),
              _miniStat(theme, 'Bank', _currency.format(session.totalBankStatementAmount)),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Icon(
                session.hasVariance
                    ? Icons.warning_amber_rounded
                    : Icons.check_circle_outline_rounded,
                size: 16,
                color: session.hasVariance ? Colors.red : const Color(0xFF1a8a3e),
              ),
              const SizedBox(width: 6),
              Text(
                'Variance ${_currency.format(session.unreconciledVariance)}',
                style: theme.textTheme.bodySmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: session.hasVariance
                      ? Colors.red
                      : const Color(0xFF1a8a3e),
                ),
              ),
              const Spacer(),
              Text(
                '${session.matchedItemCount} matched · ${session.unmatchedItemCount} open',
                style: theme.textTheme.bodySmall,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _miniStat(ThemeData theme, String label, String value) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                  fontSize: 10)),
          const SizedBox(height: 2),
          Text(value,
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w700, fontSize: 13)),
        ],
      ),
    );
  }

  String _formatDate(String iso) {
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return DateFormat('dd MMM yyyy').format(parsed);
  }
}
