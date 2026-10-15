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
    // Server (drizzle rows) serializes camelCase; older fixtures used snake_case.
    return PresenceLog(
      id: (json['id'] ?? json['log_id']) as String? ?? '',
      attendanceId: (json['attendanceId'] ?? json['attendance_id']) as String,
      staffId: (json['staffId'] ?? json['staff_id']) as String? ?? '',
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      accuracy: (json['accuracy'] as num?)?.toDouble(),
      isWithinGeofence: (json['isWithinGeofence'] ?? json['is_within_geofence']) as bool? ?? true,
      isMockLocation: (json['isMockLocation'] ?? json['is_mock_location']) as bool? ?? false,
      wifiSsid: (json['wifiSsid'] ?? json['wifi_ssid']) as String?,
      verificationMethod:
          (json['verificationMethod'] ?? json['verification_method']) as String? ?? 'gps',
      distanceFromOffice:
          ((json['distanceFromOffice'] ?? json['distance_from_office']) as num?)?.toDouble(),
      networkState: (json['networkState'] ?? json['network_state']) as String? ?? 'online',
      batteryLevel: (json['batteryLevel'] ?? json['battery_level']) as int?,
      createdAt: (json['createdAt'] ?? json['created_at']) as String? ?? '',
    );
  }

  /// Matches `presenceLogEntrySchema` (camelCase) — unknown fields
  /// (id/staffId/createdAt) are stripped server-side by Zod.
  Map<String, dynamic> toJson() => {
        'attendanceId': attendanceId,
        'latitude': latitude,
        'longitude': longitude,
        'accuracy': accuracy,
        'isWithinGeofence': isWithinGeofence,
        'isMockLocation': isMockLocation,
        'wifiSsid': wifiSsid,
        'verificationMethod': verificationMethod,
        'distanceFromOffice': distanceFromOffice,
        'networkState': networkState,
        'batteryLevel': batteryLevel,
        'staffId': staffId,
        'id': id,
        'createdAt': createdAt,
      };
}
