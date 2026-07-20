import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/features/dashboard/data/dashboard_provider.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';
import 'package:thaibahive_mobile/shared/widgets/update_banner.dart';
import 'components/components.dart';

/// Riverpod provider for dashboard section ordering.
final dashboardSectionOrderProvider =
    StateProvider<List<String>>((ref) => const [
          'attendance',
          'actions',
          'summary',
          'activity',
        ]);

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  void _showProfileBottomSheet(dynamic user) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
      ),
      backgroundColor: isDark ? const Color(0xFF22262b) : Colors.white,
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.section),
                child: Row(
                  children: [
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: LinearGradient(
                          colors: [
                            theme.colorScheme.primary.withValues(alpha: 0.2),
                            theme.colorScheme.primary.withValues(alpha: 0.1),
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                        border: Border.all(
                          color: theme.colorScheme.primary
                              .withValues(alpha: 0.3),
                          width: 2,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          user?.initials ?? '?',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.section),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.fullName ?? 'User Name',
                            style: theme.textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 2),
                          if (user?.designation != null &&
                              user.designation!.isNotEmpty)
                            Text(
                              user.designation!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.mutedForeground(context),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              RoleBadge(role: user?.role?.toString() ?? 'staff'),
                              if (user?.employeeId != null &&
                                  user.employeeId.isNotEmpty) ...[
                                const SizedBox(width: AppSpacing.compact),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppColors.muted(context),
                                    borderRadius:
                                        BorderRadius.circular(AppRadius.badge),
                                  ),
                                  child: Text(
                                    'ID: ${user.employeeId}',
                                    style: AppTypography.caption(context),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.section),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary(context).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                  child: Icon(Icons.person_outline_rounded,
                      size: 18, color: AppColors.primary(context)),
                ),
                title: const Text('Edit Profile'),
                trailing: const Icon(Icons.chevron_right_rounded, size: 18),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/settings/profile');
                },
              ),
              ListTile(
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.muted(context),
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                  child: Icon(Icons.settings_outlined,
                      size: 18, color: AppColors.mutedForeground(context)),
                ),
                title: const Text('Settings'),
                trailing: const Icon(Icons.chevron_right_rounded, size: 18),
                onTap: () {
                  Navigator.pop(ctx);
                  context.push('/settings');
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.destructive(context)
                        .withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(AppRadius.button),
                  ),
                  child: Icon(Icons.logout_rounded,
                      size: 18, color: AppColors.destructive(context)),
                ),
                title: Text('Logout',
                    style: TextStyle(color: AppColors.destructive(context))),
                trailing: Icon(Icons.chevron_right_rounded,
                    size: 18, color: AppColors.destructive(context)),
                onTap: () {
                  Navigator.pop(ctx);
                  _showLogoutConfirmationDialog();
                },
              ),
              const SizedBox(height: AppSpacing.compact),
            ],
          ),
        );
      },
    );
  }

  void _showLogoutConfirmationDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(authProvider.notifier).logout();
              Navigator.pop(ctx);
              context.go('/auth/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dashState = ref.watch(dashboardProvider);
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final sectionOrder = ref.watch(dashboardSectionOrderProvider);
    final topPadding = MediaQuery.of(context).padding.top;

    return RefreshIndicator(
      color: AppColors.primary(context),
      onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          // ── Collapsible Header ──
            SliverPersistentHeader(
            pinned: true,
            delegate: DashboardHeaderDelegate(
              user: user,
              onAvatarTap: () => _showProfileBottomSheet(user),
              topPadding: topPadding,
            ),
          ),

          // ── Update Banner ──
          const SliverToBoxAdapter(child: UpdateBanner()),

          // ── Loading / Error / Content ──
          if (dashState.isLoading && dashState.stats == null)
            const SliverToBoxAdapter(child: _DashboardShimmer())
          else if (dashState.error != null && dashState.stats == null)
            SliverToBoxAdapter(
              child: AppErrorWidget(
                message: dashState.error!,
                onRetry: () =>
                    ref.read(dashboardProvider.notifier).refresh(),
              ),
            )
          else ...[
            // ── Dynamic section ordering ──
            ...sectionOrder.map((sectionId) {
              switch (sectionId) {
                case 'attendance':
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding:
                          const EdgeInsets.only(top: AppSpacing.dashboardSection),
                      child: AttendanceCard(stats: dashState.stats!),
                    ),
                  );
                case 'actions':
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding:
                          const EdgeInsets.only(top: AppSpacing.dashboardSection),
                      child: QuickActionsGrid(),
                    ),
                  );
                case 'summary':
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding:
                          const EdgeInsets.only(top: AppSpacing.dashboardSection),
                      child: PersonalSummary(stats: dashState.stats!),
                    ),
                  );
                case 'activity':
                  return SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.only(
                          top: AppSpacing.dashboardSection, bottom: AppSpacing.major),
                      child: RecentActivity(
                        announcements:
                            dashState.stats!.recentAnnouncements,
                        events: dashState.stats!.upcomingEvents,
                      ),
                    ),
                  );
                default:
                  return const SliverToBoxAdapter(child: SizedBox.shrink());
              }
            }),

            // Bottom safe-area padding
            const SliverToBoxAdapter(
                child: SizedBox(height: AppSpacing.section)),
          ],
        ],
      ),
    );
  }
}

// ── Dashboard Shimmer ────────────────────────────────────────────────────────

class _DashboardShimmer extends StatelessWidget {
  const _DashboardShimmer();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF2a2e33) : Colors.grey.shade200,
      highlightColor:
          isDark ? const Color(0xFF3a3e43) : Colors.grey.shade100,
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.section),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Attendance card shimmer
            Container(
              height: 90,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
              ),
            ),
            const SizedBox(height: AppSpacing.section),
            // Quick actions shimmer (2x2)
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 2.2,
                crossAxisSpacing: AppSpacing.normal,
                mainAxisSpacing: AppSpacing.normal,
              ),
              itemCount: 4,
              itemBuilder: (_, __) => Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.button),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.section),
            // Stats grid shimmer (2x2)
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.35,
                crossAxisSpacing: AppSpacing.normal,
                mainAxisSpacing: AppSpacing.normal,
              ),
              itemCount: 4,
              itemBuilder: (_, __) => Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(AppRadius.card),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.section),
            // Activity shimmer
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(AppRadius.card),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
