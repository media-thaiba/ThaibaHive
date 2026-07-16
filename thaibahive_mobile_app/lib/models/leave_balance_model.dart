import 'leave_type_model.dart';

class LeaveBalanceModel {
  final String id;
  final String leaveTypeId;
  final double totalDays;
  final double usedDays;
  final double remainingDays;
  final int year;
  final LeaveTypeModel? leaveType;

  const LeaveBalanceModel({
    required this.id,
    required this.leaveTypeId,
    required this.totalDays,
    required this.usedDays,
    required this.remainingDays,
    required this.year,
    this.leaveType,
  });

  factory LeaveBalanceModel.fromJson(Map<String, dynamic> json) {
    final total = ((json['total_days'] ?? json['totalDays'] ?? 0) as num).toDouble();
    final used = ((json['used_days'] ?? json['usedDays'] ?? 0) as num).toDouble();
    final remaining = ((json['remaining_days'] ?? json['remainingDays'] ?? (total - used)) as num).toDouble();
    return LeaveBalanceModel(
      id: (json['id'] ?? '') as String,
      leaveTypeId: (json['leave_type_id'] ?? json['leaveTypeId'] ?? '') as String,
      totalDays: total,
      usedDays: used,
      remainingDays: remaining,
      year: (json['year'] ?? DateTime.now().year) as int,
      leaveType: json['leave_type'] != null || json['leaveType'] != null
          ? LeaveTypeModel.fromJson((json['leave_type'] ?? json['leaveType']) as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'leave_type_id': leaveTypeId,
        'total_days': totalDays,
        'used_days': usedDays,
        'remaining_days': remainingDays,
        'year': year,
        if (leaveType != null) 'leave_type': leaveType!.toJson(),
      };

  LeaveBalanceModel copyWith({
    String? id,
    String? leaveTypeId,
    double? totalDays,
    double? usedDays,
    double? remainingDays,
    int? year,
    LeaveTypeModel? leaveType,
  }) =>
      LeaveBalanceModel(
        id: id ?? this.id,
        leaveTypeId: leaveTypeId ?? this.leaveTypeId,
        totalDays: totalDays ?? this.totalDays,
        usedDays: usedDays ?? this.usedDays,
        remainingDays: remainingDays ?? this.remainingDays,
        year: year ?? this.year,
        leaveType: leaveType ?? this.leaveType,
      );
}
