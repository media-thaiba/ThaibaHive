import 'user_model.dart';

class AnnouncementModel {
  final String id;
  final String title;
  final String? content;
  final String priority;
  final String? authorName;
  final bool isActive;
  final bool isPinned;
  final UserModel? createdBy;
  final DateTime createdAt;

  const AnnouncementModel({
    required this.id,
    required this.title,
    this.content,
    required this.priority,
    this.authorName,
    required this.isActive,
    this.isPinned = false,
    this.createdBy,
    required this.createdAt,
  });

  factory AnnouncementModel.fromJson(Map<String, dynamic> json) =>
      AnnouncementModel(
        id: json['id'] as String,
        title: json['title'] as String,
        content: json['content'] as String?,
        priority: json['priority'] as String,
        authorName: json['author_name'] as String?,
        isActive: json['is_active'] as bool? ?? true,
        isPinned: json['is_pinned'] as bool? ?? false,
        createdBy: json['created_by'] != null
            ? UserModel.fromJson(json['created_by'] as Map<String, dynamic>)
            : null,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'content': content,
        'priority': priority,
        'author_name': authorName,
        'is_active': isActive,
        'is_pinned': isPinned,
        'created_by': createdBy?.toJson(),
        'created_at': createdAt.toIso8601String(),
      };
}
