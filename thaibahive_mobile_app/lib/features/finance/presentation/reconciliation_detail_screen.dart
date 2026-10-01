import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
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

class ReconciliationDetailScreen extends ConsumerStatefulWidget {
  final String reconciliationId;

  const ReconciliationDetailScreen({
    super.key,
    required this.reconciliationId,
  });

  @override
  ConsumerState<ReconciliationDetailScreen> createState() =>
      _ReconciliationDetailScreenState();
}

class _ReconciliationDetailScreenState
    extends ConsumerState<ReconciliationDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref
        .read(financeReconciliationProvider.notifier)
        .loadDetail(widget.reconciliationId));
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(financeReconciliationProvider);
    final notifier = ref.read(financeReconciliationProvider.notifier);
    final theme = Theme.of(context);
    final session = state.detailSession;

    if (state.detailLoading && session == null) {
      return const AppScaffold(title: 'Reconciliation', body: ListShimmer());
    }

    if (session == null) {
      return AppScaffold(
        title: 'Reconciliation',
        body: AppErrorWidget(
          title: 'Session Unavailable',
          message: state.detailError ?? 'Could not load this session.',
          onRetry: () => notifier.loadDetail(widget.reconciliationId),
        ),
      );
    }

    final matched = state.detailItems.where((i) => i.matchStatus == 'matched').length;
    final open = state.detailItems.where((i) => i.matchStatus == 'unmatched').length;

    return AppScaffold(
      title: 'Reconciliation',
      body: RefreshIndicator(
        onRefresh: () => notifier.loadDetail(widget.reconciliationId),
        child: ListView(
          padding: const EdgeInsets.only(top: 8, bottom: 32),
          children: [
            if (state.notice != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.orange.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                    border:
                        Border.all(color: Colors.orange.withValues(alpha: 0.3)),
                  ),
                  child: Text(state.notice!,
                      style: const TextStyle(fontSize: 12, color: Colors.orange)),
                ),
              ),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${_fmtDate(session.periodStart)} → ${_fmtDate(session.periodEnd)}',
                          style: theme.textTheme.titleMedium
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                      ),
                      StatusBadge(
                        label: labelForStatus(session.status),
                        variant: badgeForStatus(session.status),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  _threeWay(theme, 'Fee ledger', session.totalFeeLedgerAmount),
                  _threeWay(theme, 'Expense ledger', session.totalExpenseLedgerAmount),
                  _threeWay(theme, 'Bank statement', session.totalBankStatementAmount),
                  const Divider(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: Text('Unreconciled variance',
                            style: theme.textTheme.bodyMedium),
                      ),
                      Text(
                        _currency.format(session.unreconciledVariance),
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: session.hasVariance
                              ? Colors.red
                              : const Color(0xFF1a8a3e),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text('$matched matched · $open unmatched',
                      style: theme.textTheme.bodySmall),
                  if (session.auditHash != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'Audit ${session.auditHash!.substring(0, session.auditHash!.length.clamp(0, 16))}…',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontFamily: 'monospace',
                        fontSize: 10,
                        color:
                            theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Line Items',
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text('Tap an open item to resolve it manually.',
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6))),
                  const SizedBox(height: 10),
                  if (state.detailItems.isEmpty)
                    Text('No ledger or bank entries in this period.',
                        style: theme.textTheme.bodySmall),
                  ...state.detailItems.map((item) => _itemTile(context, item, state, notifier)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _threeWay(ThemeData theme, String label, double amount) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(child: Text(label, style: theme.textTheme.bodyMedium)),
          Text(_currency.format(amount),
              style: theme.textTheme.bodyMedium
                  ?.copyWith(fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }

  Widget _itemTile(
    BuildContext context,
    ReconciliationItemModel item,
    FinanceReconciliationState state,
    FinanceReconciliationNotifier notifier,
  ) {
    final theme = Theme.of(context);
    final acting = state.actingIds.contains(item.id);
    final negative = item.amount < 0;

    return InkWell(
      onTap: item.matchStatus == 'matched' || acting
          ? null
          : () => _showMatchSheet(context, item, notifier),
      borderRadius: BorderRadius.circular(10),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    _sourceLabel(item.sourceType),
                    style: theme.textTheme.bodySmall
                        ?.copyWith(color: Colors.grey[600]),
                  ),
                ),
                StatusBadge(
                  label: labelForStatus(item.matchStatus),
                  variant: badgeForStatus(item.matchStatus),
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.sourceReferenceId,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      fontSize: 11,
                    ),
                  ),
                ),
                Text(
                  _currency.format(item.amount),
                  style: theme.textTheme.bodyMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: negative ? Colors.red : null,
                  ),
                ),
              ],
            ),
            if (item.matchedWithId != null && item.matchedWithId!.isNotEmpty)
              Text('↔ ${item.matchedWithId}',
                  style: theme.textTheme.bodySmall?.copyWith(fontSize: 10)),
          ],
        ),
      ),
    );
  }

  void _showMatchSheet(
    BuildContext context,
    ReconciliationItemModel item,
    FinanceReconciliationNotifier notifier,
  ) {
    var matchStatus = 'manual_override';
    final matchedWith = TextEditingController(text: item.matchedWithId ?? '');
    final variance = TextEditingController(text: '${item.varianceAmount}');
    final notes = TextEditingController(text: item.resolutionNotes ?? '');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) => Padding(
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
              Text('Resolve item',
                  style: Theme.of(sheetContext)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 6),
              Text(
                '${_sourceLabel(item.sourceType)} · ${_currency.format(item.amount)}',
                style: Theme.of(sheetContext).textTheme.bodySmall,
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: matchStatus,
                decoration: const InputDecoration(
                  labelText: 'Resolution',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(
                      value: 'manual_override', child: Text('Manual override')),
                  DropdownMenuItem(value: 'matched', child: Text('Matched')),
                  DropdownMenuItem(value: 'variance', child: Text('Variance')),
                  DropdownMenuItem(
                      value: 'unmatched', child: Text('Leave unmatched')),
                ],
                onChanged: (v) =>
                    setSheetState(() => matchStatus = v ?? 'manual_override'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: matchedWith,
                decoration: const InputDecoration(
                  labelText: 'Matched with (bank reference)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: variance,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Variance amount',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notes,
                maxLines: 2,
                decoration: const InputDecoration(
                  labelText: 'Resolution notes',
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
                        notifier.matchItem(
                          item: item,
                          matchStatus: matchStatus,
                          matchedWithId: matchedWith.text.trim(),
                          varianceAmount:
                              double.tryParse(variance.text.trim()) ?? 0,
                          resolutionNotes: notes.text.trim(),
                        );
                      },
                      child: const Text('Save'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _sourceLabel(String sourceType) {
    switch (sourceType) {
      case 'fee_transaction':
        return 'Fee ledger';
      case 'expense_claim':
        return 'Expense ledger';
      case 'bank_statement':
        return 'Bank statement';
      default:
        return sourceType;
    }
  }

  String _fmtDate(String iso) {
    final parsed = DateTime.tryParse(iso);
    if (parsed == null) return iso;
    return DateFormat('dd MMM yyyy').format(parsed);
  }
}
