class VisitorModel {
  final String id;
  final String name;
  final String phone;
  final String? email;
  final String? company;
  final String purpose;
  final String? idType;
  final String? idNumber;
  final String? vehicleNumber;
  final String status;
  final String? checkInById;
  final String? checkInByName;
  final String? hostName;
  final String? hostDepartment;
  final DateTime? checkedInAt;
  final DateTime? checkedOutAt;
  final DateTime createdAt;

  const VisitorModel({
    required this.id,
    required this.name,
    required this.phone,
    this.email,
    this.company,
    required this.purpose,
    this.idType,
    this.idNumber,
    this.vehicleNumber,
    required this.status,
    this.checkInById,
    this.checkInByName,
    this.hostName,
    this.hostDepartment,
    this.checkedInAt,
    this.checkedOutAt,
    required this.createdAt,
  });

  factory VisitorModel.fromJson(Map<String, dynamic> json) => VisitorModel(
        id: json['id'] as String,
        name: json['name'] as String,
        phone: json['phone'] as String,
        email: json['email'] as String?,
        company: json['company'] as String?,
        purpose: json['purpose'] as String,
        idType: json['id_type'] as String?,
        idNumber: json['id_number'] as String?,
        vehicleNumber: json['vehicle_number'] as String?,
        status: json['status'] as String,
        checkInById: json['check_in_by_id'] as String?,
        checkInByName: json['check_in_by_name'] as String?,
        hostName: json['host_name'] as String?,
        hostDepartment: json['host_department'] as String?,
        checkedInAt: json['checked_in_at'] != null
            ? DateTime.parse(json['checked_in_at'] as String)
            : null,
        checkedOutAt: json['checked_out_at'] != null
            ? DateTime.parse(json['checked_out_at'] as String)
            : null,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'phone': phone,
        'email': email,
        'company': company,
        'purpose': purpose,
        'id_type': idType,
        'id_number': idNumber,
        'vehicle_number': vehicleNumber,
        'status': status,
        'check_in_by_id': checkInById,
        'check_in_by_name': checkInByName,
        'host_name': hostName,
        'host_department': hostDepartment,
        'checked_in_at': checkedInAt?.toIso8601String(),
        'checked_out_at': checkedOutAt?.toIso8601String(),
        'created_at': createdAt.toIso8601String(),
      };
}
