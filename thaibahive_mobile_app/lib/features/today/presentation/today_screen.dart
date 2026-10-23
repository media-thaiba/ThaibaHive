import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/core/extensions.dart';
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

    return Scaffold(
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
                  backgroundColor: Colors.transparent,
                  flexibleSpace: FlexibleSpaceBar(
                    titlePadding: const EdgeInsets.only(left: 16, bottom: 16),
                    title: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _getGreeting(),
                          style:
                              Theme.of(context).textTheme.labelLarge?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onSurfaceVariant,
                                  ),
                        ),
                        Text(
                          user?.firstName ?? 'Staff',
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
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.20 : 0.06),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
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
                        fontSize: 10,
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
                    fontWeight: FontWeight.w600,
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
                      fontWeight: FontWeight.w600,
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

  Widget _buildQuickActionsSection(
    BuildContext context,
    TodayHubSection section,
    TodayHubManifest manifest,
  ) {
    final actions = manifest.quickActions.take(section.maxItems ?? 4).toList();
    if (actions.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Quick Actions',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 0.9,
            ),
            itemCount: actions.length,
            itemBuilder: (context, index) {
              final action = actions[index];
              return QuickActionCard(
                key: ValueKey('quick-action-${action.id}'),
                icon: quickActionIcon(action.icon),
                label: action.label,
                color: quickActionColor(action.id),
                onTap: () => context.push(action.route),
              );
            },
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------------------
  // P4: Today's timeline (activity-logs; D10 repoint)
  // -------------------------------------------------------------------------

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

    final items = state.items.take(section.maxItems ?? 5).toList();
    return Padding(
      key: const ValueKey('today-section-timeline'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            "Today's Timeline",
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: 8),
          ...items.map((item) {
            final (icon, color) = _timelineIcon(item.type);
            return Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: color.withValues(alpha: 0.12),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, size: 16, color: color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      item.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    item.timestamp.timeAgo(),
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  (IconData, Color) _timelineIcon(String type) {
    if (type.startsWith('leave')) {
      return (Icons.event_busy_rounded, const Color(0xFFE53935));
    }
    if (type.startsWith('attendance') || type.startsWith('punch')) {
      return (Icons.fingerprint_rounded, const Color(0xFF00897B));
    }
    if (type.startsWith('task')) {
      return (Icons.task_alt_rounded, const Color(0xFFF57C00));
    }
    if (type.startsWith('canteen')) {
      return (Icons.restaurant_rounded, const Color(0xFFFB8C00));
    }
    if (type.startsWith('auth') || type.startsWith('login')) {
      return (Icons.login_rounded, const Color(0xFF1E88E5));
    }
    return (Icons.history_rounded, const Color(0xFF616161));
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

    final latest = state.circulars.first;
    final unread = ref.watch(unreadCountProvider).valueOrNull ?? 0;

    return Padding(
      key: const ValueKey('today-section-circular'),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'Latest Circular',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              if (unread > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.error,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '$unread',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ),
              ],
              const Spacer(),
              TextButton(
                onPressed: () => context.push('/circulars'),
                child: const Text('View all'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        (latest.category ?? 'CIRCULAR').toUpperCase(),
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: Theme.of(context)
                                  .colorScheme
                                  .onPrimaryContainer,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      latest.createdAt.timeAgo(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  latest.title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                if (latest.description != null) ...[
                  const SizedBox(height: 4),
                  Text(
                    latest.description!,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Theme.of(context).colorScheme.onSurfaceVariant,
                        ),
                  ),
                ],
              ],
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
