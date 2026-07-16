class ChecklistTemplateModel {
  final String id;
  final String name;
  final String type;
  final String? description;
  final bool isActive;
  final List<ChecklistTemplateItemModel>? items;

  const ChecklistTemplateModel({
    required this.id,
    required this.name,
    required this.type,
    this.description,
    required this.isActive,
    this.items,
  });

  factory ChecklistTemplateModel.fromJson(Map<String, dynamic> json) => ChecklistTemplateModel(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String,
        description: json['description'] as String?,
        isActive: json['is_active'] as bool,
        items: json['items'] != null
            ? (json['items'] as List<dynamic>)
                .map((e) => ChecklistTemplateItemModel.fromJson(e as Map<String, dynamic>))
                .toList()
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'description': description,
        'is_active': isActive,
        if (items != null) 'items': items!.map((e) => e.toJson()).toList(),
      };

  ChecklistTemplateModel copyWith({
    String? id,
    String? name,
    String? type,
    String? description,
    bool? isActive,
    List<ChecklistTemplateItemModel>? items,
  }) =>
      ChecklistTemplateModel(
        id: id ?? this.id,
        name: name ?? this.name,
        type: type ?? this.type,
        description: description ?? this.description,
        isActive: isActive ?? this.isActive,
        items: items ?? this.items,
      );
}

class ChecklistTemplateItemModel {
  final String id;
  final String templateId;
  final String title;
  final String? description;
  final int order;

  const ChecklistTemplateItemModel({
    required this.id,
    required this.templateId,
    required this.title,
    this.description,
    required this.order,
  });

  factory ChecklistTemplateItemModel.fromJson(Map<String, dynamic> json) =>
      ChecklistTemplateItemModel(
        id: json['id'] as String,
        templateId: json['template_id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        order: json['order'] as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'template_id': templateId,
        'title': title,
        'description': description,
        'order': order,
      };

  ChecklistTemplateItemModel copyWith({
    String? id,
    String? templateId,
    String? title,
    String? description,
    int? order,
  }) =>
      ChecklistTemplateItemModel(
        id: id ?? this.id,
        templateId: templateId ?? this.templateId,
        title: title ?? this.title,
        description: description ?? this.description,
        order: order ?? this.order,
      );
}

class StaffChecklistModel {
  final String id;
  final String staffId;
  final String? templateId;
  final String type;
  final String status;
  final String? startedAt;
  final String? completedAt;
  final List<StaffChecklistTaskModel>? tasks;

  const StaffChecklistModel({
    required this.id,
    required this.staffId,
    this.templateId,
    required this.type,
    required this.status,
    this.startedAt,
    this.completedAt,
    this.tasks,
  });

  factory StaffChecklistModel.fromJson(Map<String, dynamic> json) => StaffChecklistModel(
        id: json['id'] as String,
        staffId: json['staff_id'] as String,
        templateId: json['template_id'] as String?,
        type: json['type'] as String,
        status: json['status'] as String,
        startedAt: json['started_at'] as String?,
        completedAt: json['completed_at'] as String?,
        tasks: json['tasks'] != null
            ? (json['tasks'] as List<dynamic>)
                .map((e) => StaffChecklistTaskModel.fromJson(e as Map<String, dynamic>))
                .toList()
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'staff_id': staffId,
        'template_id': templateId,
        'type': type,
        'status': status,
        'started_at': startedAt,
        'completed_at': completedAt,
        if (tasks != null) 'tasks': tasks!.map((e) => e.toJson()).toList(),
      };

  StaffChecklistModel copyWith({
    String? id,
    String? staffId,
    String? templateId,
    String? type,
    String? status,
    String? startedAt,
    String? completedAt,
    List<StaffChecklistTaskModel>? tasks,
  }) =>
      StaffChecklistModel(
        id: id ?? this.id,
        staffId: staffId ?? this.staffId,
        templateId: templateId ?? this.templateId,
        type: type ?? this.type,
        status: status ?? this.status,
        startedAt: startedAt ?? this.startedAt,
        completedAt: completedAt ?? this.completedAt,
        tasks: tasks ?? this.tasks,
      );
}

class StaffChecklistTaskModel {
  final String id;
  final String checklistId;
  final String title;
  final String? description;
  final bool isCompleted;
  final String? completedById;
  final String? completedAt;
  final int order;

  const StaffChecklistTaskModel({
    required this.id,
    required this.checklistId,
    required this.title,
    this.description,
    required this.isCompleted,
    this.completedById,
    this.completedAt,
    required this.order,
  });

  factory StaffChecklistTaskModel.fromJson(Map<String, dynamic> json) =>
      StaffChecklistTaskModel(
        id: json['id'] as String,
        checklistId: json['checklist_id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        isCompleted: json['is_completed'] as bool,
        completedById: json['completed_by_id'] as String?,
        completedAt: json['completed_at'] as String?,
        order: json['order'] as int,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'checklist_id': checklistId,
        'title': title,
        'description': description,
        'is_completed': isCompleted,
        'completed_by_id': completedById,
        'completed_at': completedAt,
        'order': order,
      };

  StaffChecklistTaskModel copyWith({
    String? id,
    String? checklistId,
    String? title,
    String? description,
    bool? isCompleted,
    String? completedById,
    String? completedAt,
    int? order,
  }) =>
      StaffChecklistTaskModel(
        id: id ?? this.id,
        checklistId: checklistId ?? this.checklistId,
        title: title ?? this.title,
        description: description ?? this.description,
        isCompleted: isCompleted ?? this.isCompleted,
        completedById: completedById ?? this.completedById,
        completedAt: completedAt ?? this.completedAt,
        order: order ?? this.order,
      );
}
