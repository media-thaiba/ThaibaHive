import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/features/dashboard/data/dashboard_provider.dart';
import 'package:thaibahive_mobile/features/settings/data/settings_provider.dart';
import 'package:thaibahive_mobile/models/announcement_model.dart';
import 'package:thaibahive_mobile/models/event_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';
import 'package:thaibahive_mobile/shared/widgets/section_header.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';
import 'package:thaibahive_mobile/shared/widgets/tap_scale.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  void _showProfileBottomSheet(BuildContext context, WidgetRef ref, dynamic user) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
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
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
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
                          color: theme.colorScheme.primary.withValues(alpha: 0.3),
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
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.fullName ?? 'User Name',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 2),
                          if (user?.designation != null)
                            Text(
                              user.designation!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                              ),
                            ),
                          if (user?.email != null)
                            Text(
                              user.email!,
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
                                fontSize: 11,
                              ),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: const Color(0xFF1a8a3e).withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.person_outline_rounded, size: 18, color: Color(0xFF1a8a3e)),
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
                    color: Colors.grey.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.settings_outlined, size: 18, color: Colors.grey),
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
                    color: Colors.red.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.logout_rounded, size: 18, color: Colors.red),
                ),
                title: const Text('Logout', style: TextStyle(color: Colors.red)),
                trailing: const Icon(Icons.chevron_right_rounded, size: 18, color: Colors.red),
                onTap: () {
                  Navigator.pop(ctx);
                  _showLogoutConfirmationDialog(context, ref);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  void _showLogoutConfirmationDialog(BuildContext context, WidgetRef ref) {
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
              ref.read(currentUserProvider.notifier).clear();
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

    return RefreshIndicator(
      color: const Color(0xFF1a8a3e),
      onRefresh: () => ref.read(dashboardProvider.notifier).refresh(),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _GreetingHeader(
              user: user,
              onAvatarTap: () => _showProfileBottomSheet(context, ref, user),
            ),
            if (dashState.isLoading && dashState.stats == null)
              const _DashboardShimmer()
            else if (dashState.error != null && dashState.stats == null)
              AppErrorWidget(
                message: dashState.error!,
                onRetry: () => ref.read(dashboardProvider.notifier).refresh(),
              )
            else ...[
              _QuickStatsGrid(stats: dashState.stats!),
              _TodayAttendanceCard(stats: dashState.stats!),
              const SizedBox(height: 4),
              _QuickActions(),
              const SizedBox(height: 8),
              if (dashState.stats!.recentAnnouncements.isNotEmpty)
                _AnnouncementsSection(
                    announcements: dashState.stats!.recentAnnouncements),
              if (dashState.stats!.upcomingEvents.isNotEmpty)
                _EventsSection(events: dashState.stats!.upcomingEvents),
            ],
          ],
        ),
      ),
    );
  }
}

// ── Greeting Header ──────────────────────────────────────────────────────────

class _GreetingHeader extends StatelessWidget {
  final dynamic user;
  final VoidCallback onAvatarTap;

  const _GreetingHeader({this.user, required this.onAvatarTap});

  @override
  Widget build(BuildContext context) {
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
    final today = DateFormat('EEEE, d MMMM').format(DateTime.now());

    return RepaintBoundary(
      child: isDark
          ? _DarkHeader(
              user: user,
              greeting: greeting,
              name: name,
              today: today,
              topPadding: topPadding,
              onAvatarTap: onAvatarTap,
              theme: theme,
            )
          : _LightHeader(
              user: user,
              greeting: greeting,
              name: name,
              today: today,
              topPadding: topPadding,
              onAvatarTap: onAvatarTap,
              theme: theme,
            ),
    );
  }
}

class _LightHeader extends StatelessWidget {
  final dynamic user;
  final String greeting;
  final String name;
  final String today;
  final double topPadding;
  final VoidCallback onAvatarTap;
  final ThemeData theme;

  const _LightHeader({
    required this.user,
    required this.greeting,
    required this.name,
    required this.today,
    required this.topPadding,
    required this.onAvatarTap,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 16 + topPadding, 20, 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1a8a3e), Color(0xFF0f6b30)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: Stack(
        children: [
          // Subtle glint overlay — white diagonal stripe at 4% opacity
          Positioned.fill(
            child: ClipRRect(
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(28),
                bottomRight: Radius.circular(28),
              ),
              child: Opacity(
                opacity: 0.04,
                child: Transform.rotate(
                  angle: -0.4,
                  child: Container(
                    margin: const EdgeInsets.only(left: 100),
                    width: 60,
                    decoration: const BoxDecoration(color: Colors.white),
                  ),
                ),
              ),
            ),
          ),
          _HeaderContent(
            user: user,
            greeting: greeting,
            name: name,
            today: today,
            onAvatarTap: onAvatarTap,
            textColor: Colors.white,
            subtextColor: Colors.white.withValues(alpha: 0.75),
          ),
        ],
      ),
    );
  }
}

class _DarkHeader extends StatelessWidget {
  final dynamic user;
  final String greeting;
  final String name;
  final String today;
  final double topPadding;
  final VoidCallback onAvatarTap;
  final ThemeData theme;

