import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';

/// A fixed-height top bar for the dashboard with logo, greeting, notification bell, and avatar.
///
/// Curved bottom edge matches the bottom nav bar corner style.
class DashboardHeaderDelegate extends SliverPersistentHeaderDelegate {
  final dynamic user;
  final VoidCallback onAvatarTap;
  final double topPadding;

  DashboardHeaderDelegate({
    required this.user,
    required this.onAvatarTap,
    required this.topPadding,
  });

  static const double _barHeight = 64.0;

  @override
  double get maxExtent => _barHeight + topPadding;

  @override
  double get minExtent => _barHeight + topPadding;

  @override
  bool shouldRebuild(covariant DashboardHeaderDelegate oldDelegate) {
    return user != oldDelegate.user || topPadding != oldDelegate.topPadding;
  }

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final hour = DateTime.now().hour;
    final greeting = hour < 12
        ? '\ud83d\udc4b Good morning'
        : hour < 17
            ? '\ud83d\udc4b Good afternoon'
            : '\ud83d\udc4b Good evening';

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(
        bottom: Radius.circular(AppRadius.card),
      ),
      child: Container(
        height: maxExtent,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1A1D21) : const Color(0xFFF0F7F2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.15 : 0.04),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Padding(
            padding: EdgeInsets.fromLTRB(
              AppSpacing.section,
              topPadding + AppSpacing.normal,
              AppSpacing.section,
              AppSpacing.compact,
            ),
            child: Row(
              children: [
                // Left: Logo + Name
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    SvgPicture.asset(
                      'assets/images/thl_logo.svg',
                      height: 34,
                    ),
                    const SizedBox(width: 8),
                    SvgPicture.asset(
                      'assets/images/thl_name.svg',
                      height: 20,
                      colorFilter: ColorFilter.mode(
                        AppColors.foreground(context),
                        BlendMode.srcIn,
                      ),
                    ),
                  ],
                ),

                const Spacer(),

                // Greeting text
                Text(
                  greeting,
                  style: AppTypography.caption(context).copyWith(
                    fontWeight: FontWeight.w600,
                    color: AppColors.mutedForeground(context),
                  ),
                ),

                const SizedBox(width: 12),

                // Right: Action Buttons (Notification & Profile)
                Row(
                  children: [
                    // Notification Button
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
                            Positioned(
                              top: 10,
                              right: 10,
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
                    // Profile Avatar Button
                    GestureDetector(
                      onTap: onAvatarTap,
                      child: _TopBarIcon(
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
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
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
