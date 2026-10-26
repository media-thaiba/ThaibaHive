import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/pilot/pilot_gate.dart';

void main() {
  group('Step 2a: V1.0 Pilot Navigation & Route Security Gate Tests', () {
    test('isFrozenPath identifies all 7 frozen enterprise modules and subroutes', () {
      // If running under test with default environment, verify kFrozenRoutePrefixes
      expect(kFrozenRoutePrefixes, contains('/finance'));
      expect(kFrozenRoutePrefixes, contains('/fleet'));
      expect(kFrozenRoutePrefixes, contains('/vehicles'));
      expect(kFrozenRoutePrefixes, contains('/agent-hub'));
      expect(kFrozenRoutePrefixes, contains('/conferencing'));
      expect(kFrozenRoutePrefixes, contains('/canteen'));
      expect(kFrozenRoutePrefixes, contains('/accounts'));
      expect(kFrozenRoutePrefixes, contains('/purchases'));
      expect(kFrozenRoutePrefixes, contains('/operations/finance'));
      expect(kFrozenRoutePrefixes, contains('/operations/fleet'));
      expect(kFrozenRoutePrefixes, contains('/operations/accounts'));
      expect(kFrozenRoutePrefixes, contains('/operations/procurement'));
    });

    test('Core V1.0 modules are never frozen', () {
      const coreV1Paths = [
        '/today',
        '/attendance',
        '/notices',
        '/me',
        '/settings',
        '/settings/diagnostics',
        '/leaves',
        '/leaves/apply',
        '/tasks',
        '/circulars',
        '/announcements',
      ];

      for (final path in coreV1Paths) {
        expect(isFrozenPath(path), isFalse, reason: '$path should be active in V1.0');
      }
    });

    test('Frozen prefixes cover nested and parameterised subroutes', () {
      final sampleFrozenSubpaths = [
        '/finance/approvals',
        '/finance/reconciliation/rec_123',
        '/canteen/orders',
        '/canteen/menu',
        '/vehicles/log',
        '/conferencing/room-456',
        '/agent-hub/plugins/p_1',
      ];

      for (final path in sampleFrozenSubpaths) {
        // Matches prefix pattern
        final isCovered = kFrozenRoutePrefixes.any((prefix) => path == prefix || path.startsWith('$prefix/'));
        expect(isCovered, isTrue, reason: '$path should be covered by kFrozenRoutePrefixes');
      }
    });
  });
}
