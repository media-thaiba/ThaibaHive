class PresenceLog {
  final String id;
  final String attendanceId;
  final String staffId;
  final double latitude;
  final double longitude;
  final double? accuracy;
  final bool isWithinGeofence;
  final bool isMockLocation;
  final String? wifiSsid;
  final String verificationMethod;
  final double? distanceFromOffice;
  final String networkState;
  final int? batteryLevel;
  final String createdAt;

  const PresenceLog({
    required this.id,
    required this.attendanceId,
    required this.staffId,
    required this.latitude,
    required this.longitude,
    this.accuracy,
    required this.isWithinGeofence,
    required this.isMockLocation,
    this.wifiSsid,
    required this.verificationMethod,
    this.distanceFromOffice,
    required this.networkState,
    this.batteryLevel,
    required this.createdAt,
  });

  factory PresenceLog.fromJson(Map<String, dynamic> json) {
    return PresenceLog(
      id: json['id'] as String,
      attendanceId: json['attendance_id'] as String,
      staffId: json['staff_id'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      accuracy: (json['accuracy'] as num?)?.toDouble(),
      isWithinGeofence: json['is_within_geofence'] as bool? ?? true,
      isMockLocation: json['is_mock_location'] as bool? ?? false,
      wifiSsid: json['wifi_ssid'] as String?,
      verificationMethod: json['verification_method'] as String? ?? 'gps',
      distanceFromOffice: (json['distance_from_office'] as num?)?.toDouble(),
      networkState: json['network_state'] as String? ?? 'online',
      batteryLevel: json['battery_level'] as int?,
      createdAt: json['created_at'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'attendance_id': attendanceId,
    'staff_id': staffId,
    'latitude': latitude,
    'longitude': longitude,
    'accuracy': accuracy,
    'is_within_geofence': isWithinGeofence,
    'is_mock_location': isMockLocation,
    'wifi_ssid': wifiSsid,
    'verification_method': verificationMethod,
    'distance_from_office': distanceFromOffice,
    'network_state': networkState,
    'battery_level': batteryLevel,
    'created_at': createdAt,
  };
}
