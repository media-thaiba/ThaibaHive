class ShiftModel {
  final String id;
  final String name;
  final String startTime;
  final String endTime;
  final String? gracePeriod;
  final String? breakDuration;
  final bool isActive;
  final DateTime createdAt;

  const ShiftModel({
    required this.id,
    required this.name,
    required this.startTime,
    required this.endTime,
    this.gracePeriod,
    this.breakDuration,
    required this.isActive,
    required this.createdAt,
  });

  factory ShiftModel.fromJson(Map<String, dynamic> json) => ShiftModel(
        id: json['id'] as String,
        name: json['name'] as String,
        startTime: json['start_time'] as String,
        endTime: json['end_time'] as String,
        gracePeriod: json['grace_period'] as String?,
        breakDuration: json['break_duration'] as String?,
        isActive: json['is_active'] as bool,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'start_time': startTime,
        'end_time': endTime,
        'grace_period': gracePeriod,
        'break_duration': breakDuration,
        'is_active': isActive,
        'created_at': createdAt.toIso8601String(),
      };
}