  const _DarkHeader({
    required this.user,
    required this.greeting,
    required this.name,
    required this.today,
    required this.topPadding,
    required this.onAvatarTap,
    required this.theme,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 16 + topPadding, 20, 24),
      decoration: BoxDecoration(
        color: const Color(0xFF22262b),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        border: Border(
          bottom: BorderSide(
            color: theme.colorScheme.primary.withValues(alpha: 0.25),
            width: 1.5,
          ),
        ),
      ),
      child: _HeaderContent(
        user: user,
        greeting: greeting,
        name: name,
        today: today,
        onAvatarTap: onAvatarTap,
        textColor: const Color(0xFFd1d5d1),
        subtextColor: const Color(0xFFd1d5d1).withValues(alpha: 0.6),
      ),
    );
  }
}

class _HeaderContent extends StatelessWidget {
  final dynamic user;
  final String greeting;
  final String name;
  final String today;
  final VoidCallback onAvatarTap;
  final Color textColor;
  final Color subtextColor;

  const _HeaderContent({
    required this.user,
    required this.greeting,
    required this.name,
    required this.today,
    required this.onAvatarTap,
    required this.textColor,
    required this.subtextColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                today,
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 11.5,
                  fontWeight: FontWeight.w500,
                  color: subtextColor,
                  letterSpacing: 0.3,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '$greeting,',
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: subtextColor,
                ),
              ),
              const SizedBox(height: 1),
              Text(
                name,
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                  color: textColor,
                  letterSpacing: -0.3,
                ),
                overflow: TextOverflow.ellipsis,
              ),
              if (user?.designation != null) ...[
                const SizedBox(height: 2),
                Text(
                  user.designation,
                  style: TextStyle(
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: subtextColor,
                  ),
                ),
              ],
            ],
          ),
        ),
        const SizedBox(width: 12),
        Column(
          children: [
            // Notification bell
            GestureDetector(
              onTap: () => context.push('/notifications'),
              child: Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Stack(
                  children: [
                    const Center(
                      child: Icon(
                        Icons.notifications_outlined,
                        color: Colors.white,
                        size: 22,
                      ),
                    ),
                    // Red badge dot
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: const Color(0xFFf44336),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 1.5),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            // Avatar
            GestureDetector(
              onTap: onAvatarTap,
              child: Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.22),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.5), width: 2),
                ),
                child: Center(
                  child: Text(
                    user?.initials ?? '?',
                    style: const TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: Colors.white,
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

// ── Quick Stats Grid ─────────────────────────────────────────────────────────

class _QuickStatsGrid extends StatelessWidget {
  final dynamic stats;
  const _QuickStatsGrid({required this.stats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = [
      _StatItem(label: 'Pending Leaves', value: '${stats.pendingLeaves}', icon: Icons.beach_access_rounded, color: const Color(0xFFFF9800)),
      _StatItem(label: 'Pending Tasks', value: '${stats.pendingTasks}', icon: Icons.task_alt_rounded, color: const Color(0xFF2196F3)),
      _StatItem(label: 'Notifications', value: '${stats.unreadNotifications}', icon: Icons.notifications_rounded, color: const Color(0xFFE91E63)),
      _StatItem(label: 'Approvals', value: '${stats.pendingApprovals}', icon: Icons.how_to_reg_rounded, color: const Color(0xFF9C27B0)),
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.35,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: items.length,
        itemBuilder: (_, index) {
          final item = items[index];
          return RepaintBoundary(
            child: AppCard(
              margin: EdgeInsets.zero,
              padding: const EdgeInsets.all(14),
              onTap: () {},
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          color: item.color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(11),
                        ),
                        child: Icon(item.icon, color: item.color, size: 20),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Text(
                    item.value,
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      color: item.color,
                      height: 1,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    item.label,
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                      letterSpacing: 0.1,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _StatItem {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _StatItem({required this.label, required this.value, required this.icon, required this.color});
}

// ── Today Attendance Card ────────────────────────────────────────────────────

class _TodayAttendanceCard extends StatelessWidget {
  final dynamic stats;
  const _TodayAttendanceCard({required this.stats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasCheckIn = stats.todayCheckIn != null;
    final hasCheckOut = stats.todayCheckOut != null;
    final isPresent = stats.todayStatus == 'present';

    final statusColor = isPresent ? const Color(0xFF1a8a3e) : const Color(0xFFFF9800);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: AppCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    statusColor.withValues(alpha: 0.15),
                    statusColor.withValues(alpha: 0.07),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(Icons.access_time_filled_rounded, color: statusColor, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    "Today's Attendance",
                    style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 4),
                  if (hasCheckIn || hasCheckOut)
                    Text(
                      '${hasCheckIn ? 'In: ${stats.todayCheckIn}' : ''}${hasCheckIn && hasCheckOut ? '  ·  ' : ''}${hasCheckOut ? 'Out: ${stats.todayCheckOut}' : ''}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.65),
                        fontWeight: FontWeight.w500,
                      ),
                    )
                  else
                    Text(
                      'No attendance recorded today',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.45),
                      ),
                    ),
                ],
              ),
            ),
            StatusBadge(
              label: isPresent ? 'Present' : 'Not yet',
              variant: isPresent ? StatusBadgeVariant.success : StatusBadgeVariant.warning,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Quick Actions ────────────────────────────────────────────────────────────

class _QuickActions extends StatelessWidget {
  final _actions = const [
    _ActionItem(label: 'Check In/Out', icon: Icons.fingerprint_rounded, color: Color(0xFF1a8a3e), route: '/attendance'),
    _ActionItem(label: 'Apply Leave', icon: Icons.beach_access_rounded, color: Color(0xFFFF9800), route: '/leaves/apply'),
    _ActionItem(label: 'New Task', icon: Icons.add_task_rounded, color: Color(0xFF2196F3), route: '/tasks/create'),
    _ActionItem(label: 'Attendance', icon: Icons.calendar_month_rounded, color: Color(0xFF9C27B0), route: '/attendance'),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 12),
          RepaintBoundary(
            child: Row(
              children: _actions.map((action) {
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: _ActionButton(action: action),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionItem {
  final String label;
  final IconData icon;
  final Color color;
  final String route;
  const _ActionItem({required this.label, required this.icon, required this.color, required this.route});
}

class _ActionButton extends StatelessWidget {
  final _ActionItem action;
  const _ActionButton({required this.action});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return TapScale(
      onTap: () => context.push(action.route),
      child: Container(
        height: 84,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              action.color.withValues(alpha: isDark ? 0.18 : 0.1),
              action.color.withValues(alpha: isDark ? 0.08 : 0.05),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: action.color.withValues(alpha: isDark ? 0.15 : 0.12),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: action.color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(action.icon, color: action.color, size: 22),
            ),
            const SizedBox(height: 7),
            Text(
              action.label,
              style: TextStyle(
                fontFamily: 'PlusJakartaSans',
                fontSize: 10.5,
                fontWeight: FontWeight.w600,
                color: action.color.withValues(alpha: isDark ? 0.9 : 0.85),
              ),
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}

// ── Announcements Section ────────────────────────────────────────────────────

class _AnnouncementsSection extends StatelessWidget {
  final List<AnnouncementModel> announcements;
  const _AnnouncementsSection({required this.announcements});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Announcements', onViewAll: () => context.push('/announcements')),
          const SizedBox(height: 10),
          ...announcements.take(3).map((a) => _AnnouncementCard(announcement: a)),
        ],
      ),
    );
  }
}

class _AnnouncementCard extends StatelessWidget {
  final AnnouncementModel announcement;
  const _AnnouncementCard({required this.announcement});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final priorityColor = announcement.priority == 'high'
        ? Colors.red
        : announcement.priority == 'medium'
            ? Colors.orange
            : Colors.grey;

    final badgeVariant = announcement.priority == 'high'
        ? StatusBadgeVariant.destructive
        : announcement.priority == 'medium'
            ? StatusBadgeVariant.warning
            : StatusBadgeVariant.secondary;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/announcements/${announcement.id}'),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 44,
            decoration: BoxDecoration(
              color: priorityColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  announcement.title,
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (announcement.authorName != null) ...[
                  const SizedBox(height: 2),
                  Text(
                    'By ${announcement.authorName}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                    ),
                  ),
                ],
              ],
            ),
          ),
          StatusBadge(
            label: announcement.priority,
            variant: badgeVariant,
          ),
        ],
      ),
    );
  }
}

// ── Events Section ───────────────────────────────────────────────────────────

class _EventsSection extends StatelessWidget {
  final List<EventModel> events;
  const _EventsSection({required this.events});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(title: 'Upcoming Events', onViewAll: () => context.push('/events')),
          const SizedBox(height: 10),
          ...events.take(3).map((e) => _EventCard(event: e)),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final EventModel event;
  const _EventCard({required this.event});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final date = DateTime.tryParse(event.eventDate);
    final day = date != null ? DateFormat('dd').format(date) : '';
    final month = date != null ? DateFormat('MMM').format(date) : '';

    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(14),
      onTap: () => context.push('/events/${event.id}'),
      child: Row(
        children: [
          Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  theme.colorScheme.primary.withValues(alpha: 0.15),
                  theme.colorScheme.primary.withValues(alpha: 0.07),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  day,
                  style: TextStyle(
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: theme.colorScheme.primary,
                    height: 1,
                  ),
                ),
                Text(
                  month,
                  style: TextStyle(
                    fontFamily: 'PlusJakartaSans',
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  event.title,
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                if (event.location != null) ...[
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined,
                          size: 12,
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.45)),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(
                          event.location!,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          if (event.startTime != null)
            StatusBadge(
              label: event.startTime!,
              variant: StatusBadgeVariant.success,
            ),
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
      highlightColor: isDark ? const Color(0xFF3a3e43) : Colors.grey.shade100,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 1.35,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: 4,
              itemBuilder: (_, __) => Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              height: 80,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
            const SizedBox(height: 12),
            Container(
              height: 84,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
