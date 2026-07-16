import 'user_model.dart';

class ReportTaskItem {
  final String description;
  final double hoursSpent;

  const ReportTaskItem({
    required this.description,
    required this.hoursSpent,
  });

  factory ReportTaskItem.fromJson(Map<String, dynamic> json) =>
      ReportTaskItem(
        description: json['description'] as String,
        hoursSpent: (json['hours_spent'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'description': description,
        'hours_spent': hoursSpent,
      };
}

class DailyReportModel {
  final String id;
  final String staffId;
  final String reportDate;
  final String summary;
  final String status;
  final List<ReportTaskItem> tasks;
  final String? submittedAt;
  final String? reviewedAt;
  final String? reviewedById;
  final String? reviewNotes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final UserModel? staff;
  final UserModel? reviewer;

  const DailyReportModel({
    required this.id,
    required this.staffId,
    required this.reportDate,
    required this.summary,
    required this.status,
    required this.tasks,
    this.submittedAt,
    this.reviewedAt,
    this.reviewedById,
    this.reviewNotes,
    required this.createdAt,
    required this.updatedAt,
    this.staff,
    this.reviewer,
  });

  factory DailyReportModel.fromJson(Map<String, dynamic> json) =>
      DailyReportModel(
        id: json['id'] as String,
        staffId: json['staff_id'] as String,
        reportDate: json['report_date'] as String,
        summary: json['summary'] as String,
        status: json['status'] as String,
        tasks: (json['tasks'] as List<dynamic>?)
                ?.map(
                    (e) => ReportTaskItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        submittedAt: json['submitted_at'] as String?,
        reviewedAt: json['reviewed_at'] as String?,
        reviewedById: json['reviewed_by_id'] as String?,
        reviewNotes: json['review_notes'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
        staff: json['staff'] != null
            ? UserModel.fromJson(json['staff'] as Map<String, dynamic>)
            : null,
        reviewer: json['reviewer'] != null
            ? UserModel.fromJson(json['reviewer'] as Map<String, dynamic>)
            : null,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'staff_id': staffId,
        'report_date': reportDate,
        'summary': summary,
        'status': status,
        'tasks': tasks.map((e) => e.toJson()).toList(),
        'submitted_at': submittedAt,
        'reviewed_at': reviewedAt,
        'reviewed_by_id': reviewedById,
        'review_notes': reviewNotes,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
        if (staff != null) 'staff': staff!.toJson(),
        if (reviewer != null) 'reviewer': reviewer!.toJson(),
      };
}
