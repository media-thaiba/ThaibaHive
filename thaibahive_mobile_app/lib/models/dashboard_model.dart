import 'announcement_model.dart';
import 'event_model.dart';

class DashboardStatsModel {
  final int totalStaff;
  final int pendingLeaves;
  final int pendingTasks;
  final int pendingApprovals;
  final int unreadNotifications;
  final String? todayStatus;
  final String? todayCheckIn;
  final String? todayCheckOut;
  final List<AnnouncementModel> recentAnnouncements;
  final List<EventModel> upcomingEvents;

  const DashboardStatsModel({
    this.totalStaff = 0,
    required this.pendingLeaves,
    required this.pendingTasks,
    required this.pendingApprovals,
    required this.unreadNotifications,
    this.todayStatus,
    this.todayCheckIn,
    this.todayCheckOut,
    required this.recentAnnouncements,
    required this.upcomingEvents,
  });

  factory DashboardStatsModel.fromJson(Map<String, dynamic> json) => DashboardStatsModel(
        totalStaff: json['total_staff'] as int? ?? 0,
        pendingLeaves: json['pending_leaves'] as int? ?? 0,
        pendingTasks: json['pending_tasks'] as int? ?? 0,
        pendingApprovals: json['pending_approvals'] as int? ?? 0,
        unreadNotifications: json['unread_notifications'] as int? ?? 0,
        todayStatus: json['today_status'] as String?,
        todayCheckIn: json['today_check_in'] as String?,
        todayCheckOut: json['today_check_out'] as String?,
        recentAnnouncements: (json['recent_announcements'] as List<dynamic>?)
                ?.map((e) => AnnouncementModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        upcomingEvents: (json['upcoming_events'] as List<dynamic>?)
                ?.map((e) => EventModel.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );

  Map<String, dynamic> toJson() => {
        'total_staff': totalStaff,
        'pending_leaves': pendingLeaves,
        'pending_tasks': pendingTasks,
        'pending_approvals': pendingApprovals,
        'unread_notifications': unreadNotifications,
        'today_status': todayStatus,
        'today_check_in': todayCheckIn,
        'today_check_out': todayCheckOut,
        'recent_announcements': recentAnnouncements.map((e) => e.toJson()).toList(),
        'upcoming_events': upcomingEvents.map((e) => e.toJson()).toList(),
      };

  DashboardStatsModel copyWith({
    int? totalStaff,
    int? pendingLeaves,
    int? pendingTasks,
    int? pendingApprovals,
    int? unreadNotifications,
    String? todayStatus,
    String? todayCheckIn,
    String? todayCheckOut,
    List<AnnouncementModel>? recentAnnouncements,
    List<EventModel>? upcomingEvents,
  }) =>
      DashboardStatsModel(
        totalStaff: totalStaff ?? this.totalStaff,
        pendingLeaves: pendingLeaves ?? this.pendingLeaves,
        pendingTasks: pendingTasks ?? this.pendingTasks,
        pendingApprovals: pendingApprovals ?? this.pendingApprovals,
        unreadNotifications: unreadNotifications ?? this.unreadNotifications,
        todayStatus: todayStatus ?? this.todayStatus,
        todayCheckIn: todayCheckIn ?? this.todayCheckIn,
        todayCheckOut: todayCheckOut ?? this.todayCheckOut,
        recentAnnouncements: recentAnnouncements ?? this.recentAnnouncements,
        upcomingEvents: upcomingEvents ?? this.upcomingEvents,
      );
}
