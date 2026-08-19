import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/features/dashboard/data/workspace_provider.dart';

class PrincipalWorkspaceScreen extends ConsumerWidget {
  const PrincipalWorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final state = ref.watch(workspaceStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Principal Workspace'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: () => ref.read(workspaceStateProvider.notifier).refresh(),
            constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(workspaceStateProvider.notifier).refresh(),
        child: state.isLoading && state.data == null
            ? _buildSkeleton(context)
            : state.error != null && state.data == null
                ? _buildError(context, state.error!, ref)
                : _buildContent(context, theme, state.data),
      ),
    );
  }

  Widget _buildSkeleton(BuildContext context) {
    return Shimmer.fromColors(
      baseColor: Theme.of(context).colorScheme.surfaceVariant,
      highlightColor: Theme.of(context).colorScheme.surface,
      child: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.section),
        itemCount: 4,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.normal),
        itemBuilder: (_, __) => Container(
          height: 100,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppRadius.card),
          ),
        ),
      ),
    );
  }

  Widget _buildError(BuildContext context, String error, WidgetRef ref) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Theme.of(context).colorScheme.error),
          const SizedBox(height: 16),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 16),
          SizedBox(
            height: 44,
            child: ElevatedButton(
              onPressed: () => ref.read(workspaceStateProvider.notifier).refresh(),
              child: const Text('Retry'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildContent(BuildContext context, ThemeData theme, Map<String, dynamic>? data) {
    final workspaceData = data?['data'] as Map<String, dynamic>? ?? {};
    final staffTotal = workspaceData['staffTotal'] as int? ?? 0;
    final presentToday = workspaceData['presentToday'] as int? ?? 0;
    final pendingApprovals = workspaceData['pendingApprovals'] as int? ?? 0;
    final feeCollected = workspaceData['feeCollectedToday'] as num? ?? 0;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.section),
      children: [
        _MetricCard(
          title: 'Staff Attendance',
          value: '$presentToday / $staffTotal',
          subtitle: 'Present today',
          icon: Icons.people,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: AppSpacing.normal),
        _MetricCard(
          title: 'Pending Approvals',
          value: '$pendingApprovals',
          subtitle: 'Awaiting action',
          icon: Icons.pending_actions,
          color: theme.colorScheme.tertiary,
        ),
        const SizedBox(height: AppSpacing.normal),
        _MetricCard(
          title: "Today's Fee Collection",
          value: '\u20b9${feeCollected.toStringAsFixed(0)}',
          subtitle: 'Collected today',
          icon: Icons.currency_rupee,
          color: Colors.green,
        ),
      ],
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _MetricCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.section),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(width: AppSpacing.normal),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    value,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
