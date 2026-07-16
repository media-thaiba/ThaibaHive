import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/extensions.dart';
import '../../../models/notification_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/tap_scale.dart';
import '../data/notifications_provider.dart';

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final notificationsAsync = ref.watch(notificationsListProvider);
    final unreadAsync = ref.watch(unreadCountProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          unreadAsync.when(
            data: (count) {
              if (count == 0) return const SizedBox.shrink();
              return TextButton.icon(
                onPressed: () =>
                    ref.read(notificationsListProvider.notifier).markAllAsRead(),
                icon: const Icon(Icons.done_all_rounded, size: 18),
                label: const Text('Mark All Read'),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: notificationsAsync.when(
        data: (notifications) {
          if (notifications.isEmpty) {
            return const EmptyStateWidget(
              icon: Icons.notifications_off_rounded,
              title: 'No Notifications',
              message: 'You\'re all caught up!',
            );
          }
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(notificationsListProvider.notifier).refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: notifications.length,
              itemBuilder: (_, i) => Dismissible(
                key: ValueKey(notifications[i].id),
                direction: notifications[i].isRead
                    ? DismissDirection.none
                    : DismissDirection.horizontal,
                background: Container(
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.only(left: 24),
                  color: theme.colorScheme.primary,
                  child: const Icon(Icons.done_rounded,
                      color: Colors.white),
                ),
                onDismissed: (_) => ref
                    .read(notificationsListProvider.notifier)
                    .markAsRead(notifications[i].id),
                child: _NotificationItem(
                  notification: notifications[i],
                  onTap: () {
                    if (!notifications[i].isRead) {
                      ref
                          .read(notificationsListProvider.notifier)
                          .markAsRead(notifications[i].id);
                    }
                  },
                ),
              ),
            ),
          );
        },
        loading: () => const PageShimmer(),
        error: (e, _) => AppErrorWidget(
          message: e.toString(),
          onRetry: () =>
              ref.read(notificationsListProvider.notifier).refresh(),
        ),
      ),
    );
  }
}

class _NotificationItem extends StatelessWidget {
  final NotificationModel notification;
  final VoidCallback onTap;
  const _NotificationItem({
    required this.notification,
    required this.onTap,
  });

  IconData _typeIcon(String type) {
    switch (type) {
      case 'leave':
        return Icons.beach_access_rounded;
      case 'task':
        return Icons.checklist_rounded;
      case 'announcement':
        return Icons.campaign_rounded;
      case 'approval':
        return Icons.approval_rounded;
      case 'event':
        return Icons.event_rounded;
      case 'attendance':
        return Icons.access_time_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return TapScale(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: !notification.isRead
              ? theme.colorScheme.primary.withValues(alpha: 0.05)
              : null,
          border: Border(
            bottom: BorderSide(
              color: theme.dividerTheme.color!,
              width: 0.5,
            ),
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: SizedBox(
                width: 20,
                height: 20,
                child: Icon(
                  _typeIcon(notification.type),
                  size: 20,
                  color: theme.colorScheme.primary,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: !notification.isRead
                                ? FontWeight.w600
                                : FontWeight.normal,
                          ),
                        ),
                      ),
                      if (!notification.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  if (notification.message != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      notification.message!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface
                            .withValues(alpha: 0.7),
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: 4),
                  Text(
                    notification.createdAt.timeAgo(),
                    style: theme.textTheme.labelSmall?.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
