import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../models/daily_report_model.dart';
import '../data/reports_provider.dart';

class ReportCreateScreen extends ConsumerStatefulWidget {
  const ReportCreateScreen({super.key});

  @override
  ConsumerState<ReportCreateScreen> createState() =>
      _ReportCreateScreenState();
}

class _ReportCreateScreenState extends ConsumerState<ReportCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  DateTime _selectedDate = DateTime.now();
  final _summaryController = TextEditingController();
  final _taskDescController = TextEditingController();
  final _taskHoursController = TextEditingController();
  final List<ReportTaskItem> _tasks = [];
  bool _isSubmitting = false;

  @override
  void dispose() {
    _summaryController.dispose();
    _taskDescController.dispose();
    _taskHoursController.dispose();
    super.dispose();
  }

  void _addTask() {
    final desc = _taskDescController.text.trim();
    final hoursText = _taskHoursController.text.trim();
    if (desc.isEmpty) return;
    final hours = double.tryParse(hoursText) ?? 0;
    if (hours <= 0) return;

    setState(() {
      _tasks.add(ReportTaskItem(description: desc, hoursSpent: hours));
      _taskDescController.clear();
      _taskHoursController.clear();
    });
  }

  void _removeTask(int index) {
    setState(() => _tasks.removeAt(index));
  }

  Future<void> _submit(String status) async {
    if (!_formKey.currentState!.validate()) return;
    if (_tasks.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please add at least one task')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ref.read(reportsListProvider.notifier).createReport({
        'report_date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'summary': _summaryController.text.trim(),
        'status': status,
        'tasks': _tasks.map((t) => t.toJson()).toList(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                status == 'draft' ? 'Report saved as draft' : 'Report submitted'),
          ),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final totalHours = _tasks.fold<double>(0, (sum, t) => sum + t.hoursSpent);

    return Scaffold(
      appBar: AppBar(title: const Text('Create Report')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            InkWell(
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: _selectedDate,
                  firstDate: DateTime.now().subtract(const Duration(days: 30)),
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  setState(() => _selectedDate = picked);
                }
              },
              borderRadius: BorderRadius.circular(12),
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Report Date',
                  prefixIcon: Icon(Icons.calendar_month_rounded),
                ),
                child: Text(
                  DateFormat('dd MMM yyyy').format(_selectedDate),
                  style: theme.textTheme.bodyMedium,
                ),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _summaryController,
              decoration: const InputDecoration(
                labelText: 'Summary',
                hintText: 'Brief summary of your work today',
                alignLabelWithHint: true,
              ),
              maxLines: 3,
              validator: (v) =>
                  (v == null || v.trim().isEmpty) ? 'Required' : null,
            ),
            const SizedBox(height: 24),
            Text('Tasks',
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            ..._tasks.asMap().entries.map((entry) {
              final i = entry.key;
              final task = entry.value;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: Icon(Icons.check_circle_outline_rounded,
                      color: theme.colorScheme.primary),
                  title: Text(task.description),
                  trailing: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text('${task.hoursSpent.toInt()}h',
                          style: theme.textTheme.bodySmall
                              ?.copyWith(fontWeight: FontWeight.w500)),
                      IconButton(
                        icon:
                            const Icon(Icons.remove_circle_outline_rounded),
                        color: Colors.red,
                        onPressed: () => _removeTask(i),
                      ),
                    ],
                  ),
                ),
              );
            }),
            Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    TextField(
                      controller: _taskDescController,
                      decoration: const InputDecoration(
                        labelText: 'Task Description',
                        hintText: 'What did you work on?',
                        isDense: true,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _taskHoursController,
                            decoration: const InputDecoration(
                              labelText: 'Hours',
                              hintText: '0',
                              isDense: true,
                              prefixIcon: Icon(Icons.access_time_rounded,
                                  size: 20),
                            ),
                            keyboardType:
                                const TextInputType.numberWithOptions(
                                    decimal: true),
                          ),
                        ),
                        const SizedBox(width: 12),
                        FilledButton.tonalIcon(
                          onPressed: _addTask,
                          icon: const Icon(Icons.add_rounded, size: 18),
                          label: const Text('Add'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            if (totalHours > 0) ...[
              const SizedBox(height: 12),
              Text(
                'Total: ${totalHours.toInt()} hour${totalHours > 1 ? 's' : ''}',
                style: theme.textTheme.bodyMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _isSubmitting
                        ? null
                        : () => _submit('draft'),
                    icon: const Icon(Icons.save_rounded, size: 18),
                    label: const Text('Save as Draft'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _isSubmitting
                        ? null
                        : () => _submit('submitted'),
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.send_rounded, size: 18),
                    label: const Text('Submit'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
