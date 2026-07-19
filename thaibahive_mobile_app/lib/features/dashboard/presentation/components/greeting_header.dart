import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/models/dashboard_model.dart';
import 'role_badge.dart';

/// Builds the dynamic stat-based subtitle text.
String _buildDynamicSubtext(DashboardStatsModel stats) {
  final parts = <String>[];
  if (stats.pendingTasks > 0) {
    parts.add(
        '${stats.pendingTasks} task${stats.pendingTasks == 1 ? '' : 's'} pending');
  }
  if (stats.pendingApprovals > 0) {
    parts.add(
        '${stats.pendingApprovals} approval${stats.pendingApprovals == 1 ? '' : 's'} waiting');
  }
  if (stats.unreadNotifications > 0) {
    parts.add(
        '${stats.unreadNotifications} notification${stats.unreadNotifications == 1 ? '' : 's'}');
  }
  if (parts.isEmpty) return 'All caught up for today';
  return parts.join(' \u00b7 ');
}

/// A collapsible header delegate for use inside [CustomScrollView].
///
/// Expands to show full greeting, name, role badge, and dynamic subtext.
/// Collapses to a pinned top-bar with logo, notification bell, and avatar.
class DashboardHeaderDelegate extends SliverPersistentHeaderDelegate {
  final dynamic user;
  final DashboardStatsModel? stats;
  final VoidCallback onAvatarTap;

  DashboardHeaderDelegate({
    required this.user,
    this.stats,
    required this.onAvatarTap,
  });

  static const double _maxExtent = 200;
  static const double _minExtent = 64;

  @override
  double get maxExtent => _maxExtent;

  @override
  double get minExtent => _minExtent;

  @override
  bool shouldRebuild(covariant DashboardHeaderDelegate oldDelegate) {
    return user != oldDelegate.user || stats != oldDelegate.stats;
  }

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? 'Good morning'
        : hour < 17
            ? 'Good afternoon'
            : 'Good evening';
    final name = user?.fullName ?? 'User';
    final topPadding = MediaQuery.of(context).padding.top;
    final collapseProgress =
        (shrinkOffset / (_maxExtent - _minExtent)).clamp(0.0, 1.0);
    final isFullyCollapsed = collapseProgress >= 0.9;

    return Container(
      color: isDark ? const Color(0xFF1A1D21) : const Color(0xFFf5f7f5),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // ── Background gradient (fades out on collapse) ──
          if (!isFullyCollapsed)
            Opacity(
              opacity: 1.0 - collapseProgress,
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [
                            const Color(0xFF22262b),
                            const Color(0xFF1A1D21),
                          ]
                        : [
                            const Color(0xFFeef4ef),
                            const Color(0xFFf5f7f5),
                          ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

          // ── SVG watermark (fades out on collapse) ──
          if (!isFullyCollapsed)
            Positioned(
              right: -30,
              bottom: -50,
              child: Opacity(
                opacity: 0.03 * (1.0 - collapseProgress),
                child: SvgPicture.asset(
                  'assets/images/thl_logo.svg',
                  width: 220,
                  height: 220,
                  colorFilter: ColorFilter.mode(
                    isDark ? Colors.white : const Color(0xFF1a8a3e),
                    BlendMode.srcIn,
                  ),
                ),
              ),
            ),

          // ── Content ──
          Positioned(
            top: topPadding,
            left: 0,
            right: 0,
            bottom: 0,
            child: Column(
              children: [
                // ── Pinned top bar (always visible) ──
                _TopBar(
                  user: user,
                  isDark: isDark,
                  onAvatarTap: onAvatarTap,
                ),

                // ── Expandable greeting area ──
                if (!isFullyCollapsed)
                  Expanded(
                    child: Opacity(
                      opacity: 1.0 - collapseProgress,
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.section),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const SizedBox(height: 4),
                            // Role badge
                            if (user?.role != null)
                              RoleBadge(role: user!.role.toString()),
                            const SizedBox(height: 10),
                            // Greeting
                            Text(
                              greeting.toUpperCase(),
                              style: AppTypography.overline(
                                context,
                                color: AppColors.primary(context),
                              ),
                            ),
                            const SizedBox(height: 4),
                            // Full name
                            Text(
                              name,
                              style: AppTypography.display(context),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 6),
                            // Dynamic stat subtext
                            if (stats != null)
                              Text(
                                _buildDynamicSubtext(stats!),
                                style: AppTypography.caption(context),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                    ),
                  ),

                // Collapsed spacer
                if (isFullyCollapsed) const SizedBox(height: 8),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ── Top Bar (logo + notifications + avatar) ──────────────────────────────────

class _TopBar extends StatelessWidget {
  final dynamic user;
  final bool isDark;
  final VoidCallback onAvatarTap;

  const _TopBar({
    required this.user,
    required this.isDark,
    required this.onAvatarTap,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.section, vertical: AppSpacing.compact),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Left: Logo + Name
          Row(
            children: [
              SvgPicture.asset(
                'assets/images/thl_logo.svg',
                height: 28,
              ),
              const SizedBox(width: 8),
              SvgPicture.asset(
                'assets/images/thl_name.svg',
                height: 18,
              ),
            ],
          ),
          // Right: Notification bell + Avatar
          Row(
            children: [
              GestureDetector(
                onTap: () => context.push('/notifications'),
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: isDark
                        ? Colors.white.withValues(alpha: 0.08)
                        : const Color(0xFF4a4e52).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                  child: Stack(
                    children: [
                      Center(
                        child: Icon(
                          Icons.notifications_outlined,
                          color: AppColors.foreground(context),
                          size: 20,
                        ),
                      ),
                      Positioned(
                        top: 8,
                        right: 8,
                        child: Container(
                          width: 7,
                          height: 7,
                          decoration: BoxDecoration(
                            color: const Color(0xFFf44336),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: isDark
                                  ? const Color(0xFF22262b)
                                  : const Color(0xFFf5f7f5),
                              width: 1.5,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 10),
              GestureDetector(
                onTap: onAvatarTap,
                child: Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      colors: [
                        AppColors.primary(context).withValues(alpha: 0.2),
                        AppColors.primary(context).withValues(alpha: 0.1),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    border: Border.all(
                      color: AppColors.primary(context).withValues(alpha: 0.3),
                      width: 1.5,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      user?.initials ?? '?',
                      style: TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        color: AppColors.primary(context),
                        fontWeight: FontWeight.w700,
                        fontSize: 14,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
