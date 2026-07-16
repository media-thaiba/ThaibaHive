class SubDepartmentModel {
  final String id;
  final String departmentId;
  final String name;
  final String code;
  final String? description;
  final String? headUserId;
  final bool isActive;

  const SubDepartmentModel({
    required this.id,
    required this.departmentId,
    required this.name,
    required this.code,
    this.description,
    this.headUserId,
    required this.isActive,
  });

  factory SubDepartmentModel.fromJson(Map<String, dynamic> json) =>
      SubDepartmentModel(
        id: json['id'] as String,
        departmentId: json['department_id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        description: json['description'] as String?,
        headUserId: json['head_user_id'] as String?,
        isActive: json['is_active'] as bool,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'department_id': departmentId,
        'name': name,
        'code': code,
        'description': description,
        'head_user_id': headUserId,
        'is_active': isActive,
      };
}
