import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/grievances_provider.dart';

class GrievancesScreen extends ConsumerStatefulWidget {
  const GrievancesScreen({super.key});

  @override
  ConsumerState<GrievancesScreen> createState() => _GrievancesScreenState();
}

class _GrievancesScreenState extends ConsumerState<GrievancesScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(grievancesProvider.notifier).loadGrievances());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(grievancesProvider);
    final notifier = ref.read(grievancesProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Grievances',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/grievances/submit'),
        child: const Icon(Icons.add_rounded),
      ),
      body: state.isLoading
          ? const ListShimmer()
          : state.error != null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.loadGrievances(),
                )
              : state.grievances.isEmpty
                  ? const EmptyStateWidget(
                      message: 'No grievances',
                      icon: Icons.feedback_rounded)
                  : RefreshIndicator(
                      onRefresh: () => notifier.loadGrievances(),
                      child: ListView.builder(
                        itemCount: state.grievances.length,
                        itemBuilder: (_, i) {
                          final g = state.grievances[i];
                          return Card(
                            margin: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 4),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor:
                                    _statusColor(g.status, theme)
                                        .withValues(alpha: 0.2),
                                child: Icon(Icons.feedback_rounded,
                                    color: _statusColor(g.status, theme),
                                    size: 22),
                              ),
                              title: Text(g.subject,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  if (g.category != null)
                                    Text(g.category!),
                                  if (!g.isAnonymous &&
                                      g.userName != null)
                                    Text('By: ${g.userName}'),
                                  Text(g.createdAt.toDisplayDateTime(),
                                      style:
                                          theme.textTheme.bodySmall),
                                ],
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _statusColor(g.status, theme)
                                      .withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(g.status,
                                    style: TextStyle(
                                      color:
                                          _statusColor(g.status, theme),
                                      fontSize: 12,
                                      fontWeight: FontWeight.w600,
                                    )),
                              ),
                              isThreeLine: true,
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  Color _statusColor(String status, ThemeData theme) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'under_review':
        return Colors.blue;
      case 'resolved':
        return Colors.green;
      case 'dismissed':
        return Colors.grey;
      default:
        return theme.colorScheme.primary;
    }
  }
}
