import 'user_model.dart';

class DepartmentModel {
  final String id;
  final String? institutionId;
  final String name;
  final String code;
  final String? description;
  final String? headUserId;
  final bool isActive;
  final UserModel? departmentHead;

  const DepartmentModel({
    required this.id,
    this.institutionId,
    required this.name,
    required this.code,
    this.description,
    this.headUserId,
    required this.isActive,
    this.departmentHead,
  });

  factory DepartmentModel.fromJson(Map<String, dynamic> json) => DepartmentModel(
        id: json['id'] as String,
        institutionId: json['institution_id'] as String?,
        name: json['name'] as String,
        code: json['code'] as String,
        description: json['description'] as String?,
        headUserId: json['head_user_id'] as String?,
        isActive: json['is_active'] as bool,
        departmentHead: json['department_head'] != null
            ? UserModel.fromJson(json['department_head'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'institution_id': institutionId,
        'name': name,
        'code': code,
        'description': description,
        'head_user_id': headUserId,
        'is_active': isActive,
        if (departmentHead != null) 'department_head': departmentHead!.toJson(),
      };

  DepartmentModel copyWith({
    String? id,
    String? institutionId,
    String? name,
    String? code,
    String? description,
    String? headUserId,
    bool? isActive,
    UserModel? departmentHead,
  }) =>
      DepartmentModel(
        id: id ?? this.id,
        institutionId: institutionId ?? this.institutionId,
        name: name ?? this.name,
        code: code ?? this.code,
        description: description ?? this.description,
        headUserId: headUserId ?? this.headUserId,
        isActive: isActive ?? this.isActive,
        departmentHead: departmentHead ?? this.departmentHead,
      );
}
