import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:thaibahive_mobile/features/tasks/data/tasks_provider.dart';

class TaskCreateScreen extends ConsumerStatefulWidget {
  const TaskCreateScreen({super.key});

  @override
  ConsumerState<TaskCreateScreen> createState() => _TaskCreateScreenState();
}

class _TaskCreateScreenState extends ConsumerState<TaskCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  String _priority = 'medium';
  DateTime? _dueDate;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? now.add(const Duration(days: 1)),
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() => _dueDate = picked);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final data = <String, dynamic>{
      'title': _titleController.text.trim(),
      'description': _descriptionController.text.trim(),
      'priority': _priority,
    };
    if (_dueDate != null) {
      data['due_date'] = DateFormat('yyyy-MM-dd').format(_dueDate!);
    }

    try {
      await ref.read(tasksProvider.notifier).createTask(data);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task created successfully')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to create task: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final error = ref.watch(tasksProvider).error;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create Task'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (error != null)
                Container(
                  padding: const EdgeInsets.all(12),
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: theme.colorScheme.error.withValues(alpha: 0.3),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(Icons.error_outline,
                          color: theme.colorScheme.error, size: 20),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          error,
                          style: TextStyle(
                              color: theme.colorScheme.error, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              TextFormField(
                controller: _titleController,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Enter task title',
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Title is required';
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                maxLines: 4,
                textInputAction: TextInputAction.newline,
                decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Enter task description (optional)',
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Priority',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: ['low', 'medium', 'high', 'urgent'].map((p) {
                  final isSelected = _priority == p;
                  final color = p == 'urgent'
                      ? Colors.red
                      : p == 'high'
                          ? Colors.orange
                          : p == 'medium'
                              ? Colors.blue
                              : Colors.grey;
                  return ChoiceChip(
                    label: Text(p[0].toUpperCase() + p.substring(1)),
                    selected: isSelected,
                    onSelected: (_) => setState(() => _priority = p),
                    selectedColor: color.withValues(alpha: 0.25),
                    backgroundColor: color.withValues(alpha: 0.08),
                    labelStyle: TextStyle(
                      color: isSelected ? color : null,
                      fontWeight: isSelected ? FontWeight.w600 : null,
                    ),
                    visualDensity: VisualDensity.compact,
                  );
                }).toList(),
              ),
              const SizedBox(height: 20),
              Text(
                'Due Date',
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              InkWell(
                onTap: _pickDate,
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 14),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.calendar_today_rounded,
                        size: 20,
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.6),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _dueDate != null
                              ? DateFormat('dd MMM yyyy').format(_dueDate!)
                              : 'Select due date (optional)',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: _dueDate != null
                                ? null
                                : theme.colorScheme.onSurface
                                    .withValues(alpha: 0.5),
                          ),
                        ),
                      ),
                      if (_dueDate != null)
                        IconButton(
                          icon: const Icon(Icons.close_rounded, size: 18),
                          onPressed: () => setState(() => _dueDate = null),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              FilledButton(
                onPressed: _isSubmitting ? null : _submit,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Create Task'),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}
