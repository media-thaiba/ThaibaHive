import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/app/capability_registry.dart';

void main() {
  group('capability registry (D7*)', () {
    test('media.asset.view is granted to registry roles', () {
      for (final role in [
        'staff',
        'teacher',
        'hod',
        'principal',
        'admin',
        'super_admin',
        'accounts',
        'purchase',
      ]) {
        expect(hasCapability(role, 'media.asset.view'), isTrue,
            reason: '$role should hold media.asset.view');
      }
    });

    test('media.asset.view excludes roles outside the registry set', () {
      expect(hasCapability('coordinator', 'media.asset.view'), isFalse);
      expect(hasCapability('student', 'media.asset.view'), isFalse);
    });

    test('media.asset.capture includes coordinator (mirrors web registry)', () {
      expect(hasCapability('coordinator', 'media.asset.capture'), isTrue);
      expect(hasCapability('hod', 'media.asset.capture'), isFalse);
    });

    test('unknown capability ids always resolve to false', () {
      expect(hasCapability('media.asset.create', 'media.asset.create'), isFalse,
          reason: 'media.asset.create does not exist in CAPABILITY_REGISTRY');
      expect(hasCapability('super_admin', 'totally.unknown.cap'), isFalse);
    });

    test('null and empty roles never hold a capability', () {
      expect(hasCapability(null, 'media.asset.view'), isFalse);
      expect(hasCapability('', 'media.asset.view'), isFalse);
    });
  });
}
