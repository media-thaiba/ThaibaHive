import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/services/form_draft_service.dart';
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
  bool _isSubmitted = false;

  @override
  void initState() {
    super.initState();
    _restoreDraft();
  }

  Future<void> _restoreDraft() async {
    final draft = await ref.read(formDraftServiceProvider).getDraft('grievance_submit');
    if (draft != null && mounted) {
      setState(() {
        if (draft['subject'] != null && _subjectCtrl.text.isEmpty) {
          _subjectCtrl.text = draft['subject'] as String;
        }
        if (draft['description'] != null && _descriptionCtrl.text.isEmpty) {
          _descriptionCtrl.text = draft['description'] as String;
        }
        if (draft['category'] != null) {
          _category = draft['category'] as String;
        }
      });
    }
  }

  @override
  void dispose() {
    if (!_isSubmitted) {
      final sub = _subjectCtrl.text.trim();
      final desc = _descriptionCtrl.text.trim();
      if (sub.isNotEmpty || desc.isNotEmpty) {
        ref.read(formDraftServiceProvider).saveDraft('grievance_submit', {
          'subject': sub,
          'description': desc,
          'category': _category,
        });
      }
    }
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
      _isSubmitted = true;
      ref.read(formDraftServiceProvider).clearDraft('grievance_submit');
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
      isModal: true,
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
