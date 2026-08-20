class EngageMessageItem {
  final String id;
  final String title;
  final String body;
  final String channel;
  final String priority;
  final DateTime timestamp;
  final bool isRead;
  final Map<String, dynamic>? metadata;

  const EngageMessageItem({
    required this.id,
    required this.title,
    required this.body,
    required this.channel,
    required this.priority,
    required this.timestamp,
    this.isRead = false,
    this.metadata,
  });

  factory EngageMessageItem.fromJson(Map<String, dynamic> json) {
    return EngageMessageItem(
      id: json['id'] as String? ?? json['messageId'] as String? ?? '',
      title: json['subject'] as String? ?? json['title'] as String? ?? 'Campus Alert',
      body: json['body'] as String? ?? '',
      channel: json['channel'] as String? ?? 'push',
      priority: json['priority'] as String? ?? 'standard',
      timestamp: json['scheduledAt'] != null
          ? DateTime.tryParse(json['scheduledAt'] as String) ?? DateTime.now()
          : DateTime.now(),
      isRead: json['isRead'] as bool? ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
}
