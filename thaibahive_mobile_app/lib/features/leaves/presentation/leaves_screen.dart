import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';

import '../../../models/leave_balance_model.dart';
import '../../../models/leave_request_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/status_badge.dart';
import '../data/leaves_provider.dart';

class LeavesScreen extends ConsumerStatefulWidget {
  const LeavesScreen({super.key});

  @override
  ConsumerState<LeavesScreen> createState() => _LeavesScreenState();
}

class _LeavesScreenState extends ConsumerState<LeavesScreen> {
  static const _statusOptions = ['all', 'pending', 'approved', 'rejected'];
  String _selectedStatus = 'all';

  static String _statusLabel(String s) {
    switch (s) {
      case 'all': return 'All';
      case 'pending': return 'Pending';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      default: return s;
    }
  }

  @override
  Widget build(BuildContext context) {
    final balancesAsync = ref.watch(leaveBalanceProvider);
    final leavesAsync = ref.watch(leavesListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Requests'),
        actions: [
          IconButton(
            icon: const Icon(Icons.balance_rounded),
            onPressed: () => context.push('/leaves/balance'),
            tooltip: 'Leave Balance',
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        onPressed: () => context.push('/leaves/apply'),
        child: const Icon(Icons.add_rounded),
      ),
      body: RefreshIndicator(
        color: const Color(0xFF1a8a3e),
        onRefresh: () => ref.read(leavesListProvider.notifier).refresh(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // ── Hero Balance Summary Card ──────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 0),
                child: balancesAsync.when(
                  data: (balances) => _HeroSummaryCard(balances: balances),
                  loading: () => _BalanceSummarySkeleton(),
                  error: (_, __) => const SizedBox.shrink(),
                ),
              ),
            ),

            // ── Status Segmented Filter ────────────────────────────────
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
                child: _StatusSegmentedPill(
                  options: _statusOptions,
                  selected: _selectedStatus,
                  labelOf: _statusLabel,
                  onSelected: (s) {
                    setState(() => _selectedStatus = s);
                    ref
                        .read(selectedLeaveStatusProvider.notifier)
                        .state = s;
                  },
                ),
              ),
            ),

            // ── Leave Request List ────────────────────────────────────
            leavesAsync.when(
              data: (leaves) {
                final filtered = _selectedStatus == 'all'
                    ? leaves
                    : leaves.where((l) => l.status == _selectedStatus).toList();
                if (filtered.isEmpty) {
                  return SliverFillRemaining(
                    child: EmptyStateWidget(
                      icon: Icons.beach_access_rounded,
                      title: 'No Leave Requests',
                      message: "You haven't applied for any leave yet.",
                      actionLabel: 'Apply for Leave',
                      onAction: () => context.push('/leaves/apply'),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.only(top: 8, bottom: 80),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (_, i) => _LeaveRequestCard(
                        leave: filtered[i],
                        onTap: () => context.push('/leaves/${filtered[i].id}'),
                      ),
                      childCount: filtered.length,
                    ),
                  ),
                );
              },
              loading: () => const SliverFillRemaining(child: _LeaveListSkeleton()),
              error: (e, _) => SliverFillRemaining(
                child: AppErrorWidget(
                  message: e.toString(),
                  onRetry: () => ref.read(leavesListProvider.notifier).refresh(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Hero Summary Card ────────────────────────────────────────────────────────

class _HeroSummaryCard extends StatelessWidget {
  final List<LeaveBalanceModel> balances;
  const _HeroSummaryCard({required this.balances});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (balances.isEmpty) return const SizedBox.shrink();

    final totalUsed = balances.fold<double>(0, (sum, b) => sum + b.usedDays);
    final totalDays = balances.fold<double>(0, (sum, b) => sum + b.totalDays);
    final remaining = totalDays - totalUsed;
    final ratio = totalDays > 0 ? (totalUsed / totalDays).clamp(0.0, 1.0) : 0.0;

    return AppCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Leave Balance Overview',
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${remaining.toInt()} of ${totalDays.toInt()} days remaining',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                    ),
                  ),
                ],
              ),
              StatusBadge(
                label: '${remaining.toInt()} left',
                variant: StatusBadgeVariant.success,
              ),
            ],
          ),
          const SizedBox(height: 14),
          // Progress bar
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 8,
              backgroundColor: const Color(0xFF1a8a3e).withValues(alpha: 0.1),
              valueColor: AlwaysStoppedAnimation(
                ratio > 0.8 ? Colors.orange : const Color(0xFF1a8a3e),
              ),
            ),
          ),
          const SizedBox(height: 14),
          // Individual balances
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: balances.map((b) {
                final bRatio = b.totalDays > 0 ? (b.usedDays / b.totalDays).clamp(0.0, 1.0) : 0.0;
                return Container(
                  margin: const EdgeInsets.only(right: 10),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1a8a3e).withValues(alpha: isDark ? 0.1 : 0.05),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Text(
                        b.leaveType?.name ?? 'Leave',
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                          fontWeight: FontWeight.w600,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${(b.totalDays - b.usedDays).toInt()}',
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: bRatio > 0.8 ? Colors.orange : const Color(0xFF1a8a3e),
                        ),
                      ),
                      Text('days', style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.45))),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Balance Skeleton ─────────────────────────────────────────────────────────

