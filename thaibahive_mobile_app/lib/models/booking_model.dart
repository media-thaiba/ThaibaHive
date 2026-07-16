class BookingModel {
  final String id;
  final String resourceId;
  final String? resourceName;
  final String resourceType;
  final String title;
  final DateTime startTime;
  final DateTime endTime;
  final String status;
  final String? notes;
  final String userId;
  final DateTime createdAt;

  const BookingModel({
    required this.id,
    required this.resourceId,
    this.resourceName,
    required this.resourceType,
    required this.title,
    required this.startTime,
    required this.endTime,
    required this.status,
    this.notes,
    required this.userId,
    required this.createdAt,
  });

  factory BookingModel.fromJson(Map<String, dynamic> json) => BookingModel(
        id: json['id'] as String,
        resourceId: json['resource_id'] as String,
        resourceName: json['resource_name'] as String?,
        resourceType: json['resource_type'] as String,
        title: json['title'] as String,
        startTime: DateTime.parse(json['start_time'] as String),
        endTime: DateTime.parse(json['end_time'] as String),
        status: json['status'] as String,
        notes: json['notes'] as String?,
        userId: json['user_id'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'resource_id': resourceId,
        'resource_name': resourceName,
        'resource_type': resourceType,
        'title': title,
        'start_time': startTime.toIso8601String(),
        'end_time': endTime.toIso8601String(),
        'status': status,
        'notes': notes,
        'user_id': userId,
        'created_at': createdAt.toIso8601String(),
      };
}
