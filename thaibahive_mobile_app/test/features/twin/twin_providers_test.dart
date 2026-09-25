// Flutter unit tests for Digital Twin Providers & State (TWIN-022)

import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/twin/application/twin_providers.dart';

void main() {
  group('Digital Twin Mobile State & Models', () {
    test('SpaceComfortItem should parse from JSON correctly', () {
      final json = {
        'spaceId': 'SPC-101',
        'code': 'ROB-101',
        'name': 'Robotics Lab',
        'facility': 'Science Hall',
        'floorLevel': 1,
        'capacity': 30,
        'currentOccupancy': 12,
        'comfortScore': 94.5,
        'tempC': 22.4,
        'co2Ppm': 480,
        'noiseDb': 41.2,
        'isAvailable': true,
      };

      final item = SpaceComfortItem.fromJson(json);
      expect(item.spaceId, 'SPC-101');
      expect(item.code, 'ROB-101');
      expect(item.comfortScore, 94.5);
      expect(item.tempC, 22.4);
      expect(item.isAvailable, true);
    });

    test('TwinMapState copyWith should update floor and list', () {
      const state = TwinMapState(selectedFloor: 1);
      final updated = state.copyWith(selectedFloor: 2);
      expect(updated.selectedFloor, 2);
    });
  });
}
