import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import 'package:thaibahive_mobile/features/checklists/data/checklists_provider.dart';
import '../data/admin_provider.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() =>
      _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(adminProvider.notifier).loadAll());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminProvider);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Admin Dashboard',
      showBack: false,
      body: state.isLoading
          ? const PageShimmer()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text('Management',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
                _adminCard(
                  icon: Icons.business_rounded,
                  title: 'Institutions',
                  subtitle: '${state.institutions.length} institutions',
                  color: Colors.blue,
                  onTap: () => _showInstitutionManagement(context),
                ),
                _adminCard(
                  icon: Icons.account_tree_rounded,
                  title: 'Departments',
                  subtitle: '${state.departments.length} departments',
                  color: Colors.green,
                  onTap: () => _showDepartmentManagement(context),
                ),
                _adminCard(
                  icon: Icons.access_time_rounded,
                  title: 'Shifts',
                  subtitle: '${state.shifts.length} shifts',
                  color: Colors.orange,
                  onTap: () => _showShiftManagement(context),
                ),
                _adminCard(
                  icon: Icons.checklist_rounded,
                  title: 'Checklists',
                  subtitle: 'Manage templates',
                  color: Colors.purple,
                  onTap: () => _showChecklistManagement(context),
                ),
              ],
            ),
    );
  }

  Widget _adminCard({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: color.withValues(alpha: 0.15),
          child: Icon(icon, color: color),
        ),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: onTap,
      ),
    );
  }

  void _showInstitutionManagement(BuildContext context) {
    final state = ref.read(adminProvider);
    final notifier = ref.read(adminProvider.notifier);
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    String type = 'school';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.8,
          child: ListView(
            children: [
              Row(
                children: [
                  Text('Institutions',
                      style: Theme.of(ctx).textTheme.titleLarge),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.add_rounded),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _showAddInstitutionDialog(context);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...state.institutions.map((inst) => Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      title: Text(inst.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600)),
                      subtitle: Text(
                          '${inst.type} · ${inst.code}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined,
                                size: 20),
                            onPressed: () {
                              Navigator.of(ctx).pop();
                              _showEditInstitutionDialog(
                                  context, inst.id, inst.name, inst.code);
                            },
                          ),
                          IconButton(
                            icon: const Icon(
                                Icons.delete_outline,
                                size: 20,
                                color: Colors.red),
                            onPressed: () async {
                              await notifier
                                  .deleteInstitution(inst.id);
                              if (ctx.mounted) Navigator.of(ctx).pop();
                            },
                          ),
                        ],
                      ),
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddInstitutionDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();
    final addressCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    String type = 'school';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add Institution'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                  controller: nameCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Name')),
              TextField(
                  controller: codeCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Code')),
              DropdownButtonFormField<String>(
                value: type,
                decoration:
                    const InputDecoration(labelText: 'Type'),
                items: ['school', 'college', 'university', 'institute']
                    .map((t) => DropdownMenuItem(
                        value: t,
                        child: Text(t[0].toUpperCase() +
                            t.substring(1))))
                    .toList(),
                onChanged: (v) => type = v!,
              ),
              TextField(
                  controller: addressCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Address')),
              TextField(
                  controller: phoneCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Phone')),
              TextField(
                  controller: emailCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Email')),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              if (nameCtrl.text.isEmpty ||
                  codeCtrl.text.isEmpty) return;
              await ref
                  .read(adminProvider.notifier)
                  .createInstitution({
                    'name': nameCtrl.text,
                    'code': codeCtrl.text,
                    'type': type,
                    'address': addressCtrl.text,
                    'phone': phoneCtrl.text,
                    'email': emailCtrl.text,
                    'is_active': true,
                  });
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }

  void _showEditInstitutionDialog(
      BuildContext context, String id, String currentName, String currentCode) {
    final nameCtrl = TextEditingController(text: currentName);
    final codeCtrl = TextEditingController(text: currentCode);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Institution'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
                controller: nameCtrl,
                decoration:
                    const InputDecoration(labelText: 'Name')),
            TextField(
                controller: codeCtrl,
                decoration:
                    const InputDecoration(labelText: 'Code')),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              await ref
                  .read(adminProvider.notifier)
                  .updateInstitution(id, {
                    'name': nameCtrl.text,
                    'code': codeCtrl.text,
                  });
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _showDepartmentManagement(BuildContext context) {
    final state = ref.read(adminProvider);
    final notifier = ref.read(adminProvider.notifier);
    final nameCtrl = TextEditingController();
    final codeCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.7,
          child: ListView(
            children: [
              Row(
                children: [
                  Text('Departments',
                      style: Theme.of(ctx).textTheme.titleLarge),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.add_rounded),
                    onPressed: () {
                      showDialog(
                        context: ctx,
                        builder: (dCtx) => AlertDialog(
                          title: const Text('Add Department'),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              TextField(
                                  controller: nameCtrl,
                                  decoration: const InputDecoration(
                                      labelText: 'Name')),
                              TextField(
                                  controller: codeCtrl,
                                  decoration: const InputDecoration(
                                      labelText: 'Code')),
                            ],
                          ),
                          actions: [
                            TextButton(
                                onPressed: () =>
                                    Navigator.of(dCtx).pop(),
                                child: const Text('Cancel')),
                            FilledButton(
                              onPressed: () async {
                                if (nameCtrl.text.isEmpty ||
                                    codeCtrl.text.isEmpty) return;
                                await notifier.createDepartment({
                                  'name': nameCtrl.text,
                                  'code': codeCtrl.text,
                                  'is_active': true,
                                });
                                if (dCtx.mounted) {
                                  Navigator.of(dCtx).pop();
                                  Navigator.of(ctx).pop();
                                }
                              },
                              child: const Text('Add'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...state.departments.map((dept) => Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      title: Text(dept.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600)),
                      subtitle: Text('Code: ${dept.code}'),
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  void _showShiftManagement(BuildContext context) {
    final state = ref.read(adminProvider);
    final notifier = ref.read(adminProvider.notifier);
    final nameCtrl = TextEditingController();
    final startCtrl = TextEditingController();
    final endCtrl = TextEditingController();
    final graceCtrl = TextEditingController();
    final breakCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.7,
          child: ListView(
            children: [
              Row(
                children: [
                  Text('Shifts',
                      style: Theme.of(ctx).textTheme.titleLarge),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.add_rounded),
                    onPressed: () {
                      showDialog(
                        context: ctx,
                        builder: (dCtx) => AlertDialog(
                          title: const Text('Add Shift'),
                          content: SingleChildScrollView(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextField(
                                    controller: nameCtrl,
                                    decoration: const InputDecoration(
                                        labelText: 'Name')),
                                TextField(
                                    controller: startCtrl,
                                    decoration: const InputDecoration(
                                        labelText:
                                            'Start Time (HH:mm)')),
                                TextField(
                                    controller: endCtrl,
                                    decoration: const InputDecoration(
                                        labelText:
                                            'End Time (HH:mm)')),
                                TextField(
                                    controller: graceCtrl,
                                    decoration: const InputDecoration(
                                        labelText:
                                            'Grace Period (min)')),
                                TextField(
                                    controller: breakCtrl,
                                    decoration: const InputDecoration(
                                        labelText:
                                            'Break Duration (min)')),
                              ],
                            ),
                          ),
                          actions: [
                            TextButton(
                                onPressed: () =>
                                    Navigator.of(dCtx).pop(),
                                child: const Text('Cancel')),
                            FilledButton(
                              onPressed: () async {
                                if (nameCtrl.text.isEmpty ||
                                    startCtrl.text.isEmpty ||
                                    endCtrl.text.isEmpty) return;
                                await notifier.createShift({
                                  'name': nameCtrl.text,
                                  'start_time': startCtrl.text,
                                  'end_time': endCtrl.text,
                                  'grace_period': graceCtrl.text,
                                  'break_duration': breakCtrl.text,
                                  'is_active': true,
                                });
                                if (dCtx.mounted) {
                                  Navigator.of(dCtx).pop();
                                  Navigator.of(ctx).pop();
                                }
                              },
                              child: const Text('Add'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ...state.shifts.map((shift) => Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      title: Text(shift.name,
                          style: const TextStyle(
                              fontWeight: FontWeight.w600)),
                      subtitle: Text(
                          '${shift.startTime} - ${shift.endTime}'),
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: shift.isActive
                              ? Colors.green.withValues(alpha: 0.15)
                              : Colors.grey.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          shift.isActive ? 'Active' : 'Inactive',
                          style: TextStyle(
                            color: shift.isActive
                                ? Colors.green
                                : Colors.grey,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  )),
            ],
          ),
        ),
      ),
    );
  }

  void _showChecklistManagement(BuildContext context) {
    final checklistNotifier = ref.read(checklistsProvider.notifier);
    final nameCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final tasksCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        final checkState = ref.watch(checklistsProvider);
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.7,
            child: ListView(
              children: [
                Text('Checklist Templates',
                    style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 16),
                TextField(
                    controller: nameCtrl,
                    decoration:
                        const InputDecoration(labelText: 'Template Name')),
                TextField(
                    controller: descCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Description (optional)')),
                TextField(
                  controller: tasksCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Tasks',
                      hintText: 'One per line'),
                  maxLines: 6,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () async {
                    if (nameCtrl.text.isEmpty ||
                        tasksCtrl.text.isEmpty) return;
                    final tasks = tasksCtrl.text
                        .split('\n')
                        .map((l) => l.trim())
                        .where((l) => l.isNotEmpty)
                        .toList();
                    await checklistNotifier.createTemplate({
                      'name': nameCtrl.text,
                      'description': descCtrl.text,
                      'tasks': tasks,
                    });
                    if (ctx.mounted) Navigator.of(ctx).pop();
                  },
                  child: const Text('Create Template'),
                ),
                const SizedBox(height: 16),
                Text('Existing Templates',
                    style: Theme.of(ctx).textTheme.titleSmall),
                ...checkState.templates.map((t) => ListTile(
                      dense: true,
                      title: Text(t.name),
                      subtitle: Text('${t.items?.length ?? 0} items'),
                    )),
              ],
            ),
          ),
        );
      },
    );
  }
}
