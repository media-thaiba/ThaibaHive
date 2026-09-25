// Flutter unit tests for Microgrid & Net-Zero ESG Providers (ECO-022)

import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/eco/application/eco_providers.dart';

void main() {
  group('ECO-MESH Microgrid & Net-Zero Mobile State Models', () {
    test('CampusEnergySnapshot should parse from telemetry JSON correctly', () {
      final json = {
        'totalSolarGenerationKw': 245.5,
        'totalFacilityLoadKw': 310.0,
        'gridImportKw': 42.5,
        'bessDischargeKw': 22.0,
        'realtimeCarbonIntensityGrams': 145.0,
        'powerQualityStatus': 'nominal',
      };

      final snap = CampusEnergySnapshot.fromJson(json);
      expect(snap.totalSolarKw, 245.5);
      expect(snap.totalFacilityLoadKw, 310.0);
      expect(snap.cleanEnergySharePercent, 86.3);
      expect(snap.powerQualityStatus, 'nominal');
    });

    test('EvChargerStationItem should parse from JSON correctly', () {
      final json = {
        'stationId': 'evse_hub_01',
        'name': 'North Campus Hub',
        'status': 'v2g_active',
        'maxPowerKw': 50.0,
        'availablePorts': 2,
        'totalPorts': 4,
        'tariffRatePerKwh': 0.32,
        'isV2GSupported': true,
      };

      final station = EvChargerStationItem.fromJson(json);
      expect(station.stationId, 'evse_hub_01');
      expect(station.status, 'v2g_active');
      expect(station.isV2GSupported, true);
      expect(station.tariffRatePerKwh, 0.32);
    });

    test('StudentCarbonPassport should hold green points and earned badges', () {
      const passport = StudentCarbonPassport(
        greenPoints: 380,
        carbonSavedKg: 12.8,
        badges: ['Solar Pioneer', 'Clean Commuter'],
        streakDays: 5,
      );

      expect(passport.greenPoints, 380);
      expect(passport.badges.length, 2);
      expect(passport.streakDays, 5);
    });
  });
}
