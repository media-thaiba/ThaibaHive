class LeaveTypeModel {
  final String id;
  final String name;
  final String code;
  final String? description;
  final double daysAllowed;
  final bool requiresApproval;
  final bool isActive;

  const LeaveTypeModel({
    required this.id,
    required this.name,
    required this.code,
    this.description,
    required this.daysAllowed,
    required this.requiresApproval,
    required this.isActive,
  });

  factory LeaveTypeModel.fromJson(Map<String, dynamic> json) => LeaveTypeModel(
        id: _getString(json, ['id']),
        name: _getString(json, ['name']),
        code: _getString(json, ['code']),
        description: _getOptionalString(json, ['description']),
        daysAllowed: _getDouble(json, ['days_allowed', 'daysAllowed']),
        requiresApproval: _getBool(json, ['requires_approval', 'requiresApproval']),
        isActive: _getBool(json, ['is_active', 'isActive']),
      );

  static String _getString(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      if (json.containsKey(key) && json[key] != null) {
        return json[key] as String;
      }
    }
    return '';
  }

  static String? _getOptionalString(
      Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      if (json.containsKey(key) && json[key] != null) {
        return json[key] as String?;
      }
    }
    return null;
  }

  static double _getDouble(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      if (json.containsKey(key) && json[key] != null) {
        return (json[key] as num).toDouble();
      }
    }
    return 0.0;
  }

  static bool _getBool(Map<String, dynamic> json, List<String> keys) {
    for (final key in keys) {
      if (json.containsKey(key) && json[key] != null) {
        return json[key] as bool;
      }
    }
    return false;
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'description': description,
        'days_allowed': daysAllowed,
        'requires_approval': requiresApproval,
        'is_active': isActive,
      };

  LeaveTypeModel copyWith({
    String? id,
    String? name,
    String? code,
    String? description,
    double? daysAllowed,
    bool? requiresApproval,
    bool? isActive,
  }) =>
      LeaveTypeModel(
        id: id ?? this.id,
        name: name ?? this.name,
        code: code ?? this.code,
        description: description ?? this.description,
        daysAllowed: daysAllowed ?? this.daysAllowed,
        requiresApproval: requiresApproval ?? this.requiresApproval,
        isActive: isActive ?? this.isActive,
      );
}