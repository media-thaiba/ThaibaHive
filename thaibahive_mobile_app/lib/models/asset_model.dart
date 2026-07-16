class AssetServiceRecord {
  final String id;
  final String assetId;
  final String description;
  final DateTime serviceDate;
  final double? cost;
  final String? performedBy;
  final DateTime createdAt;

  const AssetServiceRecord({
    required this.id,
    required this.assetId,
    required this.description,
    required this.serviceDate,
    this.cost,
    this.performedBy,
    required this.createdAt,
  });

  factory AssetServiceRecord.fromJson(Map<String, dynamic> json) =>
      AssetServiceRecord(
        id: json['id'] as String,
        assetId: json['asset_id'] as String,
        description: json['description'] as String,
        serviceDate: DateTime.parse(json['service_date'] as String),
        cost: (json['cost'] as num?)?.toDouble(),
        performedBy: json['performed_by'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'asset_id': assetId,
        'description': description,
        'service_date': serviceDate.toIso8601String(),
        'cost': cost,
        'performed_by': performedBy,
        'created_at': createdAt.toIso8601String(),
      };
}

class AssetModel {
  final String id;
  final String name;
  final String type;
  final String? serialNumber;
  final String? modelNumber;
  final String? manufacturer;
  final String? location;
  final String status;
  final DateTime? purchaseDate;
  final double? purchaseCost;
  final String? assignedToId;
  final String? assignedToName;
  final String? notes;
  final List<AssetServiceRecord> serviceHistory;
  final String createdById;
  final DateTime createdAt;
  final DateTime updatedAt;

  const AssetModel({
    required this.id,
    required this.name,
    required this.type,
    this.serialNumber,
    this.modelNumber,
    this.manufacturer,
    this.location,
    required this.status,
    this.purchaseDate,
    this.purchaseCost,
    this.assignedToId,
    this.assignedToName,
    this.notes,
    this.serviceHistory = const [],
    required this.createdById,
    required this.createdAt,
    required this.updatedAt,
  });

  factory AssetModel.fromJson(Map<String, dynamic> json) => AssetModel(
        id: json['id'] as String,
        name: json['name'] as String,
        type: json['type'] as String,
        serialNumber: json['serial_number'] as String?,
        modelNumber: json['model_number'] as String?,
        manufacturer: json['manufacturer'] as String?,
        location: json['location'] as String?,
        status: json['status'] as String,
        purchaseDate: json['purchase_date'] != null
            ? DateTime.parse(json['purchase_date'] as String)
            : null,
        purchaseCost: (json['purchase_cost'] as num?)?.toDouble(),
        assignedToId: json['assigned_to_id'] as String?,
        assignedToName: json['assigned_to_name'] as String?,
        notes: json['notes'] as String?,
        serviceHistory: (json['service_history'] as List<dynamic>?)
                ?.map((e) =>
                    AssetServiceRecord.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        createdById: json['created_by_id'] as String,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'serial_number': serialNumber,
        'model_number': modelNumber,
        'manufacturer': manufacturer,
        'location': location,
        'status': status,
        'purchase_date': purchaseDate?.toIso8601String(),
        'purchase_cost': purchaseCost,
        'assigned_to_id': assignedToId,
        'assigned_to_name': assignedToName,
        'notes': notes,
        'service_history': serviceHistory.map((e) => e.toJson()).toList(),
        'created_by_id': createdById,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}
