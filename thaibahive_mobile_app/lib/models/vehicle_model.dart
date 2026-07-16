class VehicleModel {
  final String id;
  final String name;
  final String registrationNumber;
  final String type;
  final String? model;
  final int capacity;
  final String status;
  final String? fuelType;
  final String? notes;
  final DateTime createdAt;

  const VehicleModel({
    required this.id,
    required this.name,
    required this.registrationNumber,
    required this.type,
    this.model,
    required this.capacity,
    required this.status,
    this.fuelType,
    this.notes,
    required this.createdAt,
  });

  factory VehicleModel.fromJson(Map<String, dynamic> json) => VehicleModel(
        id: json['id'] as String,
        name: json['name'] as String,
        registrationNumber: json['registration_number'] as String,
        type: json['type'] as String,
        model: json['model'] as String?,
        capacity: json['capacity'] as int,
        status: json['status'] as String,
        fuelType: json['fuel_type'] as String?,
        notes: json['notes'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'registration_number': registrationNumber,
        'type': type,
        'model': model,
        'capacity': capacity,
        'status': status,
        'fuel_type': fuelType,
        'notes': notes,
        'created_at': createdAt.toIso8601String(),
      };
}

class VehicleBookingModel {
  final String id;
  final String vehicleId;
  final String? vehicleName;
  final String purpose;
  final String? destination;
  final DateTime startTime;
  final DateTime endTime;
  final String status;
  final String userId;
  final String? userName;
  final DateTime createdAt;

  const VehicleBookingModel({
    required this.id,
    required this.vehicleId,
    this.vehicleName,
    required this.purpose,
    this.destination,
    required this.startTime,
    required this.endTime,
    required this.status,
    required this.userId,
    this.userName,
    required this.createdAt,
  });

  factory VehicleBookingModel.fromJson(Map<String, dynamic> json) =>
      VehicleBookingModel(
        id: json['id'] as String,
        vehicleId: json['vehicle_id'] as String,
        vehicleName: json['vehicle_name'] as String?,
        purpose: json['purpose'] as String,
        destination: json['destination'] as String?,
        startTime: DateTime.parse(json['start_time'] as String),
        endTime: DateTime.parse(json['end_time'] as String),
        status: json['status'] as String,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'vehicle_id': vehicleId,
        'vehicle_name': vehicleName,
        'purpose': purpose,
        'destination': destination,
        'start_time': startTime.toIso8601String(),
        'end_time': endTime.toIso8601String(),
        'status': status,
        'user_id': userId,
        'user_name': userName,
        'created_at': createdAt.toIso8601String(),
      };
}

class VehicleLogModel {
  final String id;
  final String vehicleId;
  final String? vehicleName;
  final String logType;
  final String description;
  final double? cost;
  final double? odometerReading;
  final String userId;
  final String? userName;
  final DateTime createdAt;

  const VehicleLogModel({
    required this.id,
    required this.vehicleId,
    this.vehicleName,
    required this.logType,
    required this.description,
    this.cost,
    this.odometerReading,
    required this.userId,
    this.userName,
    required this.createdAt,
  });

  factory VehicleLogModel.fromJson(Map<String, dynamic> json) =>
      VehicleLogModel(
        id: json['id'] as String,
        vehicleId: json['vehicle_id'] as String,
        vehicleName: json['vehicle_name'] as String?,
        logType: json['log_type'] as String,
        description: json['description'] as String,
        cost: (json['cost'] as num?)?.toDouble(),
        odometerReading: (json['odometer_reading'] as num?)?.toDouble(),
        userId: json['user_id'] as String,
        userName: json['user_name'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'vehicle_id': vehicleId,
        'vehicle_name': vehicleName,
        'log_type': logType,
        'description': description,
        'cost': cost,
        'odometer_reading': odometerReading,
        'user_id': userId,
        'user_name': userName,
        'created_at': createdAt.toIso8601String(),
      };
}
