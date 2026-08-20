import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile_app/features/operations/models/smart_campus_models.dart';

void main() {
  group('AIMS-026 — Mobile Smart Campus Models & Serialization', () {
    test('should correctly instantiate and parse SmartCampusSummary from JSON', () {
      final json = {
        'energySavedKwh': 345.5,
        'activeDispatches': 3,
        'biometricPunches': 142,
        'cloudCostSavingsDollars': 650.0,
        'renewableEnergyRatioPercent': 48.0,
      };

      final summary = SmartCampusSummary.fromJson(json);

      expect(summary.energySavedKwh, 345.5);
      expect(summary.activeDispatches, 3);
      expect(summary.biometricPunches, 142);
      expect(summary.cloudCostSavingsDollars, 650.0);
      expect(summary.renewableEnergyRatioPercent, 48.0);
    });

    test('should correctly instantiate and parse MobileSharedResource from JSON', () {
      final json = {
        'resourceId': 'res_vr_sim',
        'campusId': 'campus_main',
        'name': 'VR Surgical Simulation Center',
        'category': 'SPECIALIZED_EQUIPMENT',
        'capacityUnits': 20,
        'hourlyCostRateDollars': 60.0,
      };

      final resource = MobileSharedResource.fromJson(json);

      expect(resource.resourceId, 'res_vr_sim');
      expect(resource.campusId, 'campus_main');
      expect(resource.name, 'VR Surgical Simulation Center');
      expect(resource.category, 'SPECIALIZED_EQUIPMENT');
      expect(resource.capacityUnits, 20);
      expect(resource.hourlyCostRateDollars, 60.0);
    });
  });
}
