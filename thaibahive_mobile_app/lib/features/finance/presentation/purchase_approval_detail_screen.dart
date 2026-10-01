import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/status_badge.dart';
import '../data/finance_models.dart';
import '../data/finance_provider.dart';
import 'finance_status.dart';

final _currency = NumberFormat.currency(locale: 'en_IN', symbol: '₹');

/// Purchase approval detail — also the target of the
/// `thaibahive://finance/approvals/:id` deep link.
class PurchaseApprovalDetailScreen extends ConsumerStatefulWidget {
  final String purchaseRequestId;

  const PurchaseApprovalDetailScreen({
    super.key,
    required this.purchaseRequestId,
  });

  @override
  ConsumerState<PurchaseApprovalDetailScreen> createState() =>
      _PurchaseApprovalDetailScreenState();
}

class _PurchaseApprovalDetailScreenState
    extends ConsumerState<PurchaseApprovalDetailScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final notifier = ref.read(financeApprovalsProvider.notifier);
      if (ref.read(financeApprovalsProvider).approvals.isEmpty) {
        await notifier.load();
      }
      await notifier.verifyAuditTrail(widget.purchaseRequestId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(financeApprovalsProvider);
    final notifier = ref.read(financeApprovalsProvider.notifier);
    final theme = Theme.of(context);

    PurchaseApprovalModel? purchase;
    for (final p in state.approvals) {
      if (p.id == widget.purchaseRequestId) {
        purchase = p;
        break;
      }
    }

    if (state.isLoading && purchase == null) {
      return const AppScaffold(title: 'Approval', body: ListShimmer());
    }

    if (purchase == null) {
      return AppScaffold(
        title: 'Approval',
        body: AppErrorWidget(
          title: 'Request Not Found',
          message: 'This purchase request is unavailable or was removed.',
          onRetry: () => notifier.load(),
        ),
      );
    }

    final verification = state.verification;
    final verifying = state.verifyingId == widget.purchaseRequestId;

    return AppScaffold(
      title: 'Approval Detail',
      body: ListView(
        padding: const EdgeInsets.only(top: 8, bottom: 32),
        children: [
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        purchase.itemName,
                        style: theme.textTheme.titleLarge
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                    ),
                    StatusBadge(
                      label: labelForStatus(purchase.status),
                      variant: badgeForStatus(purchase.status),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _kv('Quantity', '${purchase.quantity}'),
                _kv('Estimated cost', _currency.format(purchase.estimatedCost)),
                _kv('Requester', purchase.requesterId),
                _kv(
                  'Requested',
                  purchase.createdAt?.toDisplayDate() ?? '—',
                ),
                if (purchase.justification != null &&
                    purchase.justification!.isNotEmpty)
                  _kv('Justification', purchase.justification!),
                if (purchase.notes != null && purchase.notes!.isNotEmpty)
                  _kv('Notes', purchase.notes!),
              ],
            ),
          ),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.verified_user_rounded,
                        size: 18, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text('Merkle Audit Chain',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700)),
                  ],
                ),
                const SizedBox(height: 12),
                if (verifying)
                  const Center(
                      child: Padding(
                    padding: EdgeInsets.all(12),
                    child: CircularProgressIndicator(strokeWidth: 3),
                  ))
                else if (verification != null) ...[
                  Row(
                    children: [
                      StatusBadge(
                        label: verification.isValid ? 'VALID' : 'TAMPERED',
                        variant: verification.isValid
                            ? StatusBadgeVariant.success
                            : StatusBadgeVariant.destructive,
                      ),
                      const SizedBox(width: 10),
                      Text('${verification.totalLogs} log(s)',
                          style: theme.textTheme.bodySmall),
                    ],
                  ),
                  if (!verification.isValid &&
                      verification.tamperedAt != null) ...[
                    const SizedBox(height: 8),
                    Text('Broken at ${verification.tamperedAt}',
                        style: theme.textTheme.bodySmall
                            ?.copyWith(color: Colors.red)),
                  ],
                ] else ...[
                  Text('Verification unavailable',
                      style: theme.textTheme.bodySmall),
                ],
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton.icon(
                    onPressed: verifying
                        ? null
                        : () => notifier
                            .verifyAuditTrail(widget.purchaseRequestId),
                    icon: const Icon(Icons.refresh_rounded, size: 16),
                    label: const Text('Re-verify'),
                  ),
                ),
              ],
            ),
          ),
          if (state.logs.isNotEmpty)
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Audit Log',
                      style: theme.textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 10),
                  ...state.logs.map(
                    (log) => _AuditLogTile(log: log),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _kv(String key, String value) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(key,
                style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.6))),
          ),
          Expanded(
            child: Text(value,
                style: theme.textTheme.bodyMedium
                    ?.copyWith(fontWeight: FontWeight.w600)),
          ),
        ],
      ),
    );
  }
}

class _AuditLogTile extends StatelessWidget {
  final ApprovalLogModel log;

  const _AuditLogTile({required this.log});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isApproval = log.action == 'approved';
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              StatusBadge(
                label: 'TIER ${log.tierLevel}',
                variant: StatusBadgeVariant.info,
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  log.action.toUpperCase(),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: isApproval ? const Color(0xFF1a8a3e) : Colors.red,
                  ),
                ),
              ),
              if (log.actionTimestamp != null)
                Text(
                  log.actionTimestamp!.toDisplayDate(),
                  style: theme.textTheme.bodySmall,
                ),
            ],
          ),
          if (log.comments != null && log.comments!.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text(log.comments!, style: theme.textTheme.bodySmall),
          ],
          const SizedBox(height: 6),
          Text(
            log.merkleAuditHash,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.bodySmall?.copyWith(
              fontFamily: 'monospace',
              fontSize: 10,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
            ),
          ),
        ],
      ),
    );
  }
}
