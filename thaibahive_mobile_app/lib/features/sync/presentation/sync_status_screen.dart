import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/features/sync/data/sync_status_providers.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';

class SyncStatusScreen extends ConsumerWidget {
  const SyncStatusScreen({super.key});

  bool _canManageSync(WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    if (user == null) return false;
    final role = user.role.toLowerCase();
    return role == 'super_admin' || role == 'admin' || role == 'principal';
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final syncState = ref.watch(syncStatusProvider);
    final notifier = ref.read(syncStatusProvider.notifier);
    final canManage = _canManageSync(ref);

    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text(
            'Sync Status & Conflicts',
            style: TextStyle(fontFamily: 'PlusJakartaSans', fontWeight: FontWeight.w700),
          ),
          actions: [
            IconButton(
              icon: syncState.isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.refresh_rounded),
              tooltip: 'Refresh & Sync',
              onPressed: syncState.isLoading ? null : () => notifier.refresh(),
            ),
            if (syncState.dlqEvents.isNotEmpty)
              TextButton.icon(
                onPressed: () async {
                  await notifier.retryAll();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Retrying all failed actions...')),
                    );
                  }
                },
                icon: const Icon(Icons.replay_rounded, size: 16),
                label: const Text('Retry All'),
              ),
          ],
          bottom: TabBar(
            labelColor: theme.colorScheme.primary,
            unselectedLabelColor: theme.colorScheme.onSurfaceVariant,
            indicatorColor: theme.colorScheme.primary,
            tabs: [
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Failed (DLQ)'),
                    if (syncState.dlqEvents.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      _CountBadge(count: syncState.dlqEvents.length, color: Colors.red),
                    ],
                  ],
                ),
              ),
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Conflicts'),
                    if (syncState.conflicts.isNotEmpty || syncState.conflictEvents.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      _CountBadge(
                        count: syncState.conflicts.length + syncState.conflictEvents.length,
                        color: Colors.orange,
                      ),
                    ],
                  ],
                ),
              ),
              Tab(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Queue'),
                    if (syncState.pendingEvents.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      _CountBadge(count: syncState.pendingEvents.length, color: Colors.blue),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        body: syncState.error != null && syncState.conflicts.isEmpty && syncState.dlqEvents.isEmpty
            ? AppErrorWidget(
                message: syncState.error!,
                onRetry: () => notifier.refresh(),
              )
            : TabBarView(
                children: [
                _DlqTab(
                  dlqEvents: syncState.dlqEvents,
                  onRetry: (id) => notifier.retryEvent(id),
                  onDiscard: (id) => notifier.discardEvent(id),
                  onRefresh: () => notifier.refresh(),
                ),
                _ConflictsTab(
                  serverConflicts: syncState.conflicts,
                  localConflictEvents: syncState.conflictEvents,
                  canManage: canManage,
                  isResolving: syncState.isResolving,
                  onResolve: (id, fields) => notifier.resolveConflict(id, fields),
                  onRefresh: () => notifier.refresh(),
                ),
                _QueueSummaryTab(
                  pendingEvents: syncState.pendingEvents,
                  completedCount: syncState.completedReceiptsCount,
                  lastSyncedAt: syncState.lastSyncedAt,
                  onSyncNow: () => notifier.refresh(),
                  onRefresh: () => notifier.refresh(),
                ),
              ],
            ),
      ),
    );
  }
}

class _CountBadge extends StatelessWidget {
  final int count;
  final Color color;

