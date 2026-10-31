import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';

/// Frosted quick-action sheet opened by the dock's center Create (+) button
/// (Rule 3). Every entry deep-links straight to a creation flow so a new
/// record is one tap away from anywhere in the app.
class CreateActionBottomSheet extends StatelessWidget {
  const CreateActionBottomSheet({super.key});

  static const List<({IconData icon, String title, String subtitle, String route})>
      _actions = [
    (
      icon: Icons.support_agent_rounded,
      title: 'Raise Helpdesk Ticket',
      subtitle: 'Report a fault or request a fix',
      route: '/help-desk',
    ),
    (
      icon: Icons.event_available_rounded,
      title: 'Apply Leave',
      subtitle: 'Request time off',
      route: '/leaves/apply',
    ),
    (
      icon: Icons.meeting_room_rounded,
      title: 'Book Space / Facility',
      subtitle: 'Reserve a room, hall or court',
      route: '/bookings/create',
    ),
    (
      icon: Icons.assignment_turned_in_rounded,
      title: 'Submit Report',
      subtitle: 'File a daily or weekly report',
      route: '/reports/create',
    ),
    (
      icon: Icons.task_alt_rounded,
      title: 'Log Daily Task',
      subtitle: 'Add a task to your workspace',
      route: '/tasks/create',
    ),
  ];

  /// Presents the sheet above the dock. Safe to call from any context.
  static Future<void> show(BuildContext context) {
    HapticFeedback.lightImpact();
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const CreateActionBottomSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final navigator = GoRouter.of(context);

    return SafeArea(
      top: false,
      child: Container(
        margin: const EdgeInsets.fromLTRB(
          AppSpacing.section,
          0,
          AppSpacing.section,
          AppSpacing.normal,
        ),
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.section,
          AppSpacing.compact,
          AppSpacing.section,
          AppSpacing.section,
        ),
        decoration: BoxDecoration(
          color: isDark
              ? const Color(0xFF22262b).withValues(alpha: 0.97)
              : Colors.white.withValues(alpha: 0.98),
          borderRadius: BorderRadius.circular(AppRadius.sheet),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : const Color(0xFFd4dbd4).withValues(alpha: 0.6),
            width: isDark ? AppBorder.hairlineDark : AppBorder.hairline,
          ),
          boxShadow: AppShadows.chrome(Colors.black),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle — the sheet is dismissible by pull-down.
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.normal),
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.25),
                  borderRadius: BorderRadius.circular(AppRadius.badge),
                ),
              ),
            ),
            Semantics(
              header: true,
              child: Text(
                'CREATE',
                style: theme.textTheme.labelLarge?.copyWith(
                  fontSize: 11,
                  letterSpacing: 1.4,
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.75),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.compact),
            for (final action in _actions)
              _CreateActionTile(
                icon: action.icon,
                title: action.title,
                subtitle: action.subtitle,
                onTap: () {
                  Navigator.of(context).pop();
                  navigator.push(action.route);
                },
              ),
          ],
        ),
      ),
    );
  }
}

class _CreateActionTile extends StatelessWidget {
  const _CreateActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.button),
      child: Padding(
        padding: const EdgeInsets.symmetric(
          vertical: AppSpacing.normal,
          horizontal: AppSpacing.micro,
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(AppRadius.button),
              ),
              child: Icon(
                icon,
                size: AppIconSize.button,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(width: AppSpacing.normal),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontSize: 11,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              Icons.chevron_right_rounded,
              size: AppIconSize.list,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.35),
            ),
          ],
        ),
      ),
    );
  }
}
