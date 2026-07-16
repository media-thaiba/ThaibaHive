import 'user_model.dart';

class ApprovalItemModel {
  final String id;
  final String type;
  final String title;
  final String? description;
  final String status;
  final String? requesterId;
  final String? referenceId;
  final String createdAt;
  final UserModel? requester;

  const ApprovalItemModel({
    required this.id,
    required this.type,
    required this.title,
    this.description,
    required this.status,
    this.requesterId,
    this.referenceId,
    required this.createdAt,
    this.requester,
  });

  factory ApprovalItemModel.fromJson(Map<String, dynamic> json) =>
      ApprovalItemModel(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        status: json['status'] as String,
        requesterId: json['requester_id'] as String?,
        referenceId: json['reference_id'] as String?,
        createdAt: json['created_at'] as String,
        requester: json['requester'] != null
            ? UserModel.fromJson(json['requester'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'title': title,
        'description': description,
        'status': status,
        'requester_id': requesterId,
        'reference_id': referenceId,
        'created_at': createdAt,
        if (requester != null) 'requester': requester!.toJson(),
      };
}
