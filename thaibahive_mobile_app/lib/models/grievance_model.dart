class GrievanceResponse {
  final String id;
  final String grievanceId;
  final String response;
  final String respondedById;
  final String? respondedByName;
  final DateTime createdAt;

  const GrievanceResponse({
    required this.id,
    required this.grievanceId,
    required this.response,
    required this.respondedById,
    this.respondedByName,
    required this.createdAt,
  });

  factory GrievanceResponse.fromJson(Map<String, dynamic> json) =>
      GrievanceResponse(
        id: json['id'] as String,
        grievanceId: json['grievance_id'] as String,
        response: json['response'] as String,
        respondedById: json['responded_by_id'] as String,
        respondedByName: json['responded_by_name'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'grievance_id': grievanceId,
        'response': response,
        'responded_by_id': respondedById,
        'responded_by_name': respondedByName,
        'created_at': createdAt.toIso8601String(),
      };
}

class GrievanceModel {
  final String id;
  final String? category;
  final String subject;
  final String description;
  final bool isAnonymous;
  final String status;
  final String? response;
  final GrievanceResponse? grievanceResponse;
  final String userId;
  final String? userName;
  final DateTime createdAt;
  final DateTime updatedAt;

  const GrievanceModel({
    required this.id,
    this.category,
    required this.subject,
    required this.description,
    required this.isAnonymous,
    required this.status,
    this.response,
    this.grievanceResponse,
    required this.userId,
    this.userName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory GrievanceModel.fromJson(Map<String, dynamic> json) => GrievanceModel(
        id: json['id'] as String,
        category: json['category'] as String?,
        subject: json['subject'] as String,
        description: json['description'] as String,
        isAnonymous: json['is_anonymous'] as bool? ?? false,
        status: json['status'] as String,
        response: json['response'] as String?,
        grievanceResponse: json['grievance_response'] != null
            ? GrievanceResponse.fromJson(
                json['grievance_response'] as Map<String, dynamic>)
            : null,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'category': category,
        'subject': subject,
        'description': description,
        'is_anonymous': isAnonymous,
        'status': status,
        'response': response,
        'grievance_response': grievanceResponse?.toJson(),
        'user_id': userId,
        'user_name': userName,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}
