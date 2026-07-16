import 'user_model.dart';

class HelpDeskTicketModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String priority;
  final String status;
  final String submittedById;
  final String? assignedToId;
  final String? resolvedAt;
  final DateTime createdAt;
  final UserModel? submitter;
  final UserModel? assignee;
  final int? commentCount;

  const HelpDeskTicketModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.priority,
    required this.status,
    required this.submittedById,
    this.assignedToId,
    this.resolvedAt,
    required this.createdAt,
    this.submitter,
    this.assignee,
    this.commentCount,
  });

  factory HelpDeskTicketModel.fromJson(Map<String, dynamic> json) => HelpDeskTicketModel(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String,
        category: json['category'] as String,
        priority: json['priority'] as String,
        status: json['status'] as String,
        submittedById: json['submitted_by_id'] as String,
        assignedToId: json['assigned_to_id'] as String?,
        resolvedAt: json['resolved_at'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        submitter: json['submitter'] != null
            ? UserModel.fromJson(json['submitter'] as Map<String, dynamic>)
            : null,
        assignee: json['assignee'] != null
            ? UserModel.fromJson(json['assignee'] as Map<String, dynamic>)
            : null,
        commentCount: json['comment_count'] as int?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'category': category,
        'priority': priority,
        'status': status,
        'submitted_by_id': submittedById,
        'assigned_to_id': assignedToId,
        'resolved_at': resolvedAt,
        'created_at': createdAt.toIso8601String(),
        if (submitter != null) 'submitter': submitter!.toJson(),
        if (assignee != null) 'assignee': assignee!.toJson(),
        'comment_count': commentCount,
      };

  HelpDeskTicketModel copyWith({
    String? id,
    String? title,
    String? description,
    String? category,
    String? priority,
    String? status,
    String? submittedById,
    String? assignedToId,
    String? resolvedAt,
    DateTime? createdAt,
    UserModel? submitter,
    UserModel? assignee,
    int? commentCount,
  }) =>
      HelpDeskTicketModel(
        id: id ?? this.id,
        title: title ?? this.title,
        description: description ?? this.description,
        category: category ?? this.category,
        priority: priority ?? this.priority,
        status: status ?? this.status,
        submittedById: submittedById ?? this.submittedById,
        assignedToId: assignedToId ?? this.assignedToId,
        resolvedAt: resolvedAt ?? this.resolvedAt,
        createdAt: createdAt ?? this.createdAt,
        submitter: submitter ?? this.submitter,
        assignee: assignee ?? this.assignee,
        commentCount: commentCount ?? this.commentCount,
      );
}
