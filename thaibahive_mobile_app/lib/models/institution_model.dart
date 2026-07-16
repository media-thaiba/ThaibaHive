class InstitutionModel {
  final String id;
  final String name;
  final String code;
  final String type;
  final String? address;
  final String? phone;
  final String? email;
  final bool isActive;

  const InstitutionModel({
    required this.id,
    required this.name,
    required this.code,
    required this.type,
    this.address,
    this.phone,
    this.email,
    required this.isActive,
  });

  factory InstitutionModel.fromJson(Map<String, dynamic> json) => InstitutionModel(
        id: json['id'] as String,
        name: json['name'] as String,
        code: json['code'] as String,
        type: json['type'] as String,
        address: json['address'] as String?,
        phone: json['phone'] as String?,
        email: json['email'] as String?,
        isActive: json['is_active'] as bool,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'code': code,
        'type': type,
        'address': address,
        'phone': phone,
        'email': email,
        'is_active': isActive,
      };

  InstitutionModel copyWith({
    String? id,
    String? name,
    String? code,
    String? type,
    String? address,
    String? phone,
    String? email,
    bool? isActive,
  }) =>
      InstitutionModel(
        id: id ?? this.id,
        name: name ?? this.name,
        code: code ?? this.code,
        type: type ?? this.type,
        address: address ?? this.address,
        phone: phone ?? this.phone,
        email: email ?? this.email,
        isActive: isActive ?? this.isActive,
      );
}
