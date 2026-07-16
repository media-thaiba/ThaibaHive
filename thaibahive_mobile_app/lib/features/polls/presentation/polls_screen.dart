import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/polls_provider.dart';

class PollsScreen extends ConsumerStatefulWidget {
  const PollsScreen({super.key});

  @override
  ConsumerState<PollsScreen> createState() => _PollsScreenState();
}

class _PollsScreenState extends ConsumerState<PollsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(pollsProvider.notifier).loadPolls());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(pollsProvider);
    final notifier = ref.read(pollsProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Polls',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
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
                _filterChip('Active', 'active', state.filter, notifier, theme),
                const SizedBox(width: 8),
                _filterChip(
                    'Expired', 'expired', state.filter, notifier, theme),
              ],
            ),
          ),
          Expanded(
            child: state.isLoading
                ? const ListShimmer()
                : state.error != null
                    ? AppErrorWidget(
                        message: state.error!,
                        onRetry: () => notifier.loadPolls(),
                      )
                    : notifier.filteredPolls.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No polls available',
                            icon: Icons.poll_rounded)
                        : RefreshIndicator(
                            onRefresh: () => notifier.loadPolls(),
                            child: ListView.builder(
                              itemCount: notifier.filteredPolls.length,
                              itemBuilder: (_, i) {
                                final p = notifier.filteredPolls[i];
                                return Card(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 4),
                                  child: ListTile(
                                    leading: CircleAvatar(
                                      backgroundColor: p.isActive
                                          ? Colors.green.withValues(alpha: 0.2)
                                          : Colors.grey.withValues(alpha: 0.2),
                                      child: Icon(
                                        Icons.poll_rounded,
                                        color: p.isActive
                                            ? Colors.green
                                            : Colors.grey,
                                      ),
                                    ),
                                    title: Text(p.title,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600)),
                                    subtitle: Text(
                                        '${p.options.length} options · ${p.expiresAt.timeAgo()}'),
                                    trailing: Text(
                                        p.isActive ? 'Active' : 'Expired',
                                        style: TextStyle(
                                          color: p.isActive
                                              ? Colors.green
                                              : Colors.grey,
                                          fontWeight: FontWeight.w500,
                                        )),
                                    onTap: () =>
                                        context.push('/polls/${p.id}'),
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
      PollsNotifier notifier, ThemeData theme) {
    final selected = current == value;
    return FilterChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => notifier.setFilter(value),
      selectedColor: theme.colorScheme.primary.withValues(alpha: 0.2),
    );
  }

  void _showCreateDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final optionsCtrl = TextEditingController();

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
          height: MediaQuery.of(ctx).size.height * 0.65,
          child: ListView(
            children: [
              Text('Create Poll',
                  style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                  controller: titleCtrl,
                  decoration: const InputDecoration(labelText: 'Question')),
              const SizedBox(height: 12),
              TextField(
                  controller: descCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Description (optional)'),
                  maxLines: 2),
              const SizedBox(height: 12),
              TextField(
                controller: optionsCtrl,
                decoration: const InputDecoration(
                    labelText: 'Options',
                    hintText: 'One per line'),
                maxLines: 4,
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  if (titleCtrl.text.isEmpty) return;
                  final lines = optionsCtrl.text
                      .split('\n')
                      .map((l) => l.trim())
                      .where((l) => l.isNotEmpty)
                      .toList();
                  if (lines.length < 2) {
                    ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(
                        content: Text('Add at least 2 options')));
                    return;
                  }
                  final expiresAt = DateTime.now().add(const Duration(days: 7));
                  await ref
                      .read(pollsProvider.notifier)
                      .createPoll({
                        'title': titleCtrl.text,
                        'description': descCtrl.text,
                        'options': lines.map((l) => {'text': l}).toList(),
                        'expires_at': expiresAt.toIso8601String(),
                      });
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: const Text('Create Poll'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
