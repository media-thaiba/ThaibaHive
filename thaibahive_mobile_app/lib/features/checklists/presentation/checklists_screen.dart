import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/checklists_provider.dart';

class ChecklistsScreen extends ConsumerStatefulWidget {
  const ChecklistsScreen({super.key});

  @override
  ConsumerState<ChecklistsScreen> createState() => _ChecklistsScreenState();
}

class _ChecklistsScreenState extends ConsumerState<ChecklistsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(checklistsProvider.notifier).loadAssignments());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(checklistsProvider);
    final notifier = ref.read(checklistsProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Checklists',
      showBack: false,
      body: state.isLoading
          ? const ListShimmer()
          : state.error != null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.loadAssignments(),
                )
              : state.assignments.isEmpty
                  ? const EmptyStateWidget(
                      message: 'No checklist assignments',
                      icon: Icons.checklist_rounded)
                  : RefreshIndicator(
                      onRefresh: () => notifier.loadAssignments(),
                      child: ListView.builder(
                        itemCount: state.assignments.length,
                        itemBuilder: (_, i) {
                          final a = state.assignments[i];
                          final tasks = a.tasks ?? [];
                          final completed = tasks.where((t) => t.isCompleted).length;
                          final pct = tasks.isEmpty ? 0.0 : completed / tasks.length;
                          return Card(
                            margin: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 4),
                            child: ExpansionTile(
                              leading: CircleAvatar(
                                backgroundColor: pct >= 1.0
                                    ? Colors.green.withValues(alpha: 0.2)
                                    : Colors.orange.withValues(alpha: 0.2),
                                child: Icon(
                                  pct >= 1.0
                                      ? Icons.check_circle_rounded
                                      : Icons.checklist_rounded,
                                  color: pct >= 1.0
                                      ? Colors.green
                                      : Colors.orange,
                                ),
                              ),
                              title: Text(a.type,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  Text(
                                      '$completed/${tasks.length} completed'),
                                  const SizedBox(height: 4),
                                  ClipRRect(
                                    borderRadius:
                                        BorderRadius.circular(4),
                                    child: LinearProgressIndicator(
                                      value: pct,
                                      minHeight: 6,
                                      backgroundColor: theme
                                          .colorScheme.primary
                                          .withValues(alpha: 0.15),
                                    ),
                                  ),
                                ],
                              ),
                              children: tasks.map((task) {
                                return CheckboxListTile(
                                  dense: true,
                                  title: Text(task.title,
                                      style: TextStyle(
                                        decoration: task.isCompleted
                                            ? TextDecoration
                                                .lineThrough
                                            : null,
                                        color: task.isCompleted
                                            ? Colors.grey
                                            : null,
                                      )),
                                  value: task.isCompleted,
                                  onChanged: (_) {},
                                  secondary: task.isCompleted
                                      ? Icon(Icons.check_circle,
                                          color: Colors.green)
                                      : Icon(Icons.radio_button_unchecked,
                                          color: Colors.grey),
                                );
                              }).toList(),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }
}
