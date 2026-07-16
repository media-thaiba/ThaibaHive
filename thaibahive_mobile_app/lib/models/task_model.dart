import 'user_model.dart';

class TaskModel {
  final String id;
  final String title;
  final String? description;
  final String status;
  final String priority;
  final UserModel? assignee;
  final String? dueDate;
  final String? createdBy;
  final int commentCount;
  final DateTime createdAt;
  final DateTime updatedAt;

  const TaskModel({
    required this.id,
    required this.title,
    this.description,
    required this.status,
    required this.priority,
    this.assignee,
    this.dueDate,
    this.createdBy,
    this.commentCount = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) => TaskModel(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        status: json['status'] as String,
        priority: json['priority'] as String,
        assignee: json['assignee'] != null
            ? UserModel.fromJson(json['assignee'] as Map<String, dynamic>)
            : null,
        dueDate: json['due_date'] as String?,
        createdBy: json['created_by'] as String?,
        commentCount: json['comment_count'] as int? ?? 0,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );

  TaskModel copyWith({
    String? id,
    String? title,
    String? description,
    String? status,
    String? priority,
    UserModel? assignee,
    String? dueDate,
    String? createdBy,
    int? commentCount,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      TaskModel(
        id: id ?? this.id,
        title: title ?? this.title,
        description: description ?? this.description,
        status: status ?? this.status,
        priority: priority ?? this.priority,
        assignee: assignee ?? this.assignee,
        dueDate: dueDate ?? this.dueDate,
        createdBy: createdBy ?? this.createdBy,
        commentCount: commentCount ?? this.commentCount,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
