import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'role_badge.dart';

/// A collapsible top bar for the dashboard with logo, greeting details, notification bell, and avatar.
///
/// Shrinks smoothly on scroll from expanded greeting details down to a pinned compact top bar.
class DashboardHeaderDelegate extends SliverPersistentHeaderDelegate {
  final dynamic user;
  final dynamic stats;
  final VoidCallback onAvatarTap;
  final double topPadding;

  DashboardHeaderDelegate({
    required this.user,
    required this.stats,
    required this.onAvatarTap,
    required this.topPadding,
  });

  @override
  double get minExtent => 64.0 + topPadding;

  @override
  double get maxExtent => 196.0 + topPadding;

  @override
  bool shouldRebuild(covariant DashboardHeaderDelegate oldDelegate) {
    return user != oldDelegate.user ||
        stats != oldDelegate.stats ||
        topPadding != oldDelegate.topPadding;
  }

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Calculate scroll progress percentage
    final double maxScroll = maxExtent - minExtent;
    final double shrinkPercentage = (shrinkOffset / maxScroll).clamp(0.0, 1.0);
    final double opacity = (1.0 - shrinkPercentage).clamp(0.0, 1.0);

    // Determine time-of-day background glow color (5% opacity)
    final hour = DateTime.now().hour;
    Color timeOfDayColor;
    String greetingLabel;
    if (hour < 12) {
      timeOfDayColor = const Color(0xFFFFB300); // Warm amber
      greetingLabel = 'Good morning';
    } else if (hour < 17) {
      timeOfDayColor = const Color(0xFF1A8A3E); // Green
      greetingLabel = 'Good afternoon';
    } else if (hour < 21) {
      timeOfDayColor = const Color(0xFF2196F3); // Blue
      greetingLabel = 'Good evening';
    } else {
      timeOfDayColor = const Color(0xFF0F172A); // Dark navy
      greetingLabel = 'Good night';
    }

    final headerBgColor = isDark
        ? const Color(0xFF1A1D21)
        : const Color(0xFFF5F7F5); // Blends into scaffold background

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(
        bottom: Radius.circular(AppRadius.card),
      ),
      child: Container(
        height: maxExtent - shrinkOffset,
        decoration: BoxDecoration(
          color: headerBgColor,
          boxShadow: shrinkPercentage > 0.05
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.04),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null, // No shadow when fully expanded
        ),
        child: Stack(
          children: [
            // Dynamic Time-of-day gradient background glow overlay
            Positioned.fill(
              child: AnimatedContainer(
                duration: AppMotion.normal,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      timeOfDayColor.withValues(alpha: isDark ? 0.08 : 0.04),
                      timeOfDayColor.withValues(alpha: 0.0),
                    ],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
            ),

            // Faded watermark brand logo in background
            if (opacity > 0.01)
              Positioned(
                right: -20,
                bottom: -30,
                child: Opacity(
                  opacity: 0.03 * opacity,
                  child: SvgPicture.asset(
                    'assets/images/thl_logo.svg',
                    width: 160,
                    height: 160,
                  ),
                ),
              ),

            // Core content Column
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.section),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(height: topPadding),

                  // Top Bar (pinned/always visible)
                  SizedBox(
                    height: 64.0,
                    child: Row(
                      children: [
                        // Left: Brand Logo & Name
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.center,
                          children: [
                            SvgPicture.asset(
                              'assets/images/thl_logo.svg',
                              height: 32,
                            ),
                            const SizedBox(width: 8),
                            SvgPicture.asset(
                              'assets/images/thl_name.svg',
                              height: 18,
                              colorFilter: ColorFilter.mode(
                                AppColors.foreground(context),
                                BlendMode.srcIn,
                              ),
                            ),
                          ],
                        ),
                        const Spacer(),

                        // Right: Actions (Notifications & Avatar)
                        Row(
                          children: [
                            // Notifications
                            GestureDetector(
                              onTap: () => context.push('/notifications'),
                              child: _TopBarIcon(
                                isDark: isDark,
                                child: Stack(
                                  children: [
                                    Center(
                                      child: Icon(
                                        Icons.notifications_none_rounded,
                                        color: AppColors.foreground(context),
                                        size: AppIconSize.list,
                                      ),
                                    ),
                                    if (stats != null && stats.unreadNotifications > 0)
                                      Positioned(
                                        top: 9,
                                        right: 9,
                                        child: Container(
                                          width: 6,
                                          height: 6,
                                          decoration: const BoxDecoration(
                                            color: Color(0xFFEF4444),
                                            shape: BoxShape.circle,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            // Profile Avatar
                            GestureDetector(
                              onTap: onAvatarTap,
                              child: Stack(
                                children: [
                                  _TopBarIcon(
                                    isDark: isDark,
                                    child: Center(
                                      child: Text(
                                        user?.initials ?? '?',
                                        style: TextStyle(
                                          fontFamily: 'PlusJakartaSans',
                                          color: AppColors.primary(context),
                                          fontWeight: FontWeight.w800,
                                          fontSize: 13,
                                          letterSpacing: -0.2,
                                        ),
                                      ),
                                    ),
                                  ),
                                  // Online green status dot
                                  Positioned(
                                    bottom: 0,
                                    right: 0,
                                    child: Container(
                                      width: 10,
                                      height: 10,
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF10B981),
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                          color: headerBgColor,
                                          width: 1.5,
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Expanded Greeting Details Area
                  if (shrinkPercentage < 0.99)
                    Expanded(
                      child: Opacity(
                        opacity: opacity,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Row(
                              children: [
                                if (user?.role != null) ...[
                                  RoleBadge(role: user.role.toString()),
                                  const SizedBox(width: 8),
                                ],
                                Text(
                                  greetingLabel,
                                  style: AppTypography.caption(context).copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.mutedForeground(context),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              user?.fullName ?? 'User Name',
                              style: AppTypography.display(context),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _buildDynamicSubtext(stats),
                              style: AppTypography.caption(context),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
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

  String _buildDynamicSubtext(dynamic stats) {
    if (stats == null) return 'Reviewing today\'s wins';
    final parts = <String>[];
    if (stats.pendingTasks > 0) {
      parts.add('${stats.pendingTasks} task${stats.pendingTasks == 1 ? '' : 's'} pending');
    }
    if (stats.pendingApprovals > 0) {
      parts.add('${stats.pendingApprovals} approval${stats.pendingApprovals == 1 ? '' : 's'} waiting');
    }
    if (stats.unreadNotifications > 0) {
      parts.add('${stats.unreadNotifications} notification${stats.unreadNotifications == 1 ? '' : 's'}');
    }
    if (parts.isEmpty) return 'All caught up for today';
    return parts.join(' · ');
  }
}

class _TopBarIcon extends StatelessWidget {
  final bool isDark;
  final Widget child;

  const _TopBarIcon({required this.isDark, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 38,
      height: 38,
      decoration: BoxDecoration(
        color: AppColors.card(context),
        shape: BoxShape.circle,
        border: Border.all(
          color: AppColors.border(context).withValues(alpha: isDark ? 0.3 : 0.6),
          width: 1.0,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
            blurRadius: 6,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: child,
    );
  }
}
