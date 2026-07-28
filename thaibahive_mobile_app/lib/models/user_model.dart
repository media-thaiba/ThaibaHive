class UserModel {
  final String id;
  final String email;
  final String employeeId;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? designation;
  final String role;
  final String? avatarUrl;
  final String? dateOfBirth;
  final String? dateOfJoining;
  final String? qualifications;
  final String? emergencyContactName;
  final String? emergencyContactPhone;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}';

  const UserModel({
    required this.id,
    required this.email,
    required this.employeeId,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.designation,
    required this.role,
    this.avatarUrl,
    this.dateOfBirth,
    this.dateOfJoining,
    this.qualifications,
    this.emergencyContactName,
    this.emergencyContactPhone,
    required this.isActive,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    final data = (json['staff'] ?? json['user'] ?? json) as Map<String, dynamic>;
    return UserModel(
      id: (data['id'] ?? '') as String,
      email: (data['email'] ?? '') as String,
      employeeId: (data['employee_id'] ?? data['employeeId'] ?? '') as String,
      firstName: (data['first_name'] ?? data['firstName'] ?? '') as String,
      lastName: (data['last_name'] ?? data['lastName'] ?? '') as String,
      phone: data['phone'] as String?,
      designation: data['designation'] as String?,
      role: (data['role'] ?? '') as String,
      avatarUrl: (data['avatar_url'] ?? data['avatarUrl']) as String?,
      dateOfBirth: (data['date_of_birth'] ?? data['dateOfBirth']) as String?,
      dateOfJoining: (data['date_of_joining'] ?? data['dateOfJoining']) as String?,
      qualifications: data['qualifications'] as String?,
      emergencyContactName: (data['emergency_contact_name'] ?? data['emergencyContactName']) as String?,
      emergencyContactPhone: (data['emergency_contact_phone'] ?? data['emergencyContactPhone']) as String?,
      isActive: (data['is_active'] ?? data['isActive']) as bool? ?? true,
      createdAt: data['created_at'] != null
          ? DateTime.parse(data['created_at'] as String)
          : (data['createdAt'] != null ? DateTime.parse(data['createdAt'] as String) : DateTime.now()),
      updatedAt: data['updated_at'] != null
          ? DateTime.parse(data['updated_at'] as String)
          : (data['updatedAt'] != null ? DateTime.parse(data['updatedAt'] as String) : DateTime.now()),
    );
  }

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
        'date_of_birth': dateOfBirth,
        'date_of_joining': dateOfJoining,
        'qualifications': qualifications,
        'emergency_contact_name': emergencyContactName,
        'emergency_contact_phone': emergencyContactPhone,
        'is_active': isActive,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };

  UserModel copyWith({
    String? id,
    String? email,
    String? employeeId,
    String? firstName,
    String? lastName,
    String? phone,
    String? designation,
    String? role,
    String? avatarUrl,
    String? dateOfBirth,
    String? dateOfJoining,
    String? qualifications,
    String? emergencyContactName,
    String? emergencyContactPhone,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) =>
      UserModel(
        id: id ?? this.id,
        email: email ?? this.email,
        employeeId: employeeId ?? this.employeeId,
        firstName: firstName ?? this.firstName,
        lastName: lastName ?? this.lastName,
        phone: phone ?? this.phone,
        designation: designation ?? this.designation,
        role: role ?? this.role,
        avatarUrl: avatarUrl ?? this.avatarUrl,
        dateOfBirth: dateOfBirth ?? this.dateOfBirth,
        dateOfJoining: dateOfJoining ?? this.dateOfJoining,
        qualifications: qualifications ?? this.qualifications,
        emergencyContactName: emergencyContactName ?? this.emergencyContactName,
        emergencyContactPhone: emergencyContactPhone ?? this.emergencyContactPhone,
        isActive: isActive ?? this.isActive,
        createdAt: createdAt ?? this.createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}
