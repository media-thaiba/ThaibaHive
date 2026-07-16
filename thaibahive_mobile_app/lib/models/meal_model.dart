class MealNotificationModel {
  final String id;
  final String staffId;
  final String date;
  final String mealType;
  final String status;
  final int? guestCount;
  final String? notes;

  const MealNotificationModel({
    required this.id,
    required this.staffId,
    required this.date,
    required this.mealType,
    required this.status,
    this.guestCount,
    this.notes,
  });

  factory MealNotificationModel.fromJson(Map<String, dynamic> json) => MealNotificationModel(
        id: json['id'] as String,
        staffId: json['staff_id'] as String,
        date: json['date'] as String,
        mealType: json['meal_type'] as String,
        status: json['status'] as String,
        guestCount: json['guest_count'] as int?,
        notes: json['notes'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'staff_id': staffId,
        'date': date,
        'meal_type': mealType,
        'status': status,
        'guest_count': guestCount,
        'notes': notes,
      };

  MealNotificationModel copyWith({
    String? id,
    String? staffId,
    String? date,
    String? mealType,
    String? status,
    int? guestCount,
    String? notes,
  }) =>
      MealNotificationModel(
        id: id ?? this.id,
        staffId: staffId ?? this.staffId,
        date: date ?? this.date,
        mealType: mealType ?? this.mealType,
        status: status ?? this.status,
        guestCount: guestCount ?? this.guestCount,
        notes: notes ?? this.notes,
      );
}
