import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/app_scaffold.dart';
import '../data/grievances_provider.dart';

class GrievanceSubmitScreen extends ConsumerStatefulWidget {
  const GrievanceSubmitScreen({super.key});

  @override
  ConsumerState<GrievanceSubmitScreen> createState() =>
      _GrievanceSubmitScreenState();
}

class _GrievanceSubmitScreenState extends ConsumerState<GrievanceSubmitScreen> {
  final _formKey = GlobalKey<FormState>();
  final _subjectCtrl = TextEditingController();
  final _descriptionCtrl = TextEditingController();
  String? _category;
  bool _isAnonymous = false;

  @override
  void dispose() {
    _subjectCtrl.dispose();
    _descriptionCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    try {
      await ref.read(grievancesProvider.notifier).submitGrievance({
        'subject': _subjectCtrl.text,
        'description': _descriptionCtrl.text,
        'category': _category,
        'is_anonymous': _isAnonymous,
      });
      if (mounted) context.pop();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Submit Grievance',
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text('Your feedback is important to us.',
                style: theme.textTheme.bodyMedium
                    ?.copyWith(color: Colors.grey[600])),
            const SizedBox(height: 24),
            DropdownButtonFormField<String>(
              value: _category,
              decoration:
                  const InputDecoration(labelText: 'Category'),
              items: ['Harassment', 'Discrimination', 'Workplace Safety',
                      'Policy Violation', 'Management', 'Other']
                  .map((c) => DropdownMenuItem(
                      value: c.toLowerCase(), child: Text(c)))
                  .toList(),
              onChanged: (v) => setState(() => _category = v),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _subjectCtrl,
              decoration: const InputDecoration(
                  labelText: 'Subject',
                  hintText: 'Brief summary of your grievance'),
              validator: (v) =>
                  v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _descriptionCtrl,
              decoration: const InputDecoration(
                  labelText: 'Description',
                  hintText: 'Provide detailed information'),
              maxLines: 6,
              validator: (v) =>
                  v == null || v.isEmpty ? 'Required' : null,
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Submit Anonymously'),
              subtitle: const Text(
                  'Your identity will not be revealed'),
              value: _isAnonymous,
              onChanged: (v) =>
                  setState(() => _isAnonymous = v),
              secondary: Icon(
                _isAnonymous
                    ? Icons.visibility_off_rounded
                    : Icons.visibility_rounded,
              ),
            ),
            const SizedBox(height: 32),
            FilledButton(
              onPressed: _submit,
              child: const Text('Submit Grievance'),
            ),
          ],
        ),
      ),
    );
  }
}
