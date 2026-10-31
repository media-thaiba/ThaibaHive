class AttendanceLogModel {
  final String id;
  final String staffId;
  final String date;
  final String? checkIn;
  final String? checkOut;
  final String method;
  final String? nfcTagId;
  final String? qrCode;
  final String status;
  final int? workedMinutes;
  final int? lateMinutes;
  final int? earlyExitMinutes;
  final String? notes;

  const AttendanceLogModel({
    required this.id,
    required this.staffId,
    required this.date,
    this.checkIn,
    this.checkOut,
    required this.method,
    this.nfcTagId,
    this.qrCode,
    required this.status,
    this.workedMinutes,
    this.lateMinutes,
    this.earlyExitMinutes,
    this.notes,
  });

  factory AttendanceLogModel.fromJson(Map<String, dynamic> json) => AttendanceLogModel(
        id: (json['id'] as String?) ?? '',
        staffId: (json['staff_id'] as String?) ?? '',
        date: (json['date'] as String?) ?? '',
        checkIn: json['check_in'] as String?,
        checkOut: json['check_out'] as String?,
        method: (json['method'] as String?) ?? 'manual',
        nfcTagId: json['nfc_tag_id'] as String?,
        qrCode: json['qr_code'] as String?,
        status: (json['status'] as String?) ?? 'absent',
        workedMinutes: json['worked_minutes'] as int?,
        lateMinutes: json['late_minutes'] as int?,
        earlyExitMinutes: json['early_exit_minutes'] as int?,
        notes: json['notes'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'staff_id': staffId,
        'date': date,
        'check_in': checkIn,
        'check_out': checkOut,
        'method': method,
        'nfc_tag_id': nfcTagId,
        'qr_code': qrCode,
        'status': status,
        'worked_minutes': workedMinutes,
        'late_minutes': lateMinutes,
        'early_exit_minutes': earlyExitMinutes,
        'notes': notes,
      };

  AttendanceLogModel copyWith({
    String? id,
    String? staffId,
    String? date,
    String? checkIn,
    String? checkOut,
    String? method,
    String? nfcTagId,
    String? qrCode,
    String? status,
    int? workedMinutes,
    int? lateMinutes,
    int? earlyExitMinutes,
    String? notes,
  }) =>
      AttendanceLogModel(
        id: id ?? this.id,
        staffId: staffId ?? this.staffId,
        date: date ?? this.date,
        checkIn: checkIn ?? this.checkIn,
        checkOut: checkOut ?? this.checkOut,
        method: method ?? this.method,
        nfcTagId: nfcTagId ?? this.nfcTagId,
        qrCode: qrCode ?? this.qrCode,
        status: status ?? this.status,
        workedMinutes: workedMinutes ?? this.workedMinutes,
        lateMinutes: lateMinutes ?? this.lateMinutes,
        earlyExitMinutes: earlyExitMinutes ?? this.earlyExitMinutes,
        notes: notes ?? this.notes,
      );
}

class AttendanceStatsModel {
  final String? todayStatus;
  final String? lastCheckIn;
  final String? lastCheckOut;
  final int presentDays;
  final int absentDays;
  final int lateDays;
  final int halfDays;
  final double totalWorkedHours;

  /// Latest immutable attendance event of the day: 'in' | 'out' | null.
  final String? latestEvent;

  /// True when the most recent event is a check-in (active shift / overtime).
  final bool? isOnShift;

  /// Epoch ms of the latest attendance event.
  final int? latestEventAt;

  /// Assigned shift group name (e.g. 'General Shift', 'Morning Shift').
  final String? shiftName;

  /// 24h start time ('HH:mm') e.g. '09:00'.
  final String? shiftStartTime;

  /// 24h end time ('HH:mm') e.g. '17:00'.
  final String? shiftEndTime;

  const AttendanceStatsModel({
    this.todayStatus,
    this.lastCheckIn,
    this.lastCheckOut,
    this.presentDays = 0,
    this.absentDays = 0,
    this.lateDays = 0,
    this.halfDays = 0,
    this.totalWorkedHours = 0.0,
    this.latestEvent,
    this.isOnShift,
    this.latestEventAt,
    this.shiftName,
    this.shiftStartTime,
    this.shiftEndTime,
  });

  factory AttendanceStatsModel.fromJson(Map<String, dynamic> json) {
    final lastCheckIn = json['last_check_in'] as String?;
    final lastCheckOut = json['last_check_out'] as String?;
    final shiftObj = json['shift'] as Map<String, dynamic>?;

    return AttendanceStatsModel(
      todayStatus: json['today_status'] as String?,
      lastCheckIn: lastCheckIn,
      lastCheckOut: lastCheckOut,
      presentDays: json['present_days'] as int? ?? 0,
      absentDays: json['absent_days'] as int? ?? 0,
      lateDays: json['late_days'] as int? ?? 0,
      halfDays: json['half_days'] as int? ?? 0,
      totalWorkedHours: (json['total_worked_hours'] as num?)?.toDouble() ?? 0.0,
      latestEvent: json['latest_event'] as String?,
      isOnShift: json['is_on_shift'] as bool? ??
          (lastCheckIn != null && lastCheckOut == null),
      latestEventAt: (json['latest_event_at'] as num?)?.toInt(),
      shiftName: shiftObj?['name'] as String?,
      shiftStartTime: shiftObj?['start_time'] as String?,
      shiftEndTime: shiftObj?['end_time'] as String?,
    );
  }
}
