import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/core/extensions.dart';
import 'package:thaibahive_mobile/core/providers/tab_scroll_to_top.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';
import 'package:thaibahive_mobile/features/attendance/presentation/attendance_punch_card.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/features/circulars/data/circulars_provider.dart';
import 'package:thaibahive_mobile/features/notifications/data/notifications_provider.dart';
import 'package:thaibahive_mobile/features/timeline/data/timeline_provider.dart';
import 'package:thaibahive_mobile/features/today/data/today_hub_provider.dart';
import 'package:thaibahive_mobile/shared/widgets/quick_action_card.dart';

import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/problem_reporter_modal.dart';
import '../../../shared/widgets/quick_action_bottom_sheet.dart';

/// Today Screen — Server-Driven UI (SDUI) entry point.
///
/// Section order comes from `GET /api/mobile/today-hub` (manifest); on fetch
/// failure/403 the hardcoded fallback manifest renders with an inline retry.
/// Priority order (server): urgent actions, attendance, quick actions,
/// timeline, latest circular.
class TodayScreen extends ConsumerStatefulWidget {
  const TodayScreen({super.key});

  @override
  ConsumerState<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends ConsumerState<TodayScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _loaded = false;

  @override
  void initState() {
    super.initState();
    // Section data loads independently of the manifest (P4/P5).
    Future.microtask(() {
      if (!mounted || _loaded) return;
      _loaded = true;
      ref.read(timelineProvider.notifier).loadTimeline();
      ref.read(circularsProvider.notifier).loadCirculars();
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    ref.invalidate(todayHubProvider);
    ref.invalidate(unreadCountProvider);
    final timeline = ref.read(timelineProvider.notifier);
    final circulars = ref.read(circularsProvider.notifier);
    await Future.wait([
      ref.refresh(todayHubProvider.future),
      timeline.loadTimeline(),
      circulars.loadCirculars(),
    ]).catchError((_) => <void>[]);
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    // Rule 9: re-tapping the Today tab scrolls the dashboard back to the top.
    ref.listen(tabScrollToTopProvider, (previous, next) {
      if (next?.branch == 0) _scrollController.animateToTop();
    });

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                // App bar with greeting
                SliverAppBar(
                  floating: true,
                  snap: true,
                  pinned: false,
                  elevation: 0,
                  toolbarHeight: 68,
                  backgroundColor: Colors.transparent,
                  flexibleSpace: FlexibleSpaceBar(
                    titlePadding: const EdgeInsets.fromLTRB(16, 0, 72, 10),
                    title: TripleTapDetector(
                      child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _getGreeting().toUpperCase(),
                          style:
                              Theme.of(context).textTheme.labelLarge?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                        ),
                        Text(
                          (user != null && user.firstName.isNotEmpty) ? user.firstName : 'Staff',
                          style: Theme.of(context)
                              .textTheme
                              .headlineSmall
                              ?.copyWith(
                                fontWeight: FontWeight.w700,
                              ),
                        ),
                      ],
                    ),
                  ),
                  ),
                  actions: [
                    IconButton(
                      icon: const Icon(Icons.notifications_outlined),
                      onPressed: () => context.push('/notifications'),
                      tooltip: 'Notifications',
                    ),
                    const SizedBox(width: 8),
                  ],
                ),
                SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: const [
                      TodayHubContent(),
                      // Bottom padding for the shell overlay tray/FAB.
                      SizedBox(height: 100),
                    ],
                  ),
                ),
              ],
            ),
          ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
}

/// Manifest-driven body of the Today screen. Extracted as a plain widget so
/// widget tests can pump sections without constructing the auth provider.
class TodayHubContent extends ConsumerWidget {
  const TodayHubContent({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final manifestAsync = ref.watch(todayHubProvider);

    if (manifestAsync.isLoading && !manifestAsync.hasValue) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: ListShimmer(itemCount: 5),
      );
    }

