import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../models/announcement_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/announcements_provider.dart';

class AnnouncementsScreen extends ConsumerWidget {
  const AnnouncementsScreen({super.key});

  static const _priorityFilters = ['All', 'Normal', 'Important', 'Urgent'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final announcementsAsync = ref.watch(announcementsListProvider);
    final selectedPriority = ref.watch(announcementPriorityProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Announcements')),
      body: Column(
        children: [
          Container(
            color: theme.colorScheme.surface,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: _priorityFilters.map((filter) {
                  final value = filter.toLowerCase();
                  final isSelected = value == selectedPriority;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(filter),
                      selected: isSelected,
                      onSelected: (_) {
                        ref
                            .read(announcementPriorityProvider.notifier)
                            .state = value;
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            child: announcementsAsync.when(
              data: (announcements) {
                if (announcements.isEmpty) {
                  return const EmptyStateWidget(
                    icon: Icons.campaign_rounded,
                    title: 'No Announcements',
                    message: 'There are no announcements yet.',
                  );
                }
                final pinned =
                    announcements.where((a) => a.isPinned).toList();
                final normal =
                    announcements.where((a) => !a.isPinned).toList();
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.read(announcementsListProvider.notifier).refresh(),
                  child: ListView(
                    padding: const EdgeInsets.only(bottom: 80),
                    children: [
                      if (pinned.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                          child: Text('PINNED',
                              style: theme.textTheme.labelSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: theme.colorScheme.primary)),
                        ),
                        ...pinned.map((a) => _AnnouncementCard(
                              announcement: a,
                              onTap: () => _showDetail(context, a),
                            )),
                        const Divider(height: 24),
                      ],
                      if (normal.isNotEmpty) ...[
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 4, 16, 4),
                          child: Text('RECENT',
                              style: theme.textTheme.labelSmall?.copyWith(
                                  fontWeight: FontWeight.w600,
                                  color: theme.colorScheme.onSurface
                                      .withValues(alpha: 0.6))),
                        ),
                        ...normal.map((a) => _AnnouncementCard(
                              announcement: a,
                              onTap: () => _showDetail(context, a),
                            )),
                      ],
                    ],
                  ),
                );
              },
              loading: () => const PageShimmer(),
              error: (e, _) => AppErrorWidget(
                message: e.toString(),
                onRetry: () =>
                    ref.read(announcementsListProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context, ref),
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  void _showDetail(BuildContext context, AnnouncementModel a) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: ListView(
            controller: scrollController,
            children: [
              Row(
                children: [
                  if (a.isPinned)
                    const Icon(Icons.push_pin_rounded, size: 18),
                  if (a.isPinned) const SizedBox(width: 8),
                  _PriorityBadge(priority: a.priority),
                  const Spacer(),
                  Text(
                    a.createdAt.toDisplayDateTime(),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                a.title,
                style: Theme.of(context)
                    .textTheme
                    .titleLarge
                    ?.copyWith(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Text(
                a.content ?? '',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              if (a.createdBy != null) ...[
                const SizedBox(height: 16),
                Text(
                  '- ${a.createdBy!.fullName}',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Theme.of(context)
                          .colorScheme
                          .onSurface
                          .withValues(alpha: 0.6),
                      fontStyle: FontStyle.italic),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final titleCtrl = TextEditingController();
    final contentCtrl = TextEditingController();
    String priority = 'normal';
    bool pinned = false;

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('New Announcement'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Announcement title',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: contentCtrl,
                decoration: const InputDecoration(
                  labelText: 'Content',
                  hintText: 'Announcement content',
                  alignLabelWithHint: true,
                ),
                maxLines: 4,
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: priority,
                decoration: const InputDecoration(
                  labelText: 'Priority',
                ),
                items: const [
                  DropdownMenuItem(value: 'normal', child: Text('Normal')),
                  DropdownMenuItem(value: 'important', child: Text('Important')),
                  DropdownMenuItem(value: 'urgent', child: Text('Urgent')),
                ],
                onChanged: (v) => priority = v!,
              ),
              const SizedBox(height: 8),
              SwitchListTile(
                title: const Text('Pin Announcement'),
                value: pinned,
                onChanged: (v) => pinned = v,
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (titleCtrl.text.trim().isEmpty) return;
              ref
                  .read(announcementsListProvider.notifier)
                  .createAnnouncement({
                'title': titleCtrl.text.trim(),
                'content': contentCtrl.text.trim(),
                'priority': priority,
                'is_pinned': pinned,
              });
              Navigator.pop(ctx);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final AnnouncementModel announcement;
  final VoidCallback onTap;
  const _AnnouncementCard({
    required this.announcement,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  if (announcement.isPinned) ...[
                    Icon(Icons.push_pin_rounded,
                        size: 16, color: theme.colorScheme.primary),
                    const SizedBox(width: 4),
                  ],
                  _PriorityBadge(priority: announcement.priority),
                  const Spacer(),
                  Text(
                    announcement.createdAt.timeAgo(),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                announcement.title,
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 4),
              Text(
                announcement.content ?? '',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PriorityBadge extends StatelessWidget {
  final String priority;
  const _PriorityBadge({required this.priority});

  Color get _color {
    switch (priority) {
      case 'urgent':
        return Colors.red;
      case 'important':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        priority.toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: _color,
        ),
      ),
    );
  }
}
