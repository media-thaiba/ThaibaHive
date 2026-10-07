class NotificationModel {
  final String id;
  final String userId;
  final String type;
  final String title;
  final String? message;
  final String? relatedId;
  final String? relatedType;
  final bool isRead;
  final DateTime createdAt;

  const NotificationModel({
    required this.id,
    required this.userId,
    required this.type,
    required this.title,
    this.message,
    this.relatedId,
    this.relatedType,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) =>
      NotificationModel(
        id: (json['id'] ?? '') as String,
        // Server rows use `staffId`; keep `user_id` for legacy fixtures.
        userId:
            (json['userId'] ?? json['user_id'] ?? json['staffId'] ?? '') as String,
        type: (json['type'] ?? 'general') as String,
        title: (json['title'] ?? '') as String,
        message: json['message'] as String?,
        relatedId: (json['referenceId'] ?? json['related_id']) as String?,
        relatedType: (json['referenceType'] ?? json['related_type']) as String?,
        isRead: (json['isRead'] ?? json['is_read'] ?? false) as bool,
        createdAt: DateTime.tryParse(
                (json['createdAt'] ?? json['created_at'] ?? '').toString()) ??
            DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'user_id': userId,
        'type': type,
        'title': title,
        'message': message,
        'related_id': relatedId,
        'related_type': relatedType,
        'is_read': isRead,
        'created_at': createdAt.toIso8601String(),
      };

  NotificationModel copyWith({bool? isRead}) => NotificationModel(
        id: id,
        userId: userId,
        type: type,
        title: title,
        message: message,
        relatedId: relatedId,
        relatedType: relatedType,
        isRead: isRead ?? this.isRead,
        createdAt: createdAt,
      );
}
