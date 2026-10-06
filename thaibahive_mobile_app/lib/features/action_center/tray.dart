import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';

/// Action Center Tray - a contextual action tray that appears on the Today screen
/// and in the notification tray. Not a permanent bottom tab.
class ActionCenterTray extends ConsumerStatefulWidget {
  final bool initiallyExpanded;
  final VoidCallback? onClose;

  const ActionCenterTray({
    super.key,
    this.initiallyExpanded = false,
    this.onClose,
  });

  @override
  ConsumerState<ActionCenterTray> createState() => _ActionCenterTrayState();
}

class _ActionCenterTrayState extends ConsumerState<ActionCenterTray>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _heightAnimation;
  late final Animation<double> _opacityAnimation;
  bool _isExpanded = false;

  @override
  void initState() {
    super.initState();
    _isExpanded = widget.initiallyExpanded;
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _heightAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOutCubic,
    );
    _opacityAnimation = CurvedAnimation(
      parent: _controller,
      curve: const Interval(0.2, 1.0, curve: Curves.easeOut),
    );
    if (_isExpanded) {
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _toggleExpanded() {
    setState(() {
      _isExpanded = !_isExpanded;
      if (_isExpanded) {
        _controller.forward();
      } else {
        _controller.reverse().then((_) {
          widget.onClose?.call();
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final actions = ref.watch(actionCenterProvider);
    final sortedActions = ref.watch(actionCenterProvider.notifier).sortedActions;
    final urgentCount = ref.watch(urgentActionCountProvider);
    final totalCount = ref.watch(pendingActionCountProvider);

    if (totalCount == 0) {
      return const SizedBox.shrink();
    }

    // Build children list imperatively to avoid collection-if parsing issues
    final List<Widget> trayChildren = <Widget>[];

    // Handle bar
    trayChildren.add(
      Container(
        width: 40,
        height: 4,
        margin: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.onSurfaceVariant.withValues(alpha: 0.4),
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    );

    // Header
    final List<Widget> headerChildren = <Widget>[
      Icon(
        Icons.pending_actions_rounded,
        color: Theme.of(context).colorScheme.primary,
        size: 24,
      ),
      const SizedBox(width: 12),
      Text(
        'Action Center',
        style: Theme.of(context).textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w600,
            ),
      ),
      const Spacer(),
    ];

    if (urgentCount > 0) {
      headerChildren.add(
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.errorContainer,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            '$urgentCount urgent',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                  fontWeight: FontWeight.w600,
                ),
          ),
        ),
      );
    }

    headerChildren.addAll([
      const SizedBox(width: 8),
      Text(
        '$totalCount pending',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
      ),
      IconButton(
        icon: Icon(
          _isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
        ),
        onPressed: _toggleExpanded,
        tooltip: _isExpanded ? 'Collapse' : 'Expand',
      ),
    ]);

    trayChildren.add(
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(children: headerChildren),
      ),
    );

    // Divider
    trayChildren.add(const Divider(height: 1));

    // Action list
    trayChildren.add(
      ConstrainedBox(
        constraints: const BoxConstraints(maxHeight: 300),
        child: ListView.separated(
          shrinkWrap: true,
          padding: const EdgeInsets.symmetric(vertical: 8),
          itemCount: sortedActions.length,
          separatorBuilder: (_, __) => const Divider(height: 1, indent: 56, endIndent: 16),
          itemBuilder: (context, index) {
            final action = sortedActions[index];
            return _ActionTile(action: action, onTap: () {
              context.push(action.route);
              ref.read(actionCenterProvider.notifier).completeAction(action.id);
            });
          },
        ),
      ),
    );

    // Clear all button
    if (sortedActions.length > 1) {
      trayChildren.add(
        Padding(
          padding: const EdgeInsets.all(16),
          child: TextButton.icon(
            onPressed: () => ref.read(actionCenterProvider.notifier).clearAll(),
            icon: const Icon(Icons.clear_all_rounded, size: 18),
            label: const Text('Clear all'),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ),
      );
    }

    return SizeTransition(
      sizeFactor: _heightAnimation,
      axisAlignment: -1.0,
      child: FadeTransition(
        opacity: _opacityAnimation,
        child: Material(
          elevation: 8,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          color: Theme.of(context).colorScheme.surface,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: trayChildren,
          ),
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final ActionItem action;
  final VoidCallback onTap;

  const _ActionTile({required this.action, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final priorityColor = switch (action.priority) {
      ActionPriority.urgent => Theme.of(context).colorScheme.error,
      ActionPriority.high => Theme.of(context).colorScheme.tertiary,
      ActionPriority.normal => Theme.of(context).colorScheme.primary,
      ActionPriority.low => Theme.of(context).colorScheme.onSurfaceVariant,
    };

    return ListTile(
      leading: CircleAvatar(
        radius: 18,
        backgroundColor: priorityColor.withValues(alpha: 0.15),
        child: Icon(
          _getPriorityIcon(action.priority),
          size: 18,
          color: priorityColor,
        ),
      ),
      title: Text(
        action.title,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
            ),
      ),
      subtitle: Text(
        action.description,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
      ),
      trailing: const Icon(Icons.chevron_right_rounded),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }

  IconData _getPriorityIcon(ActionPriority priority) {
    return switch (priority) {
      ActionPriority.urgent => Icons.warning_amber_rounded,
      ActionPriority.high => Icons.priority_high_rounded,
      ActionPriority.normal => Icons.assignment_rounded,
      ActionPriority.low => Icons.info_outline_rounded,
    };
  }
}

/// Floating action button to show/hide the Action Center Tray
class ActionCenterFab extends ConsumerWidget {
  const ActionCenterFab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final urgentCount = ref.watch(urgentActionCountProvider);
    final totalCount = ref.watch(pendingActionCountProvider);

    if (totalCount == 0) return const SizedBox.shrink();

    return FloatingActionButton.extended(
      heroTag: 'action_center_fab',
      icon: Badge(
        label: Text('$totalCount'),
        isLabelVisible: totalCount > 0,
        backgroundColor: urgentCount > 0
            ? Theme.of(context).colorScheme.error
            : Theme.of(context).colorScheme.primary,
        child: Icon(
          urgentCount > 0 ? Icons.warning_amber_rounded : Icons.pending_actions_rounded,
          size: 20,
        ),
      ),
      label: Text(urgentCount > 0 ? '$urgentCount urgent' : 'Actions'),
      onPressed: () {
        _showActionCenterSheet(context);
      },
    );
  }

  void _showActionCenterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => ActionCenterTray(
          initiallyExpanded: true,
          onClose: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }
}