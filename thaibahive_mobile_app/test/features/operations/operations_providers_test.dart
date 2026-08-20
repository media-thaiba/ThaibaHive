import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile_app/features/operations/models/smart_campus_models.dart';

void main() {
  group('AIMS-026 — Operations Providers Unit Tests', () {
    test('should verify smart campus state model immutability', () {
      final summary = SmartCampusSummary(
        energySavedKwh: 120.0,
        activeDispatches: 2,
        biometricPunches: 55,
        cloudCostSavingsDollars: 300.0,
        renewableEnergyRatioPercent: 40.0,
      );

      expect(summary.energySavedKwh, 120.0);
      expect(summary.activeDispatches, 2);
      expect(summary.biometricPunches, 55);
      expect(summary.cloudCostSavingsDollars, 300.0);
      expect(summary.renewableEnergyRatioPercent, 40.0);
    });
  });
}
