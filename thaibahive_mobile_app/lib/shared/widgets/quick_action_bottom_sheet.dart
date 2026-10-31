import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme.dart';

/// Reusable modal bottom sheet for Quick Actions (Rule 14).
///
/// Opens in a swipe-down dismissible frosted card with a top drag handle
/// and direct action items, preserving the Today screen context.
class QuickActionBottomSheet extends StatelessWidget {
  final String title;
  final String? subtitle;
  final IconData icon;
  final Color color;
  final String targetRoute;
  final List<({String label, IconData icon, String route})>? subActions;

  const QuickActionBottomSheet({
    super.key,
    required this.title,
    this.subtitle,
    required this.icon,
    required this.color,
    required this.targetRoute,
    this.subActions,
  });

  static Future<void> show({
    required BuildContext context,
    required String title,
    String? subtitle,
    required IconData icon,
    required Color color,
    required String targetRoute,
    List<({String label, IconData icon, String route})>? subActions,
  }) {
    HapticFeedback.lightImpact();
    return showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => QuickActionBottomSheet(
        title: title,
        subtitle: subtitle,
        icon: icon,
        color: color,
        targetRoute: targetRoute,
        subActions: subActions,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

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
              ? const Color(0xFF22262b).withValues(alpha: 0.94)
              : Colors.white.withValues(alpha: 0.96),
          borderRadius: BorderRadius.circular(AppRadius.sheet),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.08)
                : const Color(0xFFd4dbd4).withValues(alpha: 0.6),
            width: isDark ? AppBorder.hairlineDark : AppBorder.hairline,
          ),
          boxShadow: AppShadows.card(Colors.black),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle (swipe down to dismiss)
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.normal),
                decoration: BoxDecoration(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.20)
                      : Colors.black.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),

            // Header row with icon, title, subtitle & close button
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.14),
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                  child: Icon(icon, color: color, size: 24),
                ),
                const SizedBox(width: AppSpacing.normal),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 2),
                        Text(
                          subtitle!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                  tooltip: 'Close',
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.section),

            // Sub-actions if provided
            if (subActions != null && subActions!.isNotEmpty) ...[
              for (final sub in subActions!)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.compact),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.normal,
                      vertical: 2,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppRadius.button),
                      side: BorderSide(
                        color: isDark
                            ? Colors.white.withValues(alpha: 0.06)
                            : Colors.black.withValues(alpha: 0.05),
                      ),
                    ),
                    leading: Icon(sub.icon, size: 20, color: color),
                    title: Text(
                      sub.label,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                    onTap: () {
                      Navigator.of(context).pop();
                      context.push(sub.route);
                    },
                  ),
                ),
            ],

            // Primary action button (Open full view)
            FilledButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                context.push(targetRoute);
              },
              icon: const Icon(Icons.open_in_new_rounded, size: 18),
              label: Text('Open $title'),
              style: FilledButton.styleFrom(
                backgroundColor: color,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(AppRadius.button),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
