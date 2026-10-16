import 'user_model.dart';

class HelpDeskCommentModel {
  final String id;
  final String content;
  final String? authorName;
  final String? authorLastName;
  final DateTime createdAt;

  const HelpDeskCommentModel({
    required this.id,
    required this.content,
    this.authorName,
    this.authorLastName,
    required this.createdAt,
  });

  String get fullAuthorName {
    final parts = [authorName, authorLastName]
        .where((s) => s != null && s.trim().isNotEmpty)
        .map((s) => s!.trim())
        .toList();
    return parts.isEmpty ? 'Staff Member' : parts.join(' ');
  }

  factory HelpDeskCommentModel.fromJson(Map<String, dynamic> json) =>
      HelpDeskCommentModel(
        id: (json['id'] ?? '').toString(),
        content: (json['content'] ?? '').toString(),
        authorName: (json['author_name'] ?? json['authorName']) as String?,
        authorLastName:
            (json['author_last_name'] ?? json['authorLastName']) as String?,
        createdAt: DateTime.tryParse(
              (json['created_at'] ?? json['createdAt'] ?? '').toString(),
            ) ??
            DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'content': content,
        'author_name': authorName,
        'author_last_name': authorLastName,
        'created_at': createdAt.toIso8601String(),
      };
}

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
  final List<HelpDeskCommentModel> comments;

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
    this.comments = const [],
  });

  factory HelpDeskTicketModel.fromJson(Map<String, dynamic> json) {
    final rawComments = json['comments'];
    final parsedComments = rawComments is List
        ? rawComments
            .whereType<Map>()
            .map((e) => HelpDeskCommentModel.fromJson(Map<String, dynamic>.from(e)))
            .toList()
        : const <HelpDeskCommentModel>[];

    return HelpDeskTicketModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      category: json['category'] as String,
      priority: json['priority'] as String,
      status: json['status'] as String,
      submittedById:
          (json['submitted_by_id'] ?? json['submittedById'] ?? '') as String,
      assignedToId:
          (json['assigned_to_id'] ?? json['assignedToId']) as String?,
      resolvedAt: (json['resolved_at'] ?? json['resolvedAt']) as String?,
      createdAt: DateTime.parse(
        (json['created_at'] ?? json['createdAt']) as String,
      ),
      submitter: json['submitter'] != null
          ? UserModel.fromJson(json['submitter'] as Map<String, dynamic>)
          : null,
      assignee: json['assignee'] != null
          ? UserModel.fromJson(json['assignee'] as Map<String, dynamic>)
          : null,
      commentCount: (json['comment_count'] ?? json['commentCount']) as int?,
      comments: parsedComments,
    );
  }

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
        'comments': comments.map((c) => c.toJson()).toList(),
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
    List<HelpDeskCommentModel>? comments,
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
        comments: comments ?? this.comments,
      );
}
