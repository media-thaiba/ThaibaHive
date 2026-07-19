import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/shared/widgets/tap_scale.dart';

class _ActionItem {
  final String label;
  final IconData icon;
  final Color color;
  final String route;
  const _ActionItem(
      {required this.label,
      required this.icon,
      required this.color,
      required this.route});
}

/// A 2x2 grid of premium quick-action cards with haptic feedback.
class QuickActionsGrid extends StatelessWidget {
  final List<_ActionItem> _actions = const [
    _ActionItem(
        label: 'Check In/Out',
        icon: Icons.fingerprint_rounded,
        color: Color(0xFF1a8a3e),
        route: '/attendance'),
    _ActionItem(
        label: 'Apply Leave',
        icon: Icons.beach_access_rounded,
        color: Color(0xFFFF9800),
        route: '/leaves/apply'),
    _ActionItem(
        label: 'New Task',
        icon: Icons.add_task_rounded,
        color: Color(0xFF2196F3),
        route: '/tasks/create'),
    _ActionItem(
        label: 'Attendance',
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
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 2.2,
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
            color: action.color.withValues(alpha: isDark ? 0.2 : 0.15),
          ),
          boxShadow: [
            BoxShadow(
              color: AppColors.shadow(context),
              blurRadius: 10,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: action.color.withValues(alpha: isDark ? 0.18 : 0.1),
                borderRadius: BorderRadius.circular(AppRadius.button),
              ),
              child: Icon(action.icon, color: action.color, size: 22),
            ),
            const SizedBox(width: AppSpacing.normal),
            Flexible(
              child: Text(
                action.label.toUpperCase(),
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 11.5,
                  fontWeight: FontWeight.w700,
                  color: action.color.withValues(alpha: isDark ? 0.9 : 0.85),
                  letterSpacing: 0.3,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
