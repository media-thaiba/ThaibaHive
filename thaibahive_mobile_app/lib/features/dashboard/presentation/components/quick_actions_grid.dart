import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/shared/widgets/tap_scale.dart';

class _ActionItem {
  final String label;
  final String description;
  final IconData icon;
  final Color color;
  final String route;
  const _ActionItem(
      {required this.label,
      required this.description,
      required this.icon,
      required this.color,
      required this.route});
}

/// A 2x2 grid of premium quick-action cards with haptic feedback.
class QuickActionsGrid extends StatelessWidget {
  final List<_ActionItem> _actions = const [
    _ActionItem(
        label: 'Check In/Out',
        description: 'Log hours & breaks',
        icon: Icons.fingerprint_rounded,
        color: Color(0xFF1a8a3e),
        route: '/attendance'),
    _ActionItem(
        label: 'Apply Leave',
        description: 'Request time off',
        icon: Icons.beach_access_rounded,
        color: Color(0xFFFF9800),
        route: '/leaves/apply'),
    _ActionItem(
        label: 'New Task',
        description: 'Assign pending items',
        icon: Icons.add_task_rounded,
        color: Color(0xFF2196F3),
        route: '/tasks/create'),
    _ActionItem(
        label: 'View History',
        description: 'Check past records',
        icon: Icons.calendar_month_rounded,
        color: Color(0xFF9C27B0),
        route: '/attendance'),
  ];

  QuickActionsGrid({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.section),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style: AppTypography.title(context),
          ),
          const SizedBox(height: AppSpacing.normal),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            padding: EdgeInsets.zero,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 2.3,
              crossAxisSpacing: AppSpacing.normal,
              mainAxisSpacing: AppSpacing.normal,
            ),
            itemCount: _actions.length,
            itemBuilder: (_, index) =>
                _ActionCard(action: _actions[index]),
          ),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final _ActionItem action;
  const _ActionCard({required this.action});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return TapScale(
      onTap: () {
        HapticFeedback.lightImpact();
        context.push(action.route);
      },
      child: Container(
        decoration: BoxDecoration(
          color: AppColors.card(context),
          borderRadius: BorderRadius.circular(AppRadius.button),
          border: Border.all(
            color: AppColors.border(context).withValues(alpha: isDark ? 0.4 : 0.6),
            width: 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow(context).withValues(alpha: isDark ? 0.15 : 0.03),
              blurRadius: 12,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          children: [
            const SizedBox(width: AppSpacing.normal),
            // Outlined soft icon box
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: action.color.withValues(alpha: isDark ? 0.15 : 0.08),
                borderRadius: BorderRadius.circular(AppRadius.badge + 2),
                border: Border.all(
                  color: action.color.withValues(alpha: isDark ? 0.35 : 0.25),
                  width: 1.0,
                ),
              ),
              child: Icon(action.icon, color: action.color, size: 18),
            ),
            const SizedBox(width: AppSpacing.normal),
            // Text labels Stacked
            Expanded(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    action.label,
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: AppColors.foreground(context),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    action.description,
                    style: AppTypography.caption(context).copyWith(
                      fontSize: 10.5,
                      fontWeight: FontWeight.w500,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: AppSpacing.compact),
          ],
        ),
      ),
    );
  }
}