class _BalanceSummarySkeleton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF2a2e33) : Colors.grey.shade200,
      highlightColor: isDark ? const Color(0xFF3a3e43) : Colors.grey.shade100,
      child: Container(
        height: 140,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(18)),
      ),
    );
  }
}

// ── Segmented Pill ───────────────────────────────────────────────────────────

class _StatusSegmentedPill extends StatelessWidget {
  final List<String> options;
  final String selected;
  final String Function(String) labelOf;
  final ValueChanged<String> onSelected;

  const _StatusSegmentedPill({
    required this.options,
    required this.selected,
    required this.labelOf,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF2a2e33) : const Color(0xFFf0f2f0),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: options.map((opt) {
          final isSelected = opt == selected;
          return Expanded(
            child: GestureDetector(
              onTap: () => onSelected(opt),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeInOut,
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? (isDark ? const Color(0xFF22262b) : Colors.white) : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: isSelected
                      ? [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08), blurRadius: 6, offset: const Offset(0, 1))]
                      : null,
                ),
                child: Text(
                  labelOf(opt),
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 12.5,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected ? const Color(0xFF1a8a3e) : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ── Leave Request Card ───────────────────────────────────────────────────────

class _LeaveRequestCard extends StatelessWidget {
  final LeaveRequestModel leave;
  final VoidCallback onTap;
  const _LeaveRequestCard({required this.leave, required this.onTap});

  static Color _statusColor(String s) {
    switch (s) {
      case 'approved': return const Color(0xFF1a8a3e);
      case 'rejected': return Colors.red;
      case 'pending': return const Color(0xFFFF9800);
      default: return Colors.grey;
    }
  }

  static StatusBadgeVariant _statusVariant(String s) {
    switch (s) {
      case 'approved': return StatusBadgeVariant.success;
      case 'rejected': return StatusBadgeVariant.destructive;
      case 'pending': return StatusBadgeVariant.warning;
      default: return StatusBadgeVariant.secondary;
    }
  }

  static IconData _statusIcon(String s) {
    switch (s) {
      case 'approved': return Icons.check_circle_rounded;
      case 'rejected': return Icons.cancel_rounded;
      case 'pending': return Icons.pending_rounded;
      default: return Icons.beach_access_rounded;
    }
  }

  String _formatDate(String date) {
    try {
      return DateFormat('dd MMM').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _statusColor(leave.status);

    return AppCard(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      padding: const EdgeInsets.all(14),
      onTap: onTap,
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(_statusIcon(leave.status), color: statusColor, size: 24),
          ),
          const SizedBox(width: 13),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  leave.leaveType?.name ?? 'Leave',
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 3),
                Text(
                  '${_formatDate(leave.startDate)} – ${_formatDate(leave.endDate)}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${leave.days.toInt()} day${leave.days > 1 ? 's' : ''}',
                  style: TextStyle(
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
          StatusBadge(
            label: leave.status[0].toUpperCase() + leave.status.substring(1),
            variant: _statusVariant(leave.status),
          ),
        ],
      ),
    );
  }
}

// ── List Skeleton ────────────────────────────────────────────────────────────

class _LeaveListSkeleton extends StatelessWidget {
  const _LeaveListSkeleton();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF2a2e33) : Colors.grey.shade200,
      highlightColor: isDark ? const Color(0xFF3a3e43) : Colors.grey.shade100,
      child: Column(
        children: List.generate(
          4,
          (_) => Container(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            height: 76,
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
          ),
        ),
      ),
    );
  }
}
