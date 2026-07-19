import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/models/announcement_model.dart';
import 'package:thaibahive_mobile/models/event_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';

/// Groups announcements and events into a vertical timeline organised by date.
///
/// Sections: "Today", "Yesterday", or the day name (e.g. "Monday").
class RecentActivity extends StatelessWidget {
  final List<AnnouncementModel> announcements;
  final List<EventModel> events;

  const RecentActivity({
    super.key,
    required this.announcements,
    required this.events,
  });

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    // Group items by date
    final groups = <String, List<_ActivityItem>>{};

    for (final a in announcements) {
      final date = a.createdAt;
      final label = _dateLabel(date, today, yesterday);
      groups.putIfAbsent(label, () => []).add(
            _ActivityItem(
              title: a.title,
              subtitle: a.authorName != null ? 'By ${a.authorName}' : null,
              icon: Icons.campaign_rounded,
              color: _priorityColor(a.priority),
              badge: a.priority,
              badgeVariant: _priorityBadgeVariant(a.priority),
              route: '/announcements/${a.id}',
              date: date,
            ),
          );
    }

    for (final e in events) {
      final date = DateTime.tryParse(e.eventDate);
      final label = _dateLabel(date, today, yesterday);
      groups.putIfAbsent(label, () => []).add(
            _ActivityItem(
              title: e.title,
              subtitle: e.location,
              icon: Icons.event_rounded,
              color: AppColors.primary(context),
              badge: e.startTime,
              badgeVariant: StatusBadgeVariant.success,
              route: '/events/${e.id}',
              date: date,
            ),
          );
    }

    if (groups.isEmpty) {
      return _EmptyState(isDark: Theme.of(context).brightness == Brightness.dark);
    }

    // Sort groups by date (most recent first)
    final sortedKeys = groups.keys.toList();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.section),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Recent Activity', style: AppTypography.title(context)),
          const SizedBox(height: AppSpacing.normal),
          ...sortedKeys.map((dateLabel) {
            final items = groups[dateLabel]!;
            items.sort((a, b) {
              if (a.date == null) return 1;
              if (b.date == null) return -1;
              return b.date!.compareTo(a.date!);
            });
            return _TimelineGroup(label: dateLabel, items: items);
          }),
        ],
      ),
    );
  }

  String _dateLabel(DateTime? date, DateTime today, DateTime yesterday) {
    if (date == null) return 'Other';
    final d = DateTime(date.year, date.month, date.day);
    if (d == today) return 'Today';
    if (d == yesterday) return 'Yesterday';
    return DateFormat('EEEE').format(date); // e.g. "Monday"
  }

  Color _priorityColor(String? priority) {
    switch (priority) {
      case 'high':
        return Colors.red;
      case 'medium':
        return Colors.orange;
      default:
        return const Color(0xFF607D8B);
    }
  }

  StatusBadgeVariant _priorityBadgeVariant(String? priority) {
    switch (priority) {
      case 'high':
        return StatusBadgeVariant.destructive;
      case 'medium':
        return StatusBadgeVariant.warning;
      default:
        return StatusBadgeVariant.secondary;
    }
  }
}

class _ActivityItem {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color color;
  final String? badge;
  final StatusBadgeVariant badgeVariant;
  final String route;
  final DateTime? date;

  const _ActivityItem({
    required this.title,
    this.subtitle,
    required this.icon,
    required this.color,
    this.badge,
    required this.badgeVariant,
    required this.route,
    this.date,
  });
}

class _TimelineGroup extends StatelessWidget {
  final String label;
  final List<_ActivityItem> items;

  const _TimelineGroup({required this.label, required this.items});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.section),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date label
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.compact),
            child: Text(
              label.toUpperCase(),
              style: AppTypography.overline(context),
            ),
          ),
          // Timeline items
          ...items.map((item) => _TimelineCard(item: item)),
        ],
      ),
    );
  }
}

class _TimelineCard extends StatelessWidget {
  final _ActivityItem item;
  const _TimelineCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.compact),
      child: AppCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(AppSpacing.normal),
        onTap: () => context.push(item.route),
        child: Row(
          children: [
            // Timeline indicator
            Column(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: item.color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(AppRadius.badge),
                  ),
                  child: Icon(item.icon, color: item.color, size: 18),
                ),
              ],
            ),
            const SizedBox(width: AppSpacing.normal),
            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.title,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                        ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (item.subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      item.subtitle!,
                      style: AppTypography.caption(context),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            if (item.badge != null)
              StatusBadge(
                label: item.badge!,
                variant: item.badgeVariant,
              ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final bool isDark;
  const _EmptyState({required this.isDark});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.section, vertical: AppSpacing.major),
      child: Center(
        child: Column(
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: isDark
                    ? Colors.white.withValues(alpha: 0.05)
                    : const Color(0xFF4a4e52).withValues(alpha: 0.06),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.timeline_rounded,
                size: 28,
                color: AppColors.mutedForeground(context),
              ),
            ),
            const SizedBox(height: AppSpacing.normal),
            Text(
              'No recent activity',
              style: AppTypography.body(context).copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: AppSpacing.micro),
            Text(
              'Announcements and events will appear here',
              style: AppTypography.caption(context),
            ),
          ],
        ),
      ),
    );
  }
}
