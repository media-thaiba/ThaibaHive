import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/visitors_provider.dart';

class VisitorsScreen extends ConsumerStatefulWidget {
  const VisitorsScreen({super.key});

  @override
  ConsumerState<VisitorsScreen> createState() => _VisitorsScreenState();
}

class _VisitorsScreenState extends ConsumerState<VisitorsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(visitorsProvider.notifier).loadVisitors());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(visitorsProvider);
    final notifier = ref.read(visitorsProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Visitors',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddVisitorDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                _filterChip('All', null, state.filter, notifier, theme),
                const SizedBox(width: 8),
                _filterChip(
                    'Active', 'active', state.filter, notifier, theme),
                const SizedBox(width: 8),
                _filterChip(
                    'History', 'history', state.filter, notifier, theme),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading
                ? const ListShimmer()
                : state.error != null
                    ? AppErrorWidget(
                        message: state.error!,
                        onRetry: () => notifier.loadVisitors(),
                      )
                    : notifier.filteredVisitors.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No visitors',
                            icon: Icons.person_pin_rounded)
                        : RefreshIndicator(
                            onRefresh: () => notifier.loadVisitors(),
                            child: ListView.builder(
                              itemCount: notifier.filteredVisitors.length,
                              itemBuilder: (_, i) {
                                final v = notifier.filteredVisitors[i];
                                return Card(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 4),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: v.status == 'checked_in'
                                          ? Colors.green.withValues(alpha: 0.2)
                                          : Colors.grey.withValues(alpha: 0.2),
                                      child: Icon(
                                        Icons.person_rounded,
                                        color: v.status == 'checked_in'
                                            ? Colors.green
                                            : Colors.grey,
                                      ),
                                    ),
                                    title: Text(v.name,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600)),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text('${v.phone} · ${v.purpose}'),
                                        if (v.hostName != null)
                                          Text('Host: ${v.hostName}'),
                                        if (v.checkedInAt != null)
                                          Text(
                                              'In: ${v.checkedInAt!.toDisplayDateTime()}'),
                                        if (v.checkedOutAt != null)
                                          Text(
                                              'Out: ${v.checkedOutAt!.toDisplayDateTime()}'),
                                      ],
                                    ),
                                    isThreeLine: true,
                                    trailing: v.status == 'checked_in'
                                        ? FilledButton.tonal(
                                            onPressed: () => notifier
                                                .checkOutVisitor(v.id),
                                            style: FilledButton.styleFrom(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 12)),
                                            child: const Text('Check Out',
                                                style: TextStyle(fontSize: 12)),
                                          )
                                        : null,
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String label, String? value, String? current,
      VisitorsNotifier notifier, ThemeData theme) {
    return FilterChip(
      label: Text(label),
      selected: current == value,
      onSelected: (_) => notifier.setFilter(value),
      selectedColor: theme.colorScheme.primary.withValues(alpha: 0.2),
    );
  }

  void _showAddVisitorDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final companyCtrl = TextEditingController();
    final purposeCtrl = TextEditingController();
    final vehicleCtrl = TextEditingController();
    final hostNameCtrl = TextEditingController();
    final hostDeptCtrl = TextEditingController();

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
          height: MediaQuery.of(ctx).size.height * 0.75,
          child: ListView(
            children: [
              Text('Add Visitor',
                  style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                  controller: nameCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Name *')),
              TextField(
                  controller: phoneCtrl,
                  keyboardType: TextInputType.phone,
                  decoration:
                      const InputDecoration(labelText: 'Phone *')),
              TextField(
                  controller: emailCtrl,
                  keyboardType: TextInputType.emailAddress,
                  decoration:
                      const InputDecoration(labelText: 'Email')),
              TextField(
                  controller: companyCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Company')),
              TextField(
                  controller: purposeCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Purpose *')),
              TextField(
                  controller: vehicleCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Vehicle Number')),
              TextField(
                  controller: hostNameCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Host Name')),
              TextField(
                  controller: hostDeptCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Host Department')),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  if (nameCtrl.text.isEmpty ||
                      phoneCtrl.text.isEmpty ||
                      purposeCtrl.text.isEmpty) return;
                  await ref
                      .read(visitorsProvider.notifier)
                      .createVisitor({
                        'name': nameCtrl.text,
                        'phone': phoneCtrl.text,
                        'email': emailCtrl.text,
                        'company': companyCtrl.text,
                        'purpose': purposeCtrl.text,
                        'vehicle_number': vehicleCtrl.text,
                        'host_name': hostNameCtrl.text,
                        'host_department': hostDeptCtrl.text,
                        'status': 'checked_in',
                      });
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: const Text('Check In Visitor'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
