import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/timeline_provider.dart';
import '../data/timeline_repository.dart';

class TimelineScreen extends ConsumerStatefulWidget {
  const TimelineScreen({super.key});

  @override
  ConsumerState<TimelineScreen> createState() => _TimelineScreenState();
}

class _TimelineScreenState extends ConsumerState<TimelineScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(timelineProvider.notifier).loadTimeline());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(timelineProvider);
    final notifier = ref.read(timelineProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Timeline',
      showBack: false,
      body: state.isLoading
          ? const ListShimmer()
          : state.error != null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.loadTimeline(),
                )
              : state.items.isEmpty
                  ? const EmptyStateWidget(
                      message: 'No activity yet',
                      icon: Icons.timeline_rounded)
                  : RefreshIndicator(
                      onRefresh: () => notifier.loadTimeline(),
                      child: ListView(
                        padding: const EdgeInsets.symmetric(
                            vertical: 8),
                        children: notifier.groupedByDate.entries
                            .map((entry) => _dateGroup(
                                entry.key, entry.value, theme))
                            .toList(),
                      ),
                    ),
    );
  }

  Widget _dateGroup(
      String dateKey, List<TimelineItem> items, ThemeData theme) {
    final dateParts = dateKey.split('-');
    final date = DateTime(
        int.parse(dateParts[0]),
        int.parse(dateParts[1]),
        int.parse(dateParts[2]));
    final isToday = date.day == DateTime.now().day &&
        date.month == DateTime.now().month &&
        date.year == DateTime.now().year;
    final isYesterday = date.day == DateTime.now().subtract(const Duration(days: 1)).day &&
        date.month == DateTime.now().month &&
        date.year == DateTime.now().year;

    String header;
    if (isToday) {
      header = 'Today';
    } else if (isYesterday) {
      header = 'Yesterday';
    } else {
      header = date.toDisplayDate();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(header,
              style: theme.textTheme.titleSmall
                  ?.copyWith(fontWeight: FontWeight.w600, color: Colors.grey[600])),
        ),
        ...items.map((item) => _timelineItem(item, theme)),
      ],
    );
  }

  Widget _timelineItem(TimelineItem item, ThemeData theme) {
    final (icon, color) = _typeIcon(item.type);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 12,
                height: 12,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
              ),
              Container(
                width: 2,
                height: 60,
                color: Colors.grey.withValues(alpha: 0.2),
              ),
            ],
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Card(
              margin: EdgeInsets.zero,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: color.withValues(alpha: 0.15),
                      child: Icon(icon, color: color, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment.start,
                        children: [
                          Text(item.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w500)),
                          if (item.description != null)
                            Text(item.description!,
                                style: TextStyle(
                                    color: Colors.grey[600],
                                    fontSize: 12)),
                        ],
                      ),
                    ),
                    Text(item.timestamp.timeAgo(),
                        style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color) _typeIcon(String type) {
    switch (type) {
      case 'attendance':
        return (Icons.access_time_rounded, Colors.blue);
      case 'task':
        return (Icons.checklist_rounded, Colors.green);
      case 'leave':
        return (Icons.calendar_month_rounded, Colors.orange);
      case 'announcement':
        return (Icons.campaign_rounded, Colors.purple);
      case 'booking':
        return (Icons.event_available_rounded, Colors.teal);
      case 'approval':
        return (Icons.thumb_up_rounded, Colors.indigo);
      default:
        return (Icons.circle_notifications_rounded, Colors.grey);
    }
  }
}
