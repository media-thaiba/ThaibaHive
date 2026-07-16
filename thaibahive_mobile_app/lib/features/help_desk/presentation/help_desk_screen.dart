import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/help_desk_provider.dart';

class HelpDeskScreen extends ConsumerStatefulWidget {
  const HelpDeskScreen({super.key});

  @override
  ConsumerState<HelpDeskScreen> createState() => _HelpDeskScreenState();
}

class _HelpDeskScreenState extends ConsumerState<HelpDeskScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(helpDeskProvider.notifier).loadTickets());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(helpDeskProvider);
    final notifier = ref.read(helpDeskProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Help Desk',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    value: state.statusFilter,
                    decoration: const InputDecoration(
                        labelText: 'Status', isDense: true),
                    items: const [
                      DropdownMenuItem(value: null, child: Text('All')),
                      DropdownMenuItem(value: 'open', child: Text('Open')),
                      DropdownMenuItem(
                          value: 'in_progress', child: Text('In Progress')),
                      DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                      DropdownMenuItem(value: 'closed', child: Text('Closed')),
                    ],
                    onChanged: (v) => notifier.setStatusFilter(v),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: DropdownButtonFormField<String?>(
                    value: state.categoryFilter,
                    decoration: const InputDecoration(
                        labelText: 'Category', isDense: true),
                    items: [
                      const DropdownMenuItem(value: null, child: Text('All')),
                      ...['IT', 'Facilities', 'HR', 'Other'].map((c) =>
                          DropdownMenuItem(value: c.toLowerCase(), child: Text(c))),
                    ],
                    onChanged: (v) => notifier.setCategoryFilter(v),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading
                ? const ListShimmer()
                : state.error != null
                    ? AppErrorWidget(
                        message: state.error!,
                        onRetry: () => notifier.loadTickets(),
                      )
                    : notifier.filteredTickets.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No tickets found',
                            icon: Icons.support_agent_rounded)
                        : RefreshIndicator(
                            onRefresh: () => notifier.loadTickets(),
                            child: ListView.builder(
                              itemCount: notifier.filteredTickets.length,
                              itemBuilder: (_, i) {
                                final t = notifier.filteredTickets[i];
                                return Card(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 4),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: _priorityColor(
                                              t.priority, theme)
                                          .withValues(alpha: 0.2),
                                      child: Icon(Icons.confirmation_number_rounded,
                                          color: _priorityColor(
                                              t.priority, theme),
                                          size: 20),
                                    ),
                                    title: Text(t.title,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600)),
                                    subtitle: Text(
                                        '${t.category} - ${t.status}'),
                                    trailing: Text(t.createdAt.timeAgo(),
                                        style: theme.textTheme.bodySmall),
                                    onTap: () =>
                                        context.push('/help-desk/tickets/${t.id}'),
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

  Color _priorityColor(String priority, ThemeData theme) {
    switch (priority) {
      case 'high':
        return Colors.red;
      case 'medium':
        return Colors.orange;
      case 'low':
        return Colors.green;
      default:
        return theme.colorScheme.primary;
    }
  }

  void _showCreateDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    String category = 'it';
    String priority = 'medium';

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
        child: StatefulBuilder(
          builder: (ctx, setDialogState) => SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.7,
            child: ListView(
              children: [
                Text('New Ticket',
                    style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 16),
                TextField(
                    controller: titleCtrl,
                    decoration:
                        const InputDecoration(labelText: 'Title')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: category,
                  decoration:
                      const InputDecoration(labelText: 'Category'),
                  items: ['IT', 'Facilities', 'HR', 'Other']
                      .map((c) => DropdownMenuItem(
                          value: c.toLowerCase(), child: Text(c)))
                      .toList(),
                  onChanged: (v) => setDialogState(() => category = v!),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: priority,
                  decoration:
                      const InputDecoration(labelText: 'Priority'),
                  items: ['low', 'medium', 'high']
                      .map((p) => DropdownMenuItem(
                          value: p, child: Text(p.toUpperCase())))
                      .toList(),
                  onChanged: (v) => setDialogState(() => priority = v!),
                ),
                const SizedBox(height: 12),
                TextField(
                    controller: descCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Description'),
                    maxLines: 4),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () async {
                    if (titleCtrl.text.isEmpty) return;
                    await ref
                        .read(helpDeskProvider.notifier)
                        .createTicket({
                          'title': titleCtrl.text,
                          'category': category,
                          'priority': priority,
                          'description': descCtrl.text,
                        });
                    if (ctx.mounted) Navigator.of(ctx).pop();
                  },
                  child: const Text('Submit'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
