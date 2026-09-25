// Flutter State Models & Riverpod Providers for Microgrid & Net-Zero ESG (ECO-022)

import 'package:flutter_riverpod/flutter_riverpod.dart';

class CampusEnergySnapshot {
  final double totalSolarKw;
  final double totalFacilityLoadKw;
  final double gridImportKw;
  final double bessDischargeKw;
  final double cleanEnergySharePercent;
  final double realtimeCarbonGrams;
  final String powerQualityStatus;

  const CampusEnergySnapshot({
    required this.totalSolarKw,
    required this.totalFacilityLoadKw,
    required this.gridImportKw,
    required this.bessDischargeKw,
    required this.cleanEnergySharePercent,
    required this.realtimeCarbonGrams,
    required this.powerQualityStatus,
  });

  factory CampusEnergySnapshot.fromJson(Map<String, dynamic> json) {
    final solar = (json['totalSolarGenerationKw'] as num?)?.toDouble() ?? 0.0;
    final load = (json['totalFacilityLoadKw'] as num?)?.toDouble() ?? 1.0;
    final bess = (json['bessDischargeKw'] as num?)?.toDouble() ?? 0.0;

    final share = load > 0 ? (((solar + bess) / load) * 100).clamp(0.0, 100.0) : 0.0;

    return CampusEnergySnapshot(
      totalSolarKw: solar,
      totalFacilityLoadKw: load,
      gridImportKw: (json['gridImportKw'] as num?)?.toDouble() ?? 0.0,
      bessDischargeKw: bess,
      cleanEnergySharePercent: double.parse(share.toStringAsFixed(1)),
      realtimeCarbonGrams: (json['realtimeCarbonIntensityGrams'] as num?)?.toDouble() ?? 350.0,
      powerQualityStatus: json['powerQualityStatus'] ?? 'nominal',
    );
  }
}

class EvChargerStationItem {
  final String stationId;
  final String name;
  final String status; // 'available', 'charging', 'v2g_active', 'offline'
  final double maxPowerKw;
  final int availablePorts;
  final int totalPorts;
  final double tariffRatePerKwh;
  final bool isV2GSupported;

  const EvChargerStationItem({
    required this.stationId,
    required this.name,
    required this.status,
    required this.maxPowerKw,
    required this.availablePorts,
    required this.totalPorts,
    required this.tariffRatePerKwh,
    required this.isV2GSupported,
  });

  factory EvChargerStationItem.fromJson(Map<String, dynamic> json) {
    return EvChargerStationItem(
      stationId: json['stationId'] ?? '',
      name: json['name'] ?? '',
      status: json['status'] ?? 'available',
      maxPowerKw: (json['maxPowerKw'] as num?)?.toDouble() ?? 22.0,
      availablePorts: json['availablePorts'] ?? 2,
      totalPorts: json['totalPorts'] ?? 2,
      tariffRatePerKwh: (json['tariffRatePerKwh'] as num?)?.toDouble() ?? 0.16,
      isV2GSupported: json['isV2GSupported'] ?? true,
    );
  }
}

class StudentCarbonPassport {
  final int greenPoints;
  final double carbonSavedKg;
  final List<String> badges;
  final int streakDays;

  const StudentCarbonPassport({
    required this.greenPoints,
    required this.carbonSavedKg,
    required this.badges,
    required this.streakDays,
  });
}

class CampusEnergyNotifier extends StateNotifier<AsyncValue<CampusEnergySnapshot>> {
  CampusEnergyNotifier()
      : super(const AsyncValue.data(CampusEnergySnapshot(
          totalSolarKw: 245.5,
          totalFacilityLoadKw: 310.0,
          gridImportKw: 42.5,
          bessDischargeKw: 22.0,
          cleanEnergySharePercent: 86.3,
          realtimeCarbonGrams: 145.0,
          powerQualityStatus: 'nominal',
        )));

  void updateSnapshot(CampusEnergySnapshot snapshot) {
    state = AsyncValue.data(snapshot);
  }
}

final campusEnergyProvider =
    StateNotifierProvider<CampusEnergyNotifier, AsyncValue<CampusEnergySnapshot>>((ref) {
  return CampusEnergyNotifier();
});

final evStationsProvider = Provider<List<EvChargerStationItem>>((ref) {
  return const [
    EvChargerStationItem(
      stationId: 'evse_hub_01',
      name: 'North Campus EV Hub Port 1-4',
      status: 'available',
      maxPowerKw: 50.0,
      availablePorts: 3,
      totalPorts: 4,
      tariffRatePerKwh: 0.08,
      isV2GSupported: true,
    ),
    EvChargerStationItem(
      stationId: 'evse_hub_02',
      name: 'Engineering Faculty EVSE Port 1-2',
      status: 'charging',
      maxPowerKw: 22.0,
      availablePorts: 1,
      totalPorts: 2,
      tariffRatePerKwh: 0.16,
      isV2GSupported: true,
    ),
    EvChargerStationItem(
      stationId: 'evse_hub_03',
      name: 'Transit Depot V2G Bus Port 1-2',
      status: 'v2g_active',
      maxPowerKw: 100.0,
      availablePorts: 0,
      totalPorts: 2,
      tariffRatePerKwh: 0.32,
      isV2GSupported: true,
    ),
  ];
});

final carbonPassportProvider = StateProvider<StudentCarbonPassport>((ref) {
  return const StudentCarbonPassport(
    greenPoints: 420,
    carbonSavedKg: 18.5,
    badges: ['Solar Pioneer', 'Clean Commuter', '7-Day Streak'],
    streakDays: 7,
  );
});
