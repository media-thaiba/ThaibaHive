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
    return PresenceVerificationSettings(
      id: json['id'] as String?,
      institutionId: json['institution_id'] as String?,
      isEnabled: json['is_enabled'] as bool? ?? true,
      shadowMode: json['shadow_mode'] as bool? ?? true,
      checkIntervalMinutes: json['check_interval_minutes'] as int? ?? 10,
      gracePeriodMinutes: json['grace_period_minutes'] as int? ?? 5,
      autoCheckoutOnViolation: json['auto_checkout_on_violation'] as bool? ?? false,
      geofenceRadiusMeters: json['geofence_radius_meters'] as int? ?? 150,
      lowBatteryIntervalMinutes: json['low_battery_interval_minutes'] as int? ?? 15,
      criticalBatterySuspend: json['critical_battery_suspend'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'institution_id': institutionId,
    'is_enabled': isEnabled,
    'shadow_mode': shadowMode,
    'check_interval_minutes': checkIntervalMinutes,
    'grace_period_minutes': gracePeriodMinutes,
    'auto_checkout_on_violation': autoCheckoutOnViolation,
    'geofence_radius_meters': geofenceRadiusMeters,
    'low_battery_interval_minutes': lowBatteryIntervalMinutes,
    'critical_battery_suspend': criticalBatterySuspend,
  };
}
