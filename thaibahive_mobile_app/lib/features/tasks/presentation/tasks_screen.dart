import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:thaibahive_mobile/features/tasks/data/tasks_provider.dart';
import 'package:thaibahive_mobile/models/task_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen> {
  static const _statusOptions = ['all', 'todo', 'in_progress', 'completed'];
  static const _priorityOptions = ['low', 'medium', 'high', 'urgent'];

  // Active priority filter selections (empty = all)
  final Set<String> _activePriorities = {};

  // Returns active filter count — only counts non-default states
  int get _activeFilterCount => _activePriorities.length;

  void _showFilterBottomSheet(BuildContext context, String currentStatus) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    // Local copies for the sheet
    final tempPriorities = Set<String>.from(_activePriorities);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      backgroundColor: isDark ? const Color(0xFF22262b) : Colors.white,
      isScrollControlled: true,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setSheetState) {
            return Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 36,
                      height: 4,
                      decoration: BoxDecoration(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Filter Tasks', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                      TextButton(
                        onPressed: () {
                          setSheetState(() => tempPriorities.clear());
                        },
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          minimumSize: Size.zero,
                        ),
                        child: const Text('Clear All', style: TextStyle(fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'PRIORITY',
                    style: theme.textTheme.labelSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _priorityOptions.map((p) {
                      final isSelected = tempPriorities.contains(p);
                      final color = _priorityColor(p);
                      return GestureDetector(
                        onTap: () {
                          setSheetState(() {
                            if (isSelected) {
                              tempPriorities.remove(p);
                            } else {
                              tempPriorities.add(p);
                            }
                          });
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          curve: Curves.easeInOut,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
                          decoration: BoxDecoration(
                            color: isSelected ? color.withValues(alpha: 0.12) : Colors.transparent,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: isSelected ? color : theme.colorScheme.onSurface.withValues(alpha: 0.15),
                              width: isSelected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (isSelected) ...[
                                Icon(Icons.check_rounded, size: 14, color: color),
                                const SizedBox(width: 6),
                              ],
                              Text(
                                p[0].toUpperCase() + p.substring(1),
                                style: TextStyle(
                                  fontFamily: 'PlusJakartaSans',
                                  fontSize: 13,
                                  fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                                  color: isSelected ? color : theme.colorScheme.onSurface.withValues(alpha: 0.7),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 28),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: () {
                        setState(() {
                          _activePriorities
                            ..clear()
                            ..addAll(tempPriorities);
                        });
                        // Apply priority filter — use first selected or 'all'
                        final pFilter = tempPriorities.isEmpty ? 'all' : tempPriorities.first;
                        ref.read(tasksProvider.notifier).setPriorityFilter(pFilter);
                        Navigator.pop(ctx);
                      },
                      child: const Text('Apply Filters'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = ref.watch(tasksProvider);
    final taskCount = state.filteredTasks.length;

    return Scaffold(
      appBar: AppBar(title: const Text('Tasks')),
      floatingActionButton: FloatingActionButton(
        heroTag: null,
        onPressed: () async {
          await context.push('/tasks/create');
          ref.read(tasksProvider.notifier).refresh();
        },
        child: const Icon(Icons.add_rounded),
      ),
      body: RefreshIndicator(
        color: const Color(0xFF1a8a3e),
        onRefresh: () => ref.read(tasksProvider.notifier).refresh(),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Text(
                          'Tasks',
                          style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(width: 10),
                        if (!state.isLoading)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF1a8a3e).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '$taskCount',
                              style: const TextStyle(
                                fontFamily: 'PlusJakartaSans',
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF1a8a3e),
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    // ── Single row: status segmented pill + Filter button ──
                    Row(
                      children: [
                        Expanded(
                          child: _StatusSegmentedPill(
                            options: _statusOptions,
                            selected: state.statusFilter,
                            onSelected: (f) => ref.read(tasksProvider.notifier).setStatusFilter(f),
                          ),
                        ),
                        const SizedBox(width: 10),
                        _FilterButton(
                          activeCount: _activeFilterCount,
                          onTap: () => _showFilterBottomSheet(context, state.statusFilter),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
            ),
            if (state.isLoading && state.tasks.isEmpty)
              const SliverFillRemaining(child: Center(child: CircularProgressIndicator()))
            else if (state.error != null && state.tasks.isEmpty)
              SliverFillRemaining(
                child: AppErrorWidget(
                  message: state.error!,
                  onRetry: () => ref.read(tasksProvider.notifier).refresh(),
                ),
              )
            else if (state.filteredTasks.isEmpty)
              SliverFillRemaining(
                child: EmptyStateWidget(
                  icon: Icons.checklist_rounded,
                  title: 'No tasks found',
                  message: 'Create your first task to get started',
                  actionLabel: 'Create Task',
                  onAction: () async {
                    await context.push('/tasks/create');
                    ref.read(tasksProvider.notifier).refresh();
                  },
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, index) {
                    final task = state.filteredTasks[index];
                    return _TaskCard(
                      task: task,
                      onTap: () async {
                        await context.push('/tasks/${task.id}');
                        ref.read(tasksProvider.notifier).refresh();
                      },
                      onDelete: () => ref.read(tasksProvider.notifier).deleteTask(task.id),
                    );
                  },
                  childCount: state.filteredTasks.length,
                ),
              ),
          ],
        ),
      ),
    );
  }

  static Color _priorityColor(String p) {
    switch (p) {
      case 'urgent': return Colors.red;
      case 'high': return const Color(0xFFFF9800);
      case 'medium': return const Color(0xFF2196F3);
      default: return Colors.grey;
    }
  }
}

// ── Status Segmented Pill ────────────────────────────────────────────────────

class _StatusSegmentedPill extends StatelessWidget {
  final List<String> options;
  final String selected;
  final ValueChanged<String> onSelected;

  const _StatusSegmentedPill({
    required this.options,
    required this.selected,
    required this.onSelected,
  });

  static String _label(String s) {
    switch (s) {
      case 'all': return 'All';
      case 'todo': return 'To Do';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Done';
      default: return s;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Container(
        padding: const EdgeInsets.all(3),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF2a2e33) : const Color(0xFFf0f2f0),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: options.map((opt) {
            final isSelected = opt == selected;
            return GestureDetector(
              onTap: () => onSelected(opt),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                curve: Curves.easeInOut,
                padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 7),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (isDark ? const Color(0xFF22262b) : Colors.white)
                      : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: isSelected
                      ? [BoxShadow(color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.08), blurRadius: 6, offset: const Offset(0, 1))]
                      : null,
                ),
                child: Text(
                  _label(opt),
                  style: TextStyle(
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 12.5,
                    fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                    color: isSelected
                        ? const Color(0xFF1a8a3e)
                        : theme.colorScheme.onSurface.withValues(alpha: 0.5),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ),
    );
  }
}

// ── Filter Button ────────────────────────────────────────────────────────────

class _FilterButton extends StatelessWidget {
  final int activeCount;
  final VoidCallback onTap;

  const _FilterButton({required this.activeCount, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hasFilter = activeCount > 0;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 9),
        decoration: BoxDecoration(
          color: hasFilter
              ? const Color(0xFF1a8a3e).withValues(alpha: 0.1)
              : (isDark ? const Color(0xFF2a2e33) : const Color(0xFFf0f2f0)),
          borderRadius: BorderRadius.circular(12),
          border: hasFilter ? Border.all(color: const Color(0xFF1a8a3e).withValues(alpha: 0.3)) : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.tune_rounded,
              size: 16,
              color: hasFilter ? const Color(0xFF1a8a3e) : theme.colorScheme.onSurface.withValues(alpha: 0.55),
            ),
            const SizedBox(width: 5),
            Text(
              hasFilter ? 'Filter · $activeCount' : 'Filter',
              style: TextStyle(
                fontFamily: 'PlusJakartaSans',
                fontSize: 12.5,
                fontWeight: hasFilter ? FontWeight.w700 : FontWeight.w500,
                color: hasFilter ? const Color(0xFF1a8a3e) : theme.colorScheme.onSurface.withValues(alpha: 0.55),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Task Card ────────────────────────────────────────────────────────────────

class _TaskCard extends StatelessWidget {
  final TaskModel task;
  final VoidCallback onTap;
  final VoidCallback onDelete;

  const _TaskCard({required this.task, required this.onTap, required this.onDelete});

  static Color _priorityColor(String p) {
    switch (p) {
      case 'urgent': return Colors.red;
      case 'high': return const Color(0xFFFF9800);
      case 'medium': return const Color(0xFF2196F3);
      default: return Colors.grey;
    }
  }

  static StatusBadgeVariant _statusVariant(String s) {
    switch (s) {
      case 'completed': return StatusBadgeVariant.success;
      case 'in_progress': return StatusBadgeVariant.info;
      case 'todo': return StatusBadgeVariant.warning;
      default: return StatusBadgeVariant.secondary;
    }
  }

  static String _statusLabel(String s) {
    switch (s) {
      case 'in_progress': return 'In Progress';
      case 'todo': return 'To Do';
      case 'completed': return 'Done';
      default: return s;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final priorityColor = _priorityColor(task.priority);
    final dueDate = task.dueDate != null ? DateTime.tryParse(task.dueDate!) : null;
    final isOverdue = dueDate != null && dueDate.isBefore(DateTime.now()) && task.status != 'completed';

    return Dismissible(
      key: Key(task.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.only(right: 20),
        decoration: BoxDecoration(
          color: Colors.red.shade400,
          borderRadius: BorderRadius.circular(14),
        ),
        child: const Icon(Icons.delete_rounded, color: Colors.white),
      ),
      onDismissed: (_) => onDelete(),
      child: AppCard(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        child: Row(
          children: [
            // Priority accent bar
            Container(
              width: 3.5,
              height: 52,
              decoration: BoxDecoration(
                color: priorityColor,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    task.title,
                    style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 7),
                  Row(
                    children: [
                      StatusBadge(
                        label: _statusLabel(task.status),
                        variant: _statusVariant(task.status),
                      ),
                      const SizedBox(width: 8),
                      if (dueDate != null) ...[
                        Icon(
                          Icons.calendar_today_rounded,
                          size: 11,
                          color: isOverdue ? Colors.red : theme.colorScheme.onSurface.withValues(alpha: 0.45),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          DateFormat('dd MMM').format(dueDate),
                          style: TextStyle(
                            fontFamily: 'PlusJakartaSans',
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: isOverdue ? Colors.red : theme.colorScheme.onSurface.withValues(alpha: 0.55),
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            if (task.assignee != null)
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF1a8a3e).withValues(alpha: 0.1),
                  border: Border.all(color: const Color(0xFF1a8a3e).withValues(alpha: 0.2)),
                ),
                child: Center(
                  child: Text(
                    task.assignee!.initials,
                    style: const TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: Color(0xFF1a8a3e),
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
