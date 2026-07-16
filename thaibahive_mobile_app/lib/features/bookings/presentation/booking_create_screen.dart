import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../data/bookings_provider.dart';

class BookingCreateScreen extends ConsumerStatefulWidget {
  const BookingCreateScreen({super.key});

  @override
  ConsumerState<BookingCreateScreen> createState() =>
      _BookingCreateScreenState();
}

class _BookingCreateScreenState extends ConsumerState<BookingCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _notesCtrl = TextEditingController();
  String? _selectedResourceId;
  DateTime _startTime = DateTime.now().add(const Duration(hours: 1));
  DateTime _endTime = DateTime.now().add(const Duration(hours: 2));
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(bookingsProvider.notifier).loadInitial());
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _notesCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickDateTime({required bool isStart}) async {
    final date = await showDatePicker(
      context: context,
      initialDate: isStart ? _startTime : _endTime,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );
    if (date == null) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(
          isStart ? _startTime : _endTime),
    );
    if (time == null) return;
    final dt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
    setState(() {
      if (isStart) {
        _startTime = dt;
        if (_endTime.isBefore(_startTime)) {
          _endTime = _startTime.add(const Duration(hours: 1));
        }
      } else {
        _endTime = dt;
      }
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedResourceId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please select a resource')));
      return;
    }
    setState(() => _isSubmitting = true);
    try {
      await ref.read(bookingsProvider.notifier).createBooking({
        'resource_id': _selectedResourceId,
        'title': _titleCtrl.text,
        'start_time': _startTime.toIso8601String(),
        'end_time': _endTime.toIso8601String(),
        'notes': _notesCtrl.text,
      });
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bookingsProvider);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Create Booking',
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Resource', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedResourceId,
              decoration: const InputDecoration(hintText: 'Select resource'),
              items: state.resources
                  .map((r) => DropdownMenuItem(
                      value: r.id,
                      child: Text('${r.name} (${r.type})')))
                  .toList(),
              onChanged: (v) => setState(() => _selectedResourceId = v),
              validator: (v) => v == null ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _titleCtrl,
              decoration: const InputDecoration(
                  labelText: 'Title', hintText: 'e.g. Team Meeting'),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            Text('Start Time', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            InkWell(
              onTap: () => _pickDateTime(isStart: true),
              child: InputDecorator(
                decoration: const InputDecoration(
                  suffixIcon: Icon(Icons.calendar_month_rounded),
                ),
                child: Text(DateFormat('dd MMM yyyy, hh:mm a')
                    .format(_startTime)),
              ),
            ),
            const SizedBox(height: 16),
            Text('End Time', style: theme.textTheme.titleSmall),
            const SizedBox(height: 8),
            InkWell(
              onTap: () => _pickDateTime(isStart: false),
              child: InputDecorator(
                decoration: const InputDecoration(
                  suffixIcon: Icon(Icons.calendar_month_rounded),
                ),
                child: Text(DateFormat('dd MMM yyyy, hh:mm a')
                    .format(_endTime)),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _notesCtrl,
              decoration: const InputDecoration(
                  labelText: 'Notes', hintText: 'Optional notes'),
              maxLines: 3,
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: _isSubmitting ? null : _submit,
              child: _isSubmitting
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white))
                  : const Text('Create Booking'),
            ),
          ],
        ),
      ),
    );
  }
}
