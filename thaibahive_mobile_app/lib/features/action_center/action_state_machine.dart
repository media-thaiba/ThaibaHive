/// Pure state machine for Action Center items (Phase 2, D1).
///
/// No I/O, no Flutter dependencies — the controller applies [nextStatus]
/// results and persists them. Illegal transitions return `null` and callers
/// must ignore them.
library;

enum ActionStatus {
  pending,
  acknowledged,
  snoozed,
  dismissed,
  completed,
  expired,
}

enum ActionEvent {
  acknowledge,
  snooze,
  dismiss,
  complete,
  wake,
  reopen,
  expire,
}

/// Statuses that are visible in the tray / inline lists.
const Set<ActionStatus> kVisibleStatuses = {
  ActionStatus.pending,
  ActionStatus.acknowledged,
  ActionStatus.snoozed,
};

/// Statuses that contribute to badge counts (tray, FAB, bottom-nav tabs).
/// `acknowledged` is intentionally excluded — the user has seen it.
const Set<ActionStatus> kBadgeStatuses = {
  ActionStatus.pending,
  ActionStatus.snoozed,
};

/// Statuses from which no transition is allowed.
const Set<ActionStatus> kTerminalStatuses = {
  ActionStatus.dismissed,
  ActionStatus.completed,
  ActionStatus.expired,
};

bool isTerminalStatus(ActionStatus status) => kTerminalStatuses.contains(status);

/// Exhaustive guard table. Every (from, event) pair not listed is illegal.
const Map<ActionStatus, Map<ActionEvent, ActionStatus>> kTransitionGuards = {
  ActionStatus.pending: {
    ActionEvent.acknowledge: ActionStatus.acknowledged,
    ActionEvent.snooze: ActionStatus.snoozed,
    ActionEvent.dismiss: ActionStatus.dismissed,
    ActionEvent.complete: ActionStatus.completed,
    ActionEvent.expire: ActionStatus.expired,
  },
  ActionStatus.acknowledged: {
    ActionEvent.reopen: ActionStatus.pending,
    ActionEvent.snooze: ActionStatus.snoozed,
    ActionEvent.dismiss: ActionStatus.dismissed,
    ActionEvent.complete: ActionStatus.completed,
    ActionEvent.expire: ActionStatus.expired,
  },
  ActionStatus.snoozed: {
    // Lazy wake: applied when snoozeUntil has elapsed on read/resume/tray open.
    ActionEvent.wake: ActionStatus.pending,
    ActionEvent.acknowledge: ActionStatus.acknowledged,
    ActionEvent.dismiss: ActionStatus.dismissed,
    ActionEvent.complete: ActionStatus.completed,
    ActionEvent.expire: ActionStatus.expired,
  },
  // Terminal statuses map to nothing.
  ActionStatus.dismissed: {},
  ActionStatus.completed: {},
  ActionStatus.expired: {},
};

/// Returns the target status for [event], or `null` when the transition is
/// illegal (including every event from a terminal status).
ActionStatus? nextStatus(ActionStatus from, ActionEvent event) {
  return kTransitionGuards[from]?[event];
}

/// Whether a snoozed item should wake back to [ActionStatus.pending].
bool shouldWake({required DateTime? snoozeUntil, required DateTime now}) {
  if (snoozeUntil == null) return true;
  return !now.isBefore(snoozeUntil);
}

/// TTL windows by priority name (ActionPriority.name) — clock origin is the
/// item's `createdAt` at first enqueue; re-enqueue does not extend it.
const Map<String, Duration> kTtlByPriority = {
  'urgent': Duration(hours: 24),
  'high': Duration(hours: 48),
  'normal': Duration(days: 7),
  'low': Duration(days: 7),
};

/// Terminal items older than this are purged from Hive on hydration.
const Duration kTerminalRetention = Duration(days: 7);
