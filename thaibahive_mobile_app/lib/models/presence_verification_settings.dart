class PresenceVerificationSettings {
  final String? id;
  final String? institutionId;
  final bool isEnabled;
  final bool shadowMode;
  final int checkIntervalMinutes;
  final int gracePeriodMinutes;
  final bool autoCheckoutOnViolation;
  final int geofenceRadiusMeters;
  final int lowBatteryIntervalMinutes;
  final bool criticalBatterySuspend;

  const PresenceVerificationSettings({
    this.id,
    this.institutionId,
    this.isEnabled = true,
    this.shadowMode = true,
    this.checkIntervalMinutes = 10,
    this.gracePeriodMinutes = 5,
    this.autoCheckoutOnViolation = false,
    this.geofenceRadiusMeters = 150,
    this.lowBatteryIntervalMinutes = 15,
    this.criticalBatterySuspend = true,
  });

  factory PresenceVerificationSettings.fromJson(Map<String, dynamic> json) {
    // The settings API serializes camelCase (drizzle row properties);
    // snake_case keys are accepted as a fallback for raw-row payloads.
    bool readBool(String camel, String snake, bool fallback) =>
        (json[camel] ?? json[snake]) as bool? ?? fallback;
    int readInt(String camel, String snake, int fallback) =>
        (json[camel] ?? json[snake]) as int? ?? fallback;

    return PresenceVerificationSettings(
      id: json['id'] as String?,
      institutionId: (json['institutionId'] ?? json['institution_id']) as String?,
      isEnabled: readBool('isEnabled', 'is_enabled', true),
      shadowMode: readBool('shadowMode', 'shadow_mode', true),
      checkIntervalMinutes: readInt('checkIntervalMinutes', 'check_interval_minutes', 10),
      gracePeriodMinutes: readInt('gracePeriodMinutes', 'grace_period_minutes', 5),
      autoCheckoutOnViolation:
          readBool('autoCheckoutOnViolation', 'auto_checkout_on_violation', false),
      geofenceRadiusMeters:
          readInt('geofenceRadiusMeters', 'geofence_radius_meters', 150),
      lowBatteryIntervalMinutes:
          readInt('lowBatteryIntervalMinutes', 'low_battery_interval_minutes', 15),
      criticalBatterySuspend:
          readBool('criticalBatterySuspend', 'critical_battery_suspend', true),
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'institutionId': institutionId,
        'isEnabled': isEnabled,
        'shadowMode': shadowMode,
        'checkIntervalMinutes': checkIntervalMinutes,
        'gracePeriodMinutes': gracePeriodMinutes,
        'autoCheckoutOnViolation': autoCheckoutOnViolation,
        'geofenceRadiusMeters': geofenceRadiusMeters,
        'lowBatteryIntervalMinutes': lowBatteryIntervalMinutes,
        'criticalBatterySuspend': criticalBatterySuspend,
      };
}
