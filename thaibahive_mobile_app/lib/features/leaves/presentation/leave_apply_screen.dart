import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../core/services/file_upload_service.dart';
import '../../../models/leave_balance_model.dart';
import '../../../models/leave_type_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/file_picker_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/leaves_provider.dart';

class LeaveApplyScreen extends ConsumerStatefulWidget {
  const LeaveApplyScreen({super.key});

  @override
  ConsumerState<LeaveApplyScreen> createState() => _LeaveApplyScreenState();
}

class _LeaveApplyScreenState extends ConsumerState<LeaveApplyScreen> {
  final _formKey = GlobalKey<FormState>();
  LeaveTypeModel? _selectedType;
  DateTime? _startDate;
  DateTime? _endDate;
  final _reasonController = TextEditingController();
  bool _isSubmitting = false;
  List<UploadedFile> _attachments = [];

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  int get _calculatedDays {
    if (_startDate == null || _endDate == null) return 0;
    return _endDate!.difference(_startDate!).inDays + 1;
  }

  Future<void> _pickDate(BuildContext context, bool isStart) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: isStart
          ? (_startDate ?? now)
          : (_endDate ?? _startDate ?? now),
      firstDate: isStart ? now : (_startDate ?? now),
      lastDate: now.add(const Duration(days: 365)),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = picked;
          if (_endDate != null && _endDate!.isBefore(picked)) {
            _endDate = picked;
          }
        } else {
          _endDate = picked;
        }
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a leave type')),
      );
      return;
    }
    if (_startDate == null || _endDate == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select start and end dates')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      await ref.read(leavesListProvider.notifier).applyLeave({
        'leave_type_id': _selectedType!.id,
        'start_date': DateFormat('yyyy-MM-dd').format(_startDate!),
        'end_date': DateFormat('yyyy-MM-dd').format(_endDate!),
        'days': _calculatedDays,
        'reason': _reasonController.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Leave request submitted successfully')),
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final typesAsync = ref.watch(leaveTypesProvider);
    final balancesAsync = ref.watch(leaveBalanceProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Apply for Leave')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              typesAsync.when(
                data: (types) => DropdownButtonFormField<LeaveTypeModel>(
                  value: _selectedType,
                  decoration: const InputDecoration(
                    labelText: 'Leave Type',
                    prefixIcon: Icon(Icons.category_rounded),
                  ),
                  items: types
                      .map((t) => DropdownMenuItem(
                            value: t,
                            child: Text(t.name),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _selectedType = v),
                  validator: (v) => v == null ? 'Required' : null,
                ),
                 loading: () => DropdownButtonFormField(
                  decoration: const InputDecoration(labelText: 'Leave Type'),
                  items: const [],
                  onChanged: null,
                ),
                error: (e, _) => Text('Error: $e',
                    style: TextStyle(color: theme.colorScheme.error)),
              ),
              if (_selectedType != null) ...[
                const SizedBox(height: 12),
                _BalanceInfo(
                  selectedType: _selectedType!,
                  balancesAsync: balancesAsync,
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: _DateField(
                      label: 'Start Date',
                      date: _startDate,
                      onTap: () => _pickDate(context, true),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _DateField(
                      label: 'End Date',
                      date: _endDate,
                      onTap: () => _pickDate(context, false),
                    ),
                  ),
                ],
              ),
              if (_calculatedDays > 0) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_today_rounded, size: 20),
                      const SizedBox(width: 8),
                      Text(
                        '$_calculatedDays day${_calculatedDays > 1 ? 's' : ''}',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              TextFormField(
                controller: _reasonController,
                decoration: const InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Enter the reason for your leave',
                  alignLabelWithHint: true,
                  prefixIcon: Padding(
                    padding: EdgeInsets.only(bottom: 48),
                    child: Icon(Icons.description_rounded),
                  ),
                ),
                maxLines: 4,
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 16),
              FilePickerWidget(
                selectedFiles: _attachments,
                onFilesChanged: (files) => setState(() => _attachments = files),
                maxFiles: 3,
                allowMultiple: false,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Text('Submit Leave Request'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BalanceInfo extends StatelessWidget {
  final LeaveTypeModel selectedType;
  final AsyncValue<List<LeaveBalanceModel>> balancesAsync;
  const _BalanceInfo({
    required this.selectedType,
    required this.balancesAsync,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return balancesAsync.when(
      data: (balances) {
        final balance = balances.where(
          (b) => b.leaveTypeId == selectedType.id,
        ).firstOrNull;
        if (balance == null) return const SizedBox.shrink();
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.green.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              const Icon(Icons.info_outline_rounded, size: 18),
              const SizedBox(width: 8),
              Text(
                'Balance: ${balance.remainingDays.toInt()} of ${balance.totalDays.toInt()} days remaining',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.green[700],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}

class _DateField extends StatelessWidget {
  final String label;
  final DateTime? date;
  final VoidCallback onTap;

  const _DateField({
    required this.label,
    required this.date,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: const Icon(Icons.calendar_month_rounded),
        ),
        child: Text(
          date != null ? DateFormat('dd MMM yyyy').format(date!) : 'Select',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: date != null
                ? theme.colorScheme.onSurface
                : theme.colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
      ),
    );
  }
}
