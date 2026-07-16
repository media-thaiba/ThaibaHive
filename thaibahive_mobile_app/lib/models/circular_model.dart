class CircularModel {
  final String id;
  final String title;
  final String? description;
  final String fileUrl;
  final String? fileType;
  final int? fileSize;
  final String? category;
  final String? targetRole;
  final String? targetDepartmentId;
  final String? targetInstitutionId;
  final String uploadedById;
  final DateTime createdAt;

  const CircularModel({
    required this.id,
    required this.title,
    this.description,
    required this.fileUrl,
    this.fileType,
    this.fileSize,
    this.category,
    this.targetRole,
    this.targetDepartmentId,
    this.targetInstitutionId,
    required this.uploadedById,
    required this.createdAt,
  });

  factory CircularModel.fromJson(Map<String, dynamic> json) => CircularModel(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        fileUrl: json['file_url'] as String,
        fileType: json['file_type'] as String?,
        fileSize: json['file_size'] as int?,
        category: json['category'] as String?,
        targetRole: json['target_role'] as String?,
        targetDepartmentId: json['target_department_id'] as String?,
        targetInstitutionId: json['target_institution_id'] as String?,
        uploadedById: json['uploaded_by_id'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'file_url': fileUrl,
        'file_type': fileType,
        'file_size': fileSize,
        'category': category,
        'target_role': targetRole,
        'target_department_id': targetDepartmentId,
        'target_institution_id': targetInstitutionId,
        'uploaded_by_id': uploadedById,
        'created_at': createdAt.toIso8601String(),
      };

  CircularModel copyWith({
    String? id,
    String? title,
    String? description,
    String? fileUrl,
    String? fileType,
    int? fileSize,
    String? category,
    String? targetRole,
    String? targetDepartmentId,
    String? targetInstitutionId,
    String? uploadedById,
    DateTime? createdAt,
  }) =>
      CircularModel(
        id: id ?? this.id,
        title: title ?? this.title,
        description: description ?? this.description,
        fileUrl: fileUrl ?? this.fileUrl,
        fileType: fileType ?? this.fileType,
        fileSize: fileSize ?? this.fileSize,
        category: category ?? this.category,
        targetRole: targetRole ?? this.targetRole,
        targetDepartmentId: targetDepartmentId ?? this.targetDepartmentId,
        targetInstitutionId: targetInstitutionId ?? this.targetInstitutionId,
        uploadedById: uploadedById ?? this.uploadedById,
        createdAt: createdAt ?? this.createdAt,
      );
}
