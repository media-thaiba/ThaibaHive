// Alumni Models for Flutter Mobile ALUMNI-HUB (Sprint-058 - ALUM-017)

class MobileAlumniProfile {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final int graduationBatchYear;
  final String primaryDepartment;
  final String primaryDegree;
  final String? currentCompany;
  final String? currentDesignation;
  final String? credentialHash;
  final bool isVerified;
  final bool isMentor;
  final bool isHiring;

  const MobileAlumniProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.graduationBatchYear,
    required this.primaryDepartment,
    required this.primaryDegree,
    this.currentCompany,
    this.currentDesignation,
    this.credentialHash,
    required this.isVerified,
    required this.isMentor,
    required this.isHiring,
  });

  factory MobileAlumniProfile.fromJson(Map<String, dynamic> json) {
    return MobileAlumniProfile(
      id: json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'] ?? '',
      graduationBatchYear: (json['graduationBatchYear'] as num?)?.toInt() ?? 2024,
      primaryDepartment: json['primaryDepartment'] ?? '',
      primaryDegree: json['primaryDegree'] ?? '',
      currentCompany: json['currentCompany'],
      currentDesignation: json['currentDesignation'],
      credentialHash: json['credentialHash'],
      isVerified: json['isVerified'] ?? false,
      isMentor: json['isMentor'] ?? false,
      isHiring: json['isHiring'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'graduationBatchYear': graduationBatchYear,
      'primaryDepartment': primaryDepartment,
      'primaryDegree': primaryDegree,
      'currentCompany': currentCompany,
      'currentDesignation': currentDesignation,
      'credentialHash': credentialHash,
      'isVerified': isVerified,
      'isMentor': isMentor,
      'isHiring': isHiring,
    };
  }
}

class MobileMentorMatch {
  final String mentorProfileId;
  final String mentorName;
  final String? mentorCompany;
  final String? mentorDesignation;
  final String? mentorIndustry;
  final double averageRating;
  final double compatibilityScore;
  final String explanation;

  const MobileMentorMatch({
    required this.mentorProfileId,
    required this.mentorName,
    this.mentorCompany,
    this.mentorDesignation,
    this.mentorIndustry,
    required this.averageRating,
    required this.compatibilityScore,
    required this.explanation,
  });

  factory MobileMentorMatch.fromJson(Map<String, dynamic> json) {
    return MobileMentorMatch(
      mentorProfileId: json['mentorProfileId'] ?? '',
      mentorName: json['mentorName'] ?? '',
      mentorCompany: json['mentorCompany'],
      mentorDesignation: json['mentorDesignation'],
      mentorIndustry: json['mentorIndustry'],
      averageRating: (json['averageRating'] as num?)?.toDouble() ?? 5.0,
      compatibilityScore: (json['compatibilityScore'] as num?)?.toDouble() ?? 0.8,
      explanation: json['explanation'] ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'mentorProfileId': mentorProfileId,
      'mentorName': mentorName,
      'mentorCompany': mentorCompany,
      'mentorDesignation': mentorDesignation,
      'mentorIndustry': mentorIndustry,
      'averageRating': averageRating,
      'compatibilityScore': compatibilityScore,
      'explanation': explanation,
    };
  }
}

class MobileEventPass {
  final String ticketNumber;
  final String eventId;
  final String eventTitle;
  final String attendeeName;
  final String ticketPassHash;
  final String qrPayload;
  final bool isCheckedIn;
  final String startDateTime;
  final String venue;

  const MobileEventPass({
    required this.ticketNumber,
    required this.eventId,
    required this.eventTitle,
    required this.attendeeName,
    required this.ticketPassHash,
    required this.qrPayload,
    required this.isCheckedIn,
    required this.startDateTime,
    required this.venue,
  });

  factory MobileEventPass.fromJson(Map<String, dynamic> json) {
    return MobileEventPass(
      ticketNumber: json['ticketNumber'] ?? '',
      eventId: json['eventId'] ?? '',
      eventTitle: json['eventTitle'] ?? 'Alumni Homecoming Event',
      attendeeName: json['attendeeName'] ?? '',
      ticketPassHash: json['ticketPassHash'] ?? '',
      qrPayload: json['qrPayload'] ?? '',
      isCheckedIn: json['isCheckedIn'] ?? false,
      startDateTime: json['startDateTime'] ?? '',
      venue: json['venue'] ?? 'Campus Main Grounds',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'ticketNumber': ticketNumber,
      'eventId': eventId,
      'eventTitle': eventTitle,
      'attendeeName': attendeeName,
      'ticketPassHash': ticketPassHash,
      'qrPayload': qrPayload,
      'isCheckedIn': isCheckedIn,
      'startDateTime': startDateTime,
      'venue': venue,
    };
  }
}
