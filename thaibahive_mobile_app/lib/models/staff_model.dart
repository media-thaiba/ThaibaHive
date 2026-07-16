import 'department_model.dart';
import 'user_model.dart';

class StaffModel {
  final String id;
  final String email;
  final String employeeId;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? designation;
  final String role;
  final String? avatarUrl;
  final bool isActive;
  final List<DepartmentModel> departments;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get fullName => '$firstName $lastName';
  String get initials =>
      '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}';

  const StaffModel({
    required this.id,
    required this.email,
    required this.employeeId,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.designation,
    required this.role,
    this.avatarUrl,
    required this.isActive,
    required this.departments,
    required this.createdAt,
    required this.updatedAt,
  });

  factory StaffModel.fromJson(Map<String, dynamic> json) => StaffModel(
        id: json['id'] as String,
        email: json['email'] as String,
        employeeId: json['employee_id'] as String,
        firstName: json['first_name'] as String,
        lastName: json['last_name'] as String,
        phone: json['phone'] as String?,
        designation: json['designation'] as String?,
        role: json['role'] as String,
        avatarUrl: json['avatar_url'] as String?,
        isActive: json['is_active'] as bool,
        departments: (json['departments'] as List<dynamic>?)
                ?.map((e) =>
                    DepartmentModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'employee_id': employeeId,
        'first_name': firstName,
        'last_name': lastName,
        'phone': phone,
        'designation': designation,
        'role': role,
        'avatar_url': avatarUrl,
        'is_active': isActive,
        'departments': departments.map((e) => e.toJson()).toList(),
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };

  UserModel toUserModel() => UserModel(
        id: id,
        email: email,
        employeeId: employeeId,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        designation: designation,
        role: role,
        avatarUrl: avatarUrl,
        isActive: isActive,
        createdAt: createdAt,
        updatedAt: updatedAt,
      );
}
