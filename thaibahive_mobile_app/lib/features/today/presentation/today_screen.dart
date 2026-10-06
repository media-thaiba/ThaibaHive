import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';
import 'package:thaibahive_mobile/features/action_center/tray.dart';
import 'package:thaibahive_mobile/features/attendance/presentation/attendance_punch_card.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/shared/widgets/quick_action_card.dart';

/// Today Screen - Server-Driven UI (SDUI) entry point
/// Priority order:
/// 1. Urgent Action Center items
/// 2. Attendance card (large before punch, compact after)
/// 3. Quick Action shortcuts (max 4 context-relevant)
/// 4. Today's active duty/schedule
/// 5. Latest circular/announcement
class TodayScreen extends ConsumerStatefulWidget {
  const TodayScreen({super.key});

  @override
  ConsumerState<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends ConsumerState<TodayScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final actions = ref.watch(actionCenterProvider);
    final urgentActions = actions.where((a) => a.priority == ActionPriority.urgent).toList();
    final totalActions = actions.length;

    return Scaffold(
      floatingActionButton: totalActions > 0 ? const ActionCenterFab() : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.endFloat,
      body: Stack(
        children: [
          CustomScrollView(
            controller: _scrollController,
            physics: const ClampingScrollPhysics(),
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
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                      Text(
                        user?.firstName ?? 'Staff',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
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
                  IconButton(
                    icon: const Icon(Icons.search_rounded),
                    onPressed: () => context.push('/search'),
                    tooltip: 'Search',
                  ),
                  const SizedBox(width: 8),
                ],
              ),

              // Priority 1: Urgent Action Center items
              if (urgentActions.isNotEmpty)
                SliverToBoxAdapter(
                  child: _buildActionCenterSection(urgentActions, isUrgent: true),
                ),

              // Priority 2: Attendance Card (SDUI - adaptive size)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: AttendancePunchCard(
                    onPunchComplete: () {
                      // Refresh after punch
                      setState(() {});
                    },
                  ),
                ),
              ),

              // Priority 3: Quick Actions (max 4)
              SliverToBoxAdapter(
                child: _buildQuickActionsSection(),
              ),

              // Priority 4: Today's Schedule/Duty
              SliverToBoxAdapter(
                child: _buildScheduleSection(),
              ),

              // Priority 5: Latest Circular/Announcement
              SliverToBoxAdapter(
                child: _buildLatestCircularSection(),
              ),

              // Bottom padding for FAB
              const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
            ],
          ),

          // Action Center Tray (overlay on Today screen)
          if (totalActions > 0)
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: ActionCenterTray(
                initiallyExpanded: urgentActions.isNotEmpty,
              ),
            ),
        ],
      ),
    );
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  Widget _buildActionCenterSection(List<ActionItem> actions, {required bool isUrgent}) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isUrgent
            ? Theme.of(context).colorScheme.errorContainer
            : Theme.of(context).colorScheme.primaryContainer,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isUrgent
              ? Theme.of(context).colorScheme.error.withValues(alpha: 0.3)
              : Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isUrgent ? Icons.warning_amber_rounded : Icons.pending_actions_rounded,
                color: isUrgent
                    ? Theme.of(context).colorScheme.error
                    : Theme.of(context).colorScheme.primary,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                isUrgent ? 'Urgent Approvals Required' : 'Pending Actions',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: isUrgent
                          ? Theme.of(context).colorScheme.error
                          : Theme.of(context).colorScheme.primary,
                    ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.push('/approvals'),
                child: Text('View all (${actions.length})'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...actions.take(2).map((action) => _ActionListTile(action: action)),
          if (actions.length > 2)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Center(
                child: TextButton(
                  onPressed: () => context.push('/approvals'),
                  child: Text('+${actions.length - 2} more'),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsSection() {
    // In Phase 2, this will be driven by SDUI from /api/mobile/today-hub
    // For now, show static quick actions based on common capabilities
    final quickActions = [
      _QuickActionData(
        icon: Icons.restaurant_rounded,
        label: 'Canteen',
        route: '/canteen',
        capability: 'canteen.order.create',
        color: Colors.orange,
      ),
      _QuickActionData(
        icon: Icons.local_hospital_rounded,
        label: 'Helpdesk',
        route: '/help-desk',
        capability: 'helpdesk.ticket.create',
        color: Colors.blue,
      ),
      _QuickActionData(
        icon: Icons.meeting_room_rounded,
        label: 'Book Room',
        route: '/bookings/create',
        capability: 'booking.resource.create',
        color: Colors.purple,
      ),
      _QuickActionData(
        icon: Icons.person_add_rounded,
        label: 'Visitor Pass',
        route: '/visitors',
        capability: 'visitor.pass.create',
        color: Colors.green,
      ),
    ];

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
            itemCount: quickActions.length,
            itemBuilder: (context, index) {
              final action = quickActions[index];
              return QuickActionCard(
                icon: action.icon,
                label: action.label,
                color: action.color,
                onTap: () => context.push(action.route),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                "Today's Schedule",
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const Spacer(),
              TextButton(
                onPressed: () => context.push('/timetable'),
                child: const Text('View all'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Placeholder - will be replaced with actual schedule data
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.calendar_today_rounded,
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'No classes scheduled today',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                            ),
                      ),
                      Text(
                        'Enjoy your day!',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.7),
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLatestCircularSection() {
    return Padding(
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
              const Spacer(),
              TextButton(
                onPressed: () => context.push('/circulars'),
                child: const Text('View all'),
              ),
            ],
          ),
          const SizedBox(height: 12),
          // Placeholder - will be replaced with actual circular data
          Container(
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
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        'ANNOUNCEMENT',
                        style: Theme.of(context).textTheme.labelSmall?.copyWith(
                              color: Theme.of(context).colorScheme.onPrimaryContainer,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '2 hours ago',
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Mid-term Examination Schedule Released',
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  'The mid-term examination schedule for Term 2 has been published. Please check the examination portal for your specific dates and venues.',
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                ),
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

class _QuickActionData {
  final IconData icon;
  final String label;
  final String route;
  final String capability;
  final Color color;

  const _QuickActionData({
    required this.icon,
    required this.label,
    required this.route,
    required this.capability,
    required this.color,
  });
}