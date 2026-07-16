import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:thaibahive_mobile/core/extensions.dart';
import 'package:thaibahive_mobile/features/tasks/data/tasks_provider.dart';
import 'package:thaibahive_mobile/features/tasks/data/tasks_repository.dart';
import 'package:thaibahive_mobile/models/task_comment_model.dart';
import 'package:thaibahive_mobile/models/task_model.dart';

class TaskDetailScreen extends ConsumerStatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  ConsumerState<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends ConsumerState<TaskDetailScreen> {
  final _commentController = TextEditingController();
  String _selectedStatus = '';
  String _selectedPriority = '';
  bool _isUpdating = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        ref.invalidate(taskDetailProvider(widget.taskId));
        ref.invalidate(taskCommentsProvider(widget.taskId));
      }
    });
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _updateStatus(String status) async {
    setState(() => _isUpdating = true);
    await ref.read(tasksProvider.notifier).updateTask(widget.taskId, {
      'status': status,
    });
    ref.invalidate(taskDetailProvider(widget.taskId));
    setState(() {
      _selectedStatus = status;
      _isUpdating = false;
    });
  }

  Future<void> _updatePriority(String priority) async {
    setState(() => _isUpdating = true);
    await ref.read(tasksProvider.notifier).updateTask(widget.taskId, {
      'priority': priority,
    });
    ref.invalidate(taskDetailProvider(widget.taskId));
    setState(() {
      _selectedPriority = priority;
      _isUpdating = false;
    });
  }

  Future<void> _addComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) return;
    _commentController.clear();
    try {
      final repo = ref.read(tasksRepositoryProvider);
      await repo.addComment(widget.taskId, text);
      ref.invalidate(taskCommentsProvider(widget.taskId));
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to add comment: $e')),
      );
    }
  }

  Future<void> _deleteTask() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Task'),
        content: const Text('Are you sure you want to delete this task?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await ref.read(tasksProvider.notifier).deleteTask(widget.taskId);
      if (mounted) context.pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final taskAsync = ref.watch(taskDetailProvider(widget.taskId));
    final commentsAsync = ref.watch(taskCommentsProvider(widget.taskId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            onPressed: _deleteTask,
          ),
        ],
      ),
      body: taskAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.error_outline_rounded,
                    size: 64, color: theme.colorScheme.error),
                const SizedBox(height: 16),
                Text(
                  'Failed to load task: $e',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () {
                    ref.invalidate(taskDetailProvider(widget.taskId));
                    setState(() {});
                  },
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
        data: (task) => _buildTaskContent(task, commentsAsync, theme),
      ),
    );
  }

  Widget _buildTaskContent(
      TaskModel task, AsyncValue<List<TaskCommentModel>> commentsAsync, ThemeData theme) {
    if (_selectedStatus.isEmpty) _selectedStatus = task.status;
    if (_selectedPriority.isEmpty) _selectedPriority = task.priority;

    final priorityColor = task.priority == 'urgent'
        ? Colors.red
        : task.priority == 'high'
            ? Colors.orange
            : task.priority == 'medium'
                ? Colors.blue
                : Colors.grey;

    final dueDate = task.dueDate != null
        ? DateTime.tryParse(task.dueDate!)
        : null;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 4,
                height: 28,
                decoration: BoxDecoration(
                  color: priorityColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  task.title,
                  style: theme.textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              _MetadataChip(
                label: task.status == 'in_progress'
                    ? 'In Progress'
                    : task.status[0].toUpperCase() + task.status.substring(1),
                color: task.status == 'completed'
                    ? Colors.green
                    : task.status == 'in_progress'
                        ? Colors.blue
                        : Colors.orange,
              ),
              const SizedBox(width: 8),
              _MetadataChip(
                label: task.priority[0].toUpperCase() +
                    task.priority.substring(1),
                color: priorityColor,
              ),
            ],
          ),
          if (task.description != null && task.description!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              'Description',
              style: theme.textTheme.titleSmall?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              task.description!,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.8),
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 20),
          Text(
            'Details',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  _DetailRow(
                    icon: Icons.flag_rounded,
                    label: 'Status',
                    child: DropdownButton<String>(
                      value: _selectedStatus,
                      isDense: true,
                      underline: const SizedBox(),
                      items: const [
                        DropdownMenuItem(value: 'todo', child: Text('To Do')),
                        DropdownMenuItem(
                            value: 'in_progress', child: Text('In Progress')),
                        DropdownMenuItem(
                            value: 'completed', child: Text('Completed')),
                      ],
                      onChanged: _isUpdating ? null : (v) => _updateStatus(v!),
                    ),
                  ),
                  const Divider(height: 20),
                  _DetailRow(
                    icon: Icons.low_priority_rounded,
                    label: 'Priority',
                    child: DropdownButton<String>(
                      value: _selectedPriority,
                      isDense: true,
                      underline: const SizedBox(),
                      items: const [
                        DropdownMenuItem(value: 'low', child: Text('Low')),
                        DropdownMenuItem(value: 'medium', child: Text('Medium')),
                        DropdownMenuItem(value: 'high', child: Text('High')),
                        DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                      ],
                      onChanged:
                          _isUpdating ? null : (v) => _updatePriority(v!),
                    ),
                  ),
                  const Divider(height: 20),
                  _DetailRow(
                    icon: Icons.person_outline_rounded,
                    label: 'Assignee',
                    child: task.assignee != null
                        ? Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              CircleAvatar(
                                radius: 14,
                                backgroundColor: theme.colorScheme.primary
                                    .withValues(alpha: 0.1),
                                child: Text(
                                  task.assignee!.initials,
                                  style: TextStyle(
                                    color: theme.colorScheme.primary,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(task.assignee!.fullName),
                            ],
                          )
                        : const Text('Unassigned'),
                  ),
                  if (dueDate != null) ...[
                    const Divider(height: 20),
                    _DetailRow(
                      icon: Icons.calendar_today_rounded,
                      label: 'Due Date',
                      child: Text(DateFormat('dd MMM yyyy').format(dueDate)),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Comments',
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 12),
          commentsAsync.when(
            loading: () => const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator()),
            ),
            error: (e, _) => Padding(
              padding: const EdgeInsets.all(16),
              child: TextButton.icon(
                onPressed: () {
                  ref.invalidate(taskCommentsProvider(widget.taskId));
                  setState(() {});
                },
                icon: const Icon(Icons.refresh_rounded),
                label: Text('Retry ($e)'),
              ),
            ),
            data: (comments) {
              if (comments.isEmpty) {
                return Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Center(
                      child: Text(
                        'No comments yet',
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.5),
                        ),
                      ),
                    ),
                  ),
                );
              }
              return Column(
                children: comments.map((c) => _CommentTile(comment: c)).toList(),
              );
            },
          ),
          const SizedBox(height: 12),
          Card(
            margin: EdgeInsets.zero,
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: const InputDecoration(
                        hintText: 'Add a comment...',
                        border: InputBorder.none,
                        contentPadding: EdgeInsets.zero,
                        isDense: true,
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _addComment(),
                      maxLines: null,
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send_rounded),
                    color: theme.colorScheme.primary,
                    onPressed: _addComment,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }
}

class _MetadataChip extends StatelessWidget {
  final String label;
  final Color color;

  const _MetadataChip({required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final Widget child;

  const _DetailRow({
    required this.icon,
    required this.label,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 18,
            color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
        const SizedBox(width: 10),
        SizedBox(
          width: 70,
          child: Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ),
        Expanded(child: child),
      ],
    );
  }
}

class _CommentTile extends StatelessWidget {
  final TaskCommentModel comment;
  const _CommentTile({required this.comment});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 16,
              backgroundColor:
                  theme.colorScheme.primary.withValues(alpha: 0.1),
              child: Text(
                comment.userName.isNotEmpty
                    ? comment.userName[0].toUpperCase()
                    : '?',
                style: TextStyle(
                  color: theme.colorScheme.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        comment.userName,
                        style: theme.textTheme.bodySmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      Text(
                        comment.createdAt.toDisplayTime(),
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.5),
                          fontSize: 11,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    comment.comment,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      height: 1.4,
                    ),
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
