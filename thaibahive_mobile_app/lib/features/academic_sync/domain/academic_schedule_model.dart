// Academic Schedule Models for DOC-GEN & Mobile Sync (DOC-019)

class MobileTimetableSlot {
  final String slotId;
  final int dayOfWeek;
  final int slotOrder;
  final String startTime;
  final String endTime;
  final String subjectName;
  final String? teacherName;
  final String? roomNumber;
  final bool isSubstitution;
  final String? substituteTeacherName;

  const MobileTimetableSlot({
    required this.slotId,
    required this.dayOfWeek,
    required this.slotOrder,
    required this.startTime,
    required this.endTime,
    required this.subjectName,
    this.teacherName,
    this.roomNumber,
    this.isSubstitution = false,
    this.substituteTeacherName,
  });

  factory MobileTimetableSlot.fromJson(Map<String, dynamic> json) {
    return MobileTimetableSlot(
      slotId: json['slotId'] ?? '',
      dayOfWeek: (json['dayOfWeek'] as num?)?.toInt() ?? 1,
      slotOrder: (json['slotOrder'] as num?)?.toInt() ?? 1,
      startTime: json['startTime'] ?? '09:00 AM',
      endTime: json['endTime'] ?? '10:00 AM',
      subjectName: json['subjectName'] ?? 'Subject',
      teacherName: json['teacherName'],
      roomNumber: json['roomNumber'],
      isSubstitution: json['isSubstitution'] == true,
      substituteTeacherName: json['substituteTeacherName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'slotId': slotId,
      'dayOfWeek': dayOfWeek,
      'slotOrder': slotOrder,
      'startTime': startTime,
      'endTime': endTime,
      'subjectName': subjectName,
      'teacherName': teacherName,
      'roomNumber': roomNumber,
      'isSubstitution': isSubstitution,
      'substituteTeacherName': substituteTeacherName,
    };
  }
}

class MobileHallTicketItem {
  final String recordId;
  final String serialNumber;
  final String title;
  final String examName;
  final String examDate;
  final String seatNumber;
  final String hallNumber;
  final String documentHash;

  const MobileHallTicketItem({
    required this.recordId,
    required this.serialNumber,
    required this.title,
    required this.examName,
    required this.examDate,
    required this.seatNumber,
    required this.hallNumber,
    required this.documentHash,
  });

  factory MobileHallTicketItem.fromJson(Map<String, dynamic> json) {
    return MobileHallTicketItem(
      recordId: json['recordId'] ?? json['id'] ?? '',
      serialNumber: json['serialNumber'] ?? '',
      title: json['title'] ?? 'Hall Ticket',
      examName: json['examName'] ?? 'Term Examination',
      examDate: json['examDate'] ?? '2026-09-10',
      seatNumber: json['seatNumber'] ?? 'Seat 01',
      hallNumber: json['hallNumber'] ?? 'Hall A',
      documentHash: json['documentHash'] ?? '',
    );
  }
}