  const _CountBadge({required this.count, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text(
        '$count',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

class _DlqTab extends StatelessWidget {
  final List<OfflineEvent> dlqEvents;
  final ValueChanged<String> onRetry;
  final ValueChanged<String> onDiscard;
  final Future<void> Function() onRefresh;

  const _DlqTab({
    required this.dlqEvents,
    required this.onRetry,
    required this.onDiscard,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (dlqEvents.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          children: const [
            SizedBox(height: 80),
            EmptyStateWidget(
              title: 'No Failed Actions',
              message: 'All queued offline actions have been synced successfully or resolved.',
              icon: Icons.check_circle_outline_rounded,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.section),
        itemCount: dlqEvents.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.normal),
        itemBuilder: (context, index) {
          final event = dlqEvents[index];
          final theme = Theme.of(context);

          return Card(
            elevation: AppElevation.level1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.card),
              side: BorderSide(color: theme.colorScheme.error.withValues(alpha: 0.3)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.section),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.sync_problem_rounded, color: theme.colorScheme.error, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            event.type,
                            style: theme.textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w700,
                              fontFamily: 'PlusJakartaSans',
                            ),
                          ),
                        ],
                      ),
                      StatusBadge(
                        label: 'Failed (${event.retryCount} attempts)',
                        variant: StatusBadgeVariant.destructive,
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (event.errorMessage != null && event.errorMessage!.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.error.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(AppRadius.button),
                      ),
                      child: Text(
                        event.errorMessage!,
                        style: TextStyle(
                          color: theme.colorScheme.error,
                          fontSize: 12,
                          fontFamily: 'PlusJakartaSans',
                        ),
                      ),
                    ),
                  const SizedBox(height: 8),
                  Text(
                    'Created: ${event.createdAt.toLocal().toString().substring(0, 16)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      OutlinedButton.icon(
                        onPressed: () => onDiscard(event.clientEventId),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: theme.colorScheme.error,
                          side: BorderSide(color: theme.colorScheme.error.withValues(alpha: 0.5)),
                        ),
                        icon: const Icon(Icons.delete_outline_rounded, size: 16),
                        label: const Text('Discard'),
                      ),
                      const SizedBox(width: 12),
                      FilledButton.icon(
                        onPressed: () => onRetry(event.clientEventId),
                        icon: const Icon(Icons.replay_rounded, size: 16),
                        label: const Text('Retry Now'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _ConflictsTab extends StatelessWidget {
  final List<SyncConflictModel> serverConflicts;
  final List<OfflineEvent> localConflictEvents;
  final bool canManage;
  final bool isResolving;
  final Future<bool> Function(String conflictId, Map<String, dynamic> chosenFields) onResolve;
  final Future<void> Function() onRefresh;

  const _ConflictsTab({
    required this.serverConflicts,
    required this.localConflictEvents,
    required this.canManage,
    required this.isResolving,
    required this.onResolve,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (serverConflicts.isEmpty && localConflictEvents.isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          children: const [
            SizedBox(height: 80),
            EmptyStateWidget(
              title: 'No Data Conflicts',
              message: 'There are no pending data conflicts requiring review or manual resolution.',
              icon: Icons.verified_user_rounded,
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.section),
        children: [
          if (serverConflicts.isNotEmpty) ...[
            ...serverConflicts.map((conflict) => _ServerConflictCard(
                  conflict: conflict,
                  canManage: canManage,
                  isResolving: isResolving,
                  onResolve: onResolve,
                )),
          ],
          if (localConflictEvents.isNotEmpty) ...[
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              child: Text(
                'Local Conflict Events (${localConflictEvents.length})',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
            ...localConflictEvents.map((event) => _LocalConflictCard(event: event)),
          ],
        ],
      ),
    );
  }
}

class _ServerConflictCard extends StatelessWidget {
  final SyncConflictModel conflict;
  final bool canManage;
  final bool isResolving;
  final Future<bool> Function(String conflictId, Map<String, dynamic> chosenFields) onResolve;

  const _ServerConflictCard({
    required this.conflict,
    required this.canManage,
    required this.isResolving,
    required this.onResolve,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isNeedsReview = conflict.status == 'NEEDS_REVIEW';
    final canResolve = !isNeedsReview || canManage;

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.normal),
      elevation: AppElevation.level1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.card),
        side: BorderSide(
          color: isNeedsReview ? Colors.deepPurple.shade300 : Colors.amber.shade400,
          width: 1.5,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.section),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(
                      isNeedsReview ? Icons.admin_panel_settings_rounded : Icons.difference_rounded,
                      color: isNeedsReview ? Colors.deepPurple : Colors.orange,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '${conflict.entityType.toUpperCase()} CONFLICT',
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w700,
                        fontFamily: 'PlusJakartaSans',
                      ),
                    ),
                  ],
                ),
                StatusBadge(
                  label: conflict.status,
                  variant: isNeedsReview ? StatusBadgeVariant.secondary : StatusBadgeVariant.warning,
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Conflicting Fields: ${conflict.fields.join(", ")}',
              style: theme.textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(AppRadius.button),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Client Offline Payload:',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  ...conflict.payload.entries.map(
                    (entry) => Padding(
                      padding: const EdgeInsets.symmetric(vertical: 2),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '• ${entry.key}: ',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                          ),
                          Expanded(
                            child: Text(
                              '${entry.value}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (isNeedsReview && !canManage) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.deepPurple.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline_rounded, size: 16, color: Colors.deepPurple),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'This conflict requires administrator review (sync:manage permission).',
                        style: TextStyle(fontSize: 12, color: Colors.deepPurple),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            if (canResolve)
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton(
                    onPressed: isResolving
                        ? null
                        : () async {
                            // Keep Server Version = submit empty fields
                            final success = await onResolve(conflict.id, {});
                            if (context.mounted && success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Server version retained.')),
                              );
                            }
                          },
                    child: const Text('Keep Server'),
                  ),
                  const SizedBox(width: 12),
                  FilledButton(
                    onPressed: isResolving
                        ? null
                        : () async {
                            // Keep My Version = submit payload
                            final success = await onResolve(conflict.id, conflict.payload);
                            if (context.mounted && success) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Your version applied.')),
                              );
                            }
                          },
                    child: const Text('Keep Mine'),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class _LocalConflictCard extends StatelessWidget {
  final OfflineEvent event;

  const _LocalConflictCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final details = event.conflictDetails ?? {};

    return Card(
      margin: const EdgeInsets.only(bottom: AppSpacing.normal),
      elevation: AppElevation.level0,
      color: theme.colorScheme.surfaceContainerHighest,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.card),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.section),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  event.type,
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                const StatusBadge(
                  label: 'Local Conflict',
                  variant: StatusBadgeVariant.warning,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              'Event ID: ${event.clientEventId}',
              style: theme.textTheme.bodySmall,
            ),
            if (details.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                'Details: $details',
                style: theme.textTheme.bodySmall?.copyWith(fontFamily: 'monospace'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _QueueSummaryTab extends StatelessWidget {
  final List<OfflineEvent> pendingEvents;
  final int completedCount;
  final DateTime? lastSyncedAt;
  final VoidCallback onSyncNow;
  final Future<void> Function() onRefresh;

  const _QueueSummaryTab({
    required this.pendingEvents,
    required this.completedCount,
    required this.lastSyncedAt,
    required this.onSyncNow,
    required this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return RefreshIndicator(
      onRefresh: onRefresh,
      child: ListView(
        padding: const EdgeInsets.all(AppSpacing.section),
        children: [
          Card(
            elevation: AppElevation.level1,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(AppRadius.card),
            ),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.section),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _StatColumn(
                        label: 'Pending',
                        value: '${pendingEvents.length}',
                        color: Colors.blue,
                      ),
                      _StatColumn(
                        label: 'Synced Receipts',
                        value: '$completedCount',
                        color: Colors.green,
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Last Sync Attempt:',
                        style: theme.textTheme.bodySmall,
                      ),
                      Text(
                        lastSyncedAt != null
                            ? lastSyncedAt!.toLocal().toString().substring(11, 19)
                            : 'Not yet synced',
                        style: theme.textTheme.bodySmall?.copyWith(fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: onSyncNow,
                      icon: const Icon(Icons.sync_rounded),
                      label: const Text('Drain Queue Now'),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Text(
              'Pending Queue Items (${pendingEvents.length})',
              style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 8),
          if (pendingEvents.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24.0),
              child: Center(
                child: Text('No actions waiting in queue.'),
              ),
            )
          else
            ...pendingEvents.map(
              (event) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: const Icon(Icons.schedule_rounded, color: Colors.blue),
                  title: Text(event.type, style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text(
                    'Created: ${event.createdAt.toLocal().toString().substring(11, 19)}',
                  ),
                  trailing: StatusBadge(
                    label: event.status.name.toUpperCase(),
                    variant: StatusBadgeVariant.info,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatColumn extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatColumn({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: color,
            fontFamily: 'PlusJakartaSans',
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.grey),
        ),
      ],
    );
  }
}
