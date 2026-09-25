import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shimmer/shimmer.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/features/dashboard/data/workspace_provider.dart';

class ParentWorkspaceScreen extends ConsumerWidget {
  const ParentWorkspaceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final state = ref.watch(workspaceStateProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Parent Workspace'),
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
        itemCount: 3,
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
    final childrenList = (workspaceData['children'] as List<dynamic>?) ?? [];
    final pendingFeeTotal = workspaceData['pendingFeeTotal'] as num? ?? 0;
    final invoiceCount = workspaceData['invoiceCount'] as int? ?? 0;

    return ListView(
      padding: const EdgeInsets.all(AppSpacing.section),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.section),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.people_alt_outlined, color: theme.colorScheme.primary),
                    const SizedBox(width: 8),
                    Text(
                      'Children Attendance',
                      style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.normal),
                if (childrenList.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8.0),
                    child: Text('No student records found.', style: TextStyle(fontStyle: FontStyle.italic)),
                  )
                else
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: childrenList.length,
                    separatorBuilder: (_, __) => const Divider(height: 16),
                    itemBuilder: (context, index) {
                      final child = childrenList[index] as Map<String, dynamic>;
                      final name = child['studentName'] as String? ?? 'Student';
                      final status = child['attendanceStatus'] as String? ?? 'unknown';

                      Color statusColor;
                      switch (status.toLowerCase()) {
                        case 'present':
                          statusColor = Colors.green;
                          break;
                        case 'absent':
                          statusColor = theme.colorScheme.error;
                          break;
                        default:
                          statusColor = Colors.grey;
                      }

                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
                          Chip(
                            label: Text(
                              status.toUpperCase(),
                              style: const TextStyle(color: Colors.white, fontSize: 10),
                            ),
                            backgroundColor: statusColor,
                            padding: EdgeInsets.zero,
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                        ],
                      );
                    },
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.normal),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.section),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.amber.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.credit_card_outlined, color: Colors.amber, size: 24),
                ),
                const SizedBox(width: AppSpacing.normal),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'School Fees Outstanding',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withOpacity(0.6),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '\u20b9${pendingFeeTotal.toStringAsFixed(0)}',
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        invoiceCount > 0 ? '$invoiceCount invoice(s) due' : 'No pending payments',
                        style: theme.textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
