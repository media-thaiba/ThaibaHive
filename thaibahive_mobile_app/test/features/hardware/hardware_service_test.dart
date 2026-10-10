import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/features/hardware/models/hardware_models.dart';
import 'package:thaibahive_mobile/features/hardware/providers/hardware_provider.dart';

void main() {
  group('Hardware Models & Deserialization Tests', () {
    test('HardwareZoneModel deserializes from JSON correctly', () {
      final json = {
        'id': 'zone_main_gate',
        'name': 'Main Gate Entry',
        'type': 'gate',
        'floorNumber': 0,
        'isMusterPoint': true,
        'coordinatesX': 12.5,
        'coordinatesY': 45.2,
      };

      final model = HardwareZoneModel.fromJson(json);

      expect(model.id, equals('zone_main_gate'));
      expect(model.name, equals('Main Gate Entry'));
      expect(model.type, equals('gate'));
      expect(model.floorNumber, equals(0));
      expect(model.isMusterPoint, isTrue);
      expect(model.coordinatesX, equals(12.5));
      expect(model.coordinatesY, equals(45.2));
    });

    test('GateVerificationResult deserializes from JSON correctly', () {
      final json = {
        'granted': true,
        'verificationResult': 'authorized',
        'eventId': 'evt_9921_access',
        'antiPassbackViolation': false,
        'emergencyOverride': false,
        'reason': null,
      };

      final result = GateVerificationResult.fromJson(json);

      expect(result.granted, isTrue);
      expect(result.verificationResult, equals('authorized'));
      expect(result.eventId, equals('evt_9921_access'));
      expect(result.antiPassbackViolation, isFalse);
    });

    test('MusterSummaryModel deserializes from JSON correctly', () {
      final json = {
        'totalOccupantsOnSite': 150,
        'accountedInMusterCount': 148,
        'missingOccupantsCount': 2,
        'evacuationPercentage': 98.66,
      };

      final muster = MusterSummaryModel.fromJson(json);

      expect(muster.totalOccupantsOnSite, equals(150));
      expect(muster.accountedInMusterCount, equals(148));
      expect(muster.missingOccupantsCount, equals(2));
      expect(muster.evacuationPercentage, equals(98.66));
    });

    test('PatrolState copyWith updates state accurately', () {
      const state = PatrolState(isScanning: false);
      final updated = state.copyWith(
        isScanning: true,
        recentScans: [
          const PatrolCheckpointScan(
            checkpointId: 'CP_01',
            zoneName: 'Gate A',
            scannedAt: '2026-10-10T12:00:00Z',
          ),
        ],
      );

      expect(updated.isScanning, isTrue);
      expect(updated.recentScans.length, equals(1));
      expect(updated.recentScans.first.checkpointId, equals('CP_01'));
    });
  });
}
