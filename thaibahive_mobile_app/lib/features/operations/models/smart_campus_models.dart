class SmartCampusSummary {
  final double energySavedKwh;
  final int activeDispatches;
  final int biometricPunches;
  final double cloudCostSavingsDollars;
  final double renewableEnergyRatioPercent;

  SmartCampusSummary({
    required this.energySavedKwh,
    required this.activeDispatches,
    required this.biometricPunches,
    required this.cloudCostSavingsDollars,
    required this.renewableEnergyRatioPercent,
  });

  factory SmartCampusSummary.fromJson(Map<String, dynamic> json) {
    return SmartCampusSummary(
      energySavedKwh: (json['energySavedKwh'] as num?)?.toDouble() ?? 0.0,
      activeDispatches: (json['activeDispatches'] as num?)?.toInt() ?? 0,
      biometricPunches: (json['biometricPunches'] as num?)?.toInt() ?? 0,
      cloudCostSavingsDollars: (json['cloudCostSavingsDollars'] as num?)?.toDouble() ?? 0.0,
      renewableEnergyRatioPercent: (json['renewableEnergyRatioPercent'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class MobileSharedResource {
  final String resourceId;
  final String campusId;
  final String name;
  final String category;
  final int capacityUnits;
  final double hourlyCostRateDollars;

  MobileSharedResource({
    required this.resourceId,
    required this.campusId,
    required this.name,
    required this.category,
    required this.capacityUnits,
    required this.hourlyCostRateDollars,
  });

  factory MobileSharedResource.fromJson(Map<String, dynamic> json) {
    return MobileSharedResource(
      resourceId: json['resourceId'] as String? ?? '',
      campusId: json['campusId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? 'GENERAL',
      capacityUnits: (json['capacityUnits'] as num?)?.toInt() ?? 1,
      hourlyCostRateDollars: (json['hourlyCostRateDollars'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
