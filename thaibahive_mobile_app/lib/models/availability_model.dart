import 'user_model.dart';

class StaffAvailabilityModel {
  final String id;
  final String staffId;
  final String status;
  final DateTime updatedAt;
  final UserModel? staff;

  const StaffAvailabilityModel({
    required this.id,
    required this.staffId,
    required this.status,
    required this.updatedAt,
    this.staff,
  });

  factory StaffAvailabilityModel.fromJson(Map<String, dynamic> json) =>
      StaffAvailabilityModel(
        id: json['id'] as String,
        staffId: json['staff_id'] as String,
        status: json['status'] as String,
        updatedAt: DateTime.parse(json['updated_at'] as String),
        staff: json['staff'] != null
            ? UserModel.fromJson(json['staff'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'staff_id': staffId,
        'status': status,
        'updated_at': updatedAt.toIso8601String(),
        if (staff != null) 'staff': staff!.toJson(),
      };

  StaffAvailabilityModel copyWith({
    String? id,
    String? staffId,
    String? status,
    DateTime? updatedAt,
    UserModel? staff,
  }) =>
      StaffAvailabilityModel(
        id: id ?? this.id,
        staffId: staffId ?? this.staffId,
        status: status ?? this.status,
        updatedAt: updatedAt ?? this.updatedAt,
        staff: staff ?? this.staff,
      );
}
