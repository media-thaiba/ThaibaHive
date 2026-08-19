import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme.dart';
import '../data/events_cache_provider.dart';

class EventDetailScreen extends ConsumerWidget {
  final String id;
  const EventDetailScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final eventsAsync = ref.watch(cachedEventsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Event Details'),
      ),
      body: eventsAsync.when(
        data: (state) {
          final matches = state.events.where((e) => e.id == id).toList();
          if (matches.isEmpty) {
            return const Center(child: Text('Event not found.'));
          }
          final item = matches.first;

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
                            color: AppColors.primary(context).withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            item.eventType.toUpperCase(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: AppColors.primary(context),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Row(
                          children: [
                            Icon(Icons.people_outline, size: 16, color: AppColors.mutedForeground(context)),
                            const SizedBox(width: 4),
                            Text(
                              '${item.attendeeCount} Attendees',
                              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.mutedForeground(context)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      item.title,
                      style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.calendar_today, size: 16, color: AppColors.mutedForeground(context)),
                        const SizedBox(width: 6),
                        Text(
                          item.eventDate,
                          style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.mutedForeground(context)),
                        ),
                        if (item.startTime != null) ...[
                          const SizedBox(width: 8),
                          Text(
                            '• ${item.startTime}${item.endTime != null ? " - ${item.endTime}" : ""}',
                            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.mutedForeground(context)),
                          ),
                        ],
                      ],
                    ),
                    if (item.location != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined, size: 16, color: AppColors.mutedForeground(context)),
                          const SizedBox(width: 6),
                          Text(
                            item.location!,
                            style: theme.textTheme.bodyMedium?.copyWith(color: AppColors.mutedForeground(context)),
                          ),
                        ],
                      ),
                    ],
                    const Divider(height: 32),
                    Text(
                      item.description ?? 'No event description provided.',
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
          child: Text('Failed to load event detail.'),
        ),
      ),
    );
  }
}
