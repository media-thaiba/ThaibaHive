class TaskCommentModel {
  final String id;
  final String taskId;
  final String comment;
  final String userId;
  final String userName;
  final String? userAvatar;
  final DateTime createdAt;

  const TaskCommentModel({
    required this.id,
    required this.taskId,
    required this.comment,
    required this.userId,
    required this.userName,
    this.userAvatar,
    required this.createdAt,
  });

  factory TaskCommentModel.fromJson(Map<String, dynamic> json) =>
      TaskCommentModel(
        id: json['id'] as String,
        taskId: json['task_id'] as String,
        comment: json['comment'] as String,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String,
        userAvatar: json['user_avatar'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );
}
