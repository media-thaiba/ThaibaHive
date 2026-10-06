import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Represents a pending action in the Action Center
class ActionItem {
  final String id;
  final String title;
  final String description;
  final String capability; // Required capability to perform this action
  final String route; // Route to navigate when tapped
  final DateTime createdAt;
  final ActionPriority priority;

  const ActionItem({
    required this.id,
    required this.title,
    required this.description,
    required this.capability,
    required this.route,
    required this.createdAt,
    this.priority = ActionPriority.normal,
  });
}

enum ActionPriority { low, normal, high, urgent }

/// Riverpod controller for managing the Action Center state
class ActionCenterController extends StateNotifier<List<ActionItem>> {
  ActionCenterController() : super([]);

  /// Queue a new action item (e.g., when a notification arrives)
  void queueAction(ActionItem item) {
    state = [...state, item];
  }

  /// Queue multiple actions at once
  void queueActions(List<ActionItem> items) {
    state = [...state, ...items];
  }

  /// Remove an action after it's been handled
  void completeAction(String actionId) {
    state = state.where((item) => item.id != actionId).toList();
  }

  /// Clear all actions
  void clearAll() {
    state = [];
  }

  /// Get count of pending actions
  int get pendingCount => state.length;

  /// Get count of urgent actions
  int get urgentCount => state.where((a) => a.priority == ActionPriority.urgent).length;

  /// Get actions sorted by priority (urgent first) then by creation time
  List<ActionItem> get sortedActions {
    final priorityOrder = {
      ActionPriority.urgent: 0,
      ActionPriority.high: 1,
      ActionPriority.normal: 2,
      ActionPriority.low: 3,
    };
    final sorted = [...state];
    sorted.sort((a, b) {
      final priorityDiff = priorityOrder[a.priority]! - priorityOrder[b.priority]!;
      if (priorityDiff != 0) return priorityDiff;
      return a.createdAt.compareTo(b.createdAt);
    });
    return sorted;
  }
}

/// Provider for the Action Center controller
final actionCenterProvider = StateNotifierProvider<ActionCenterController, List<ActionItem>>(
  (ref) => ActionCenterController(),
);

/// Provider for pending action count (for badges)
final pendingActionCountProvider = Provider<int>((ref) {
  return ref.watch(actionCenterProvider).length;
});

/// Provider for urgent action count
final urgentActionCountProvider = Provider<int>((ref) {
  return ref.watch(actionCenterProvider).where((a) => a.priority == ActionPriority.urgent).length;
});