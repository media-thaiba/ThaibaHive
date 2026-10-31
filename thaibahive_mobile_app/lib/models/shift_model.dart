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
        id: (json['id'] ?? '') as String,
        name: (json['name'] ?? 'General Shift') as String,
        startTime: (json['start_time'] ?? json['startTime'] ?? '09:00') as String,
        endTime: (json['end_time'] ?? json['endTime'] ?? '17:00') as String,
        gracePeriod: json['grace_period']?.toString() ??
            json['gracePeriodMinutes']?.toString() ??
            '15',
        breakDuration: json['break_duration']?.toString(),
        isActive: json['is_active'] == true ||
            json['isActive'] == true ||
            json['is_active'] == 1 ||
            json['isActive'] == 1,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
            : (json['createdAt'] != null
                ? DateTime.tryParse(json['createdAt'].toString()) ?? DateTime.now()
                : DateTime.now()),
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
