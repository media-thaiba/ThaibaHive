import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../app/theme.dart';
import '../data/announcements_cache_provider.dart';

class AnnouncementDetailScreen extends ConsumerWidget {
  final String id;
  const AnnouncementDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final announcementsAsync = ref.watch(cachedAnnouncementsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Announcement Detail'),
      ),
      body: announcementsAsync.when(
        data: (state) {
          final matches = state.announcements.where((a) => a.id == id).toList();
          if (matches.isEmpty) {
            return const Center(child: Text('Announcement not found.'));
          }
          final item = matches.first;

          Color priorityColor;
          switch (item.priority.toLowerCase()) {
            case 'urgent':
              priorityColor = AppColors.destructive(context);
              break;
            case 'important':
              priorityColor = AppColors.warning(context);
              break;
            default:
              priorityColor = AppColors.primary(context);
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: priorityColor.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            item.priority.toUpperCase(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: priorityColor,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          DateFormat('MMM dd, yyyy • hh:mm a').format(item.createdAt),
                          style: theme.textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground(context)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      item.title,
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    if (item.authorName != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.person_outline, size: 16, color: AppColors.mutedForeground(context)),
                          const SizedBox(width: 4),
                          Text(
                            'Posted by ${item.authorName}',
                            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground(context)),
                          ),
                        ],
                      ),
                    ],
                    const Divider(height: 32),
                    Text(
                      item.content ?? 'No detailed content provided.',
                      style: theme.textTheme.bodyMedium?.copyWith(height: 1.6),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => const Center(
          child: Text('Failed to load announcement detail.'),
        ),
      ),
    );
  }
}
