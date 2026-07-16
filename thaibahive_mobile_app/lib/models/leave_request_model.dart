import 'user_model.dart';
import 'leave_type_model.dart';

class LeaveRequestModel {
  final String id;
  final String staffId;
  final String leaveTypeId;
  final String startDate;
  final String endDate;
  final double days;
  final String reason;
  final String status;
  final String? reviewNotes;
  final String? reviewedById;
  final String? reviewedAt;
  final String appliedAt;
  final String? updatedAt;
  final UserModel? staff;
  final UserModel? reviewer;
  final LeaveTypeModel? leaveType;

  const LeaveRequestModel({
    required this.id,
    required this.staffId,
    required this.leaveTypeId,
    required this.startDate,
    required this.endDate,
    required this.days,
    required this.reason,
    required this.status,
    this.reviewNotes,
    this.reviewedById,
    this.reviewedAt,
    required this.appliedAt,
    this.updatedAt,
    this.staff,
    this.reviewer,
    this.leaveType,
  });

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) =>
      LeaveRequestModel(
        id: _getString(json, ['id']),
        staffId: _getString(json, ['staff_id', 'staffId']),
        leaveTypeId: _getString(json, ['leave_type_id', 'leaveTypeId']),
        startDate: _getString(json, ['start_date', 'startDate']),
        endDate: _getString(json, ['end_date', 'endDate']),
        days: _getDouble(json, ['days', 'daysCount']),
        reason: _getString(json, ['reason']),
        status: _getString(json, ['status']),
        reviewNotes: _getOptionalString(json, ['review_notes', 'reviewNotes']),
        reviewedById: _getOptionalString(json, ['reviewed_by_id', 'reviewedById']),
        reviewedAt: _getOptionalString(json, ['reviewed_at', 'reviewedAt']),
        appliedAt: _getString(json, ['applied_at', 'appliedAt']),
        updatedAt: _getOptionalString(json, ['updated_at', 'updatedAt']),
        staff: json['staff'] != null
            ? UserModel.fromJson(json['staff'] as Map<String, dynamic>)
            : null,
        reviewer: json['reviewer'] != null
            ? UserModel.fromJson(json['reviewer'] as Map<String, dynamic>)
            : null,
        leaveType: json['leave_type'] != null
            ? LeaveTypeModel.fromJson(
                json['leave_type'] as Map<String, dynamic>)
            : null,
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

  Map<String, dynamic> toJson() => {
        'id': id,
        'staff_id': staffId,
        'leave_type_id': leaveTypeId,
        'start_date': startDate,
        'end_date': endDate,
        'days': days,
        'reason': reason,
        'status': status,
        'review_notes': reviewNotes,
        'reviewed_by_id': reviewedById,
        'reviewed_at': reviewedAt,
        'applied_at': appliedAt,
        'updated_at': updatedAt,
        if (staff != null) 'staff': staff!.toJson(),
        if (reviewer != null) 'reviewer': reviewer!.toJson(),
        if (leaveType != null) 'leave_type': leaveType!.toJson(),
      };

  LeaveRequestModel copyWith({
    String? id,
    String? staffId,
    String? leaveTypeId,
    String? startDate,
    String? endDate,
    double? days,
    String? reason,
    String? status,
    String? reviewNotes,
    String? reviewedById,
    String? reviewedAt,
    String? appliedAt,
    String? updatedAt,
    UserModel? staff,
    UserModel? reviewer,
    LeaveTypeModel? leaveType,
  }) =>
      LeaveRequestModel(
        id: id ?? this.id,
        staffId: staffId ?? this.staffId,
        leaveTypeId: leaveTypeId ?? this.leaveTypeId,
        startDate: startDate ?? this.startDate,
        endDate: endDate ?? this.endDate,
        days: days ?? this.days,
        reason: reason ?? this.reason,
        status: status ?? this.status,
        reviewNotes: reviewNotes ?? this.reviewNotes,
        reviewedById: reviewedById ?? this.reviewedById,
        reviewedAt: reviewedAt ?? this.reviewedAt,
        appliedAt: appliedAt ?? this.appliedAt,
        updatedAt: updatedAt ?? this.updatedAt,
        staff: staff ?? this.staff,
        reviewer: reviewer ?? this.reviewer,
        leaveType: leaveType ?? this.leaveType,
      );
}
