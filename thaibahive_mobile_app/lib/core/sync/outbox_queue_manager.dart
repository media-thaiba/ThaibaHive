class OutboxAction {
  final String id;
  final String entityType;
  final String entityId;
  final String action;
  final Map<String, dynamic> payload;
  final DateTime timestamp;
  int retryCount;

  OutboxAction({
    required this.id,
    required this.entityType,
    required this.entityId,
    required this.action,
    required this.payload,
    required this.timestamp,
    this.retryCount = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'entityType': entityType,
        'entityId': entityId,
        'action': action,
        'payload': payload,
        'timestamp': timestamp.toIso8601String(),
        'retryCount': retryCount,
      };
}

class OutboxQueueManager {
  static final List<OutboxAction> _queue = [];

  static void addAction(OutboxAction action) {
    _queue.add(action);
  }

  static List<OutboxAction> getPendingActions() {
    return List.unmodifiable(_queue);
  }

  static void markSuccess(String actionId) {
    _queue.removeWhere((a) => a.id == actionId);
  }

  static void incrementRetry(String actionId) {
    for (var a in _queue) {
      if (a.id == actionId) {
        a.retryCount++;
        break;
      }
    }
  }

  static void clearQueue() {
    _queue.clear();
  }
}
