import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/models/dashboard_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'animated_counter.dart';

class _StatEntry {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String route;

  const _StatEntry({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    required this.route,
  });
}

/// "Personal Summary" section with animated stat cards in a 2x2 grid.
class PersonalSummary extends StatelessWidget {
  final DashboardStatsModel stats;

  const PersonalSummary({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    final entries = [
      _StatEntry(
        label: 'Pending Leaves',
        value: '${stats.pendingLeaves}',
        icon: Icons.beach_access_rounded,
        color: const Color(0xFFFF9800),
        route: '/leaves',
      ),
      _StatEntry(
        label: 'Pending Tasks',
        value: '${stats.pendingTasks}',
        icon: Icons.task_alt_rounded,
        color: const Color(0xFF2196F3),
        route: '/tasks',
      ),
      _StatEntry(
        label: 'Notifications',
        value: '${stats.unreadNotifications}',
        icon: Icons.notifications_rounded,
        color: const Color(0xFFE91E63),
        route: '/notifications',
      ),
      _StatEntry(
        label: 'Approvals',
        value: '${stats.pendingApprovals}',
        icon: Icons.how_to_reg_rounded,
        color: const Color(0xFF9C27B0),
        route: '/approvals',
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.section),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header with action label
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Personal Summary', style: AppTypography.title(context)),
              GestureDetector(
                onTap: () {},
                child: Text(
                  'DETAILED WORKPLACE',
                  style: AppTypography.overline(context).copyWith(
                    color: AppColors.primary(context),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.normal),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 1.35,
              crossAxisSpacing: AppSpacing.normal,
              mainAxisSpacing: AppSpacing.normal,
            ),
            itemCount: entries.length,
            itemBuilder: (_, index) =>
                _StatCard(entry: entries[index]),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final _StatEntry entry;
  const _StatCard({required this.entry});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(AppSpacing.section - 2),
      onTap: () => context.push(entry.route),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Colored left accent + icon
          Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: entry.color.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(AppRadius.button),
                ),
                child: Icon(entry.icon, color: entry.color, size: 20),
              ),
            ],
          ),
          const Spacer(),
          // Animated counter
          AnimatedCounter(
            target: int.tryParse(entry.value) ?? 0,
            style: TextStyle(
              fontFamily: 'PlusJakartaSans',
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: entry.color,
              height: 1,
            ),
          ),
          const SizedBox(height: AppSpacing.micro),
          Text(
            entry.label,
            style: AppTypography.caption(context),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