    final hasManifest = manifestAsync.hasValue;
    // valueOrNull: AsyncError.value rethrows when no previous data exists.
    final manifest = manifestAsync.valueOrNull ?? kFallbackTodayHubManifest;
    final showManifestError = !hasManifest && manifestAsync.hasError;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showManifestError)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: AppErrorWidget(
              title: "Couldn't load Today hub",
              message:
                  'Showing the default layout. Check your connection and retry.',
              onRetry: () => ref.invalidate(todayHubProvider),
            ),
          ),
        ...manifest.orderedEnabledSections.map(
          (section) => _buildSection(context, ref, section, manifest),
        ),
      ],
    );
  }

  Widget _buildSection(
    BuildContext context,
    WidgetRef ref,
    TodayHubSection section,
    TodayHubManifest manifest,
  ) {
    return switch (section.id) {
      'urgent_actions' => _buildUrgentActionsSection(context, ref, section),
      'attendance' => const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: AttendancePunchCard(),
        ),
      'quick_actions' => _buildQuickActionsSection(context, section, manifest),
      'timeline' => _buildTimelineSection(context, ref, section),
      'circular' => _buildCircularSection(context, ref, section),
      // Unknown ids are ignored (forward compatibility).
      _ => const SizedBox.shrink(),
    };
  }

  // -------------------------------------------------------------------------
  // P1: Urgent actions
  // -------------------------------------------------------------------------

  Widget _buildUrgentActionsSection(
    BuildContext context,
    WidgetRef ref,
    TodayHubSection section,
  ) {
    final actions = ref.watch(actionCenterProvider);
    final urgent = actions
        .where((a) => a.priority == ActionPriority.urgent)
        .take(section.maxItems ?? 5)
        .toList();
    if (urgent.isEmpty) return const SizedBox.shrink();

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      key: const ValueKey('today-section-urgent_actions'),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
          width: 1,
        ),
        boxShadow: AppShadows.card(Colors.black),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.35),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.priority_high_rounded,
                      size: 14,
                      color: Color(0xFFF59E0B),
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'URGENT',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                        color: const Color(0xFFF59E0B),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.push('/approvals'),
                child: Text(
                  'View all (${urgent.length})',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.primary,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            'Urgent Approvals Required',
            style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: theme.colorScheme.onSurface,
                ),
          ),
          const SizedBox(height: 12),
          ...urgent.take(2).map((action) => _ActionListTile(action: action)),
          if (urgent.length > 2)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Center(
                child: TextButton(
                  onPressed: () => context.push('/approvals'),
                  child: Text(
                    '+${urgent.length - 2} more',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // P3: Quick actions (manifest resolver; hardcoded fallback manifest)
  // -------------------------------------------------------------------------

  (String, String?) _cleanActionTitleAndSubtitle(String rawLabel, String id) {
    final lower = '$rawLabel $id'.toLowerCase();
    if (lower.contains('canteen') || lower.contains('meal')) {
      return ('Canteen', 'Order meals');
    }
    if (lower.contains('helpdesk') || lower.contains('ticket') || lower.contains('support')) {
      return ('Helpdesk', 'Raise ticket');
    }
    if (lower.contains('facility') || lower.contains('booking') || lower.contains('campus')) {
      return ('Facilities', 'Book spaces');
    }
    if (lower.contains('visitor') || lower.contains('gate')) {
      return ('Gate Pass', 'Visitor pass');
    }
    if (lower.contains('leave')) {
      return ('Leave', 'Apply leave');
    }
    if (lower.contains('attendance') || lower.contains('punch')) {
      return ('Attendance', 'Punch clock');
    }
    final parts = rawLabel.trim().split(RegExp(r'\s+'));
    if (parts.length > 2) {
      return (parts.take(2).join(' '), parts.skip(2).join(' '));
    }
    return (rawLabel, null);
  }

  Widget _buildQuickActionsSection(
    BuildContext context,
    TodayHubSection section,
    TodayHubManifest manifest,
  ) {
    final actions = manifest.quickActions.take(section.maxItems ?? 4).toList();
    if (actions.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF282F39) : const Color(0xFFEEF2F6),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(
                  Icons.grid_view_rounded,
                  size: 16,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Quick Actions',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w700,
                      fontSize: 15,
                      letterSpacing: -0.2,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 10,
              crossAxisSpacing: 10,
              childAspectRatio: 0.80,
            ),
            itemCount: actions.length,
            itemBuilder: (context, index) {
              final action = actions[index];
              final (title, subtitle) = _cleanActionTitleAndSubtitle(action.label, action.id);
              return QuickActionCard(
                key: ValueKey('quick-action-${action.id}'),
                icon: quickActionIcon(action.icon),
                label: title,
                subtitle: subtitle,
                color: quickActionColor(action.id),
                onTap: () {
                  QuickActionBottomSheet.show(
                    context: context,
                    title: title,
                    subtitle: subtitle,
                    icon: quickActionIcon(action.icon),
                    color: quickActionColor(action.id),
                    targetRoute: action.route,
                    subActions: _getSubActionsForQuickAction(action.id),
                  );
                },
              );
            },
          ),
        ],
      ),
    );
  }

  List<({String label, IconData icon, String route})>? _getSubActionsForQuickAction(String id) {
    final lower = id.toLowerCase();
    if (lower.contains('canteen') || lower.contains('meal')) {
      return [
        (label: "Today's Specials", icon: Icons.restaurant_menu_rounded, route: '/canteen'),
        (label: 'Order History', icon: Icons.receipt_long_rounded, route: '/canteen'),
      ];
    }
    if (lower.contains('help') || lower.contains('ticket')) {
      return [
        (label: 'Raise New Ticket', icon: Icons.add_circle_outline_rounded, route: '/help-desk'),
        (label: 'My Open Tickets', icon: Icons.support_agent_rounded, route: '/help-desk'),
      ];
    }
    if (lower.contains('facility') || lower.contains('book')) {
      return [
        (label: 'Book Space / Room', icon: Icons.meeting_room_rounded, route: '/bookings/create'),
        (label: 'My Reservations', icon: Icons.event_available_rounded, route: '/bookings'),
      ];
    }
    if (lower.contains('gate') || lower.contains('visitor')) {
      return [
        (label: 'Gate Pass Verification', icon: Icons.qr_code_scanner_rounded, route: '/visitors/gate-verify'),
        (label: 'Recent Visitor Passes', icon: Icons.badge_outlined, route: '/visitors'),
      ];
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // P4: Today's timeline (activity-logs; D10 repoint)
  // -------------------------------------------------------------------------

  String _formatTimelineTitle(String rawTitle, String type) {
    final trimmed = rawTitle.trim();
    final lower = trimmed.toLowerCase();
    if (lower == 'logout') return 'Logged out from session';
    if (lower == 'login') return 'Signed in to portal';
    if (lower == 'punch_in' || lower == 'punchin') return 'Clocked In (Attendance)';
    if (lower == 'punch_out' || lower == 'punchout') return 'Clocked Out (Attendance)';
    if (trimmed.length > 1 && trimmed == trimmed.toUpperCase() && trimmed.contains('_')) {
      return trimmed
          .split('_')
          .map((w) => w.isNotEmpty ? '${w[0]}${w.substring(1).toLowerCase()}' : '')
          .join(' ');
    }
    return trimmed;
  }

  Widget _buildTimelineSection(
    BuildContext context,
    WidgetRef ref,
    TodayHubSection section,
  ) {
    final state = ref.watch(timelineProvider);
    if (state.isLoading && state.items.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: CardShimmer(),
      );
    }
    if (state.items.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final items = state.items.take(section.maxItems ?? 5).toList();

    return Padding(
      key: const ValueKey('today-section-timeline'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF282F39) : const Color(0xFFEEF2F6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.history_rounded,
                      size: 16,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    "Recent Activity",
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          letterSpacing: -0.2,
                        ),
                  ),
                ],
              ),
              InkWell(
                borderRadius: BorderRadius.circular(6),
                onTap: () => context.push('/timeline'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'View All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      const SizedBox(width: 2),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 16,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E242C) : Colors.white,
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: isDark ? const Color(0xFF2E3744) : const Color(0xFFE2E8F0),
                width: 1,
              ),
              boxShadow: AppShadows.card(Colors.black),
            ),
            child: ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(vertical: 4),
              itemCount: items.length,
              separatorBuilder: (context, index) => Divider(
                height: 1,
                thickness: 0.8,
                indent: 56,
                endIndent: 16,
                color: isDark ? const Color(0xFF27313F) : const Color(0xFFF1F5F9),
              ),
              itemBuilder: (context, index) {
                final item = items[index];
                final (icon, color) = _timelineIcon(item.type);
                final title = _formatTimelineTitle(item.title, item.type);

                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                  child: Row(
                    children: [
                      Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(icon, size: 17, color: color),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                              ),
                            ),
                            if (item.description != null && item.description!.isNotEmpty) ...[
                              const SizedBox(height: 1),
                              Text(
                                item.description!,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 11,
                                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        item.timestamp.timeAgo(),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  (IconData, Color) _timelineIcon(String type) {
    final t = type.toLowerCase();
    if (t.contains('leave')) {
      return (Icons.event_busy_rounded, const Color(0xFFEF4444));
    }
    if (t.contains('attendance') || t.contains('punch') || t.contains('check_in') || t.contains('checkin')) {
      return (Icons.fingerprint_rounded, const Color(0xFF10B981));
    }
    if (t.contains('task')) {
      return (Icons.task_alt_rounded, const Color(0xFFF59E0B));
    }
    if (t.contains('canteen') || t.contains('meal')) {
      return (Icons.restaurant_rounded, const Color(0xFFF97316));
    }
    if (t.contains('login')) {
      return (Icons.login_rounded, const Color(0xFF3B82F6));
    }
    if (t.contains('logout')) {
      return (Icons.logout_rounded, const Color(0xFF64748B));
    }
    if (t.contains('circular') || t.contains('notice')) {
      return (Icons.campaign_rounded, const Color(0xFF8B5CF6));
    }
    return (Icons.bolt_rounded, const Color(0xFF6366F1));
  }

  // -------------------------------------------------------------------------
  // P5: Latest circular (D14* envelope fix)
  // -------------------------------------------------------------------------

  Widget _buildCircularSection(
    BuildContext context,
    WidgetRef ref,
    TodayHubSection section,
  ) {
    final state = ref.watch(circularsProvider);
    if (state.isLoading && state.circulars.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16),
        child: CardShimmer(),
      );
    }
    if (state.circulars.isEmpty) return const SizedBox.shrink();

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final latest = state.circulars.first;
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    return Padding(
      key: const ValueKey('today-section-circular'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF282F39) : const Color(0xFFEEF2F6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.campaign_rounded,
                      size: 16,
                      color: isDark ? const Color(0xFFA78BFA) : const Color(0xFF7C3AED),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Latest Circular',
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                          fontSize: 15,
                          letterSpacing: -0.2,
                        ),
                  ),
                  if (unread > 0) ...[
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '$unread',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              InkWell(
                borderRadius: BorderRadius.circular(6),
                onTap: () => context.push('/circulars'),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'View All',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                      ),
                      const SizedBox(width: 2),
                      Icon(
                        Icons.chevron_right_rounded,
                        size: 16,
                        color: Theme.of(context).colorScheme.primary,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: () => context.push('/circulars'),
              borderRadius: BorderRadius.circular(18),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E242C) : Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(
                    color: isDark ? const Color(0xFF2E3744) : const Color(0xFFE2E8F0),
                    width: 1,
                  ),
                  boxShadow: AppShadows.card(Colors.black),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: const Color(0xFF8B5CF6).withValues(alpha: 0.25),
                              width: 0.8,
                            ),
                          ),
                          child: Text(
                            (latest.category ?? 'CIRCULAR').toUpperCase(),
                            style: const TextStyle(
                              color: Color(0xFF8B5CF6),
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              letterSpacing: 0.4,
                            ),
                          ),
                        ),
                        const Spacer(),
                        Text(
                          latest.createdAt.timeAgo(),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      latest.title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                        letterSpacing: -0.1,
                      ),
                    ),
                    if (latest.description != null && latest.description!.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Text(
                        latest.description!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 12,
                          height: 1.4,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionListTile extends ConsumerWidget {
  final ActionItem action;

  const _ActionListTile({required this.action});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListTile(
      dense: true,
      contentPadding: EdgeInsets.zero,
      leading: CircleAvatar(
        radius: 16,
        backgroundColor: Theme.of(context).colorScheme.primaryContainer,
        child: Icon(
          Icons.assignment_rounded,
          size: 16,
          color: Theme.of(context).colorScheme.onPrimaryContainer,
        ),
      ),
      title: Text(
        action.title,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
      ),
      subtitle: Text(
        action.description,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: const Icon(Icons.chevron_right_rounded, size: 20),
      onTap: () {
        context.push(action.route);
        ref.read(actionCenterProvider.notifier).completeAction(action.id);
      },
    );
  }
}
