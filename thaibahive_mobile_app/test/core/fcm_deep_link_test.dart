import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:thaibahive_mobile/core/services/fcm_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
  });

  group('FCMService Deep Link & Allowlist Tests', () {
    test('validateAndWhitelistRoute allows all valid workspace and mobile routes', () {
      expect(
        FCMService.validateAndWhitelistRoute('/leaves/leave-123'),
        equals('/leaves/leave-123'),
      );
      expect(
        FCMService.validateAndWhitelistRoute('/my-work/tasks/task-456'),
        equals('/my-work/tasks/task-456'),
      );
      expect(
        FCMService.validateAndWhitelistRoute('/operations/media-library'),
        equals('/operations/media-library'),
      );
      expect(
        FCMService.validateAndWhitelistRoute('/school/academics/classes'),
        equals('/school/academics/classes'),
      );
      expect(
        FCMService.validateAndWhitelistRoute('/admin/roles'),
        equals('/admin/roles'),
      );
      expect(
        FCMService.validateAndWhitelistRoute('/handoff?path=%2Fadmin%2Fusers&title=Users'),
        equals('/handoff?path=%2Fadmin%2Fusers&title=Users'),
      );
      expect(
        FCMService.validateAndWhitelistRoute('/sync-status'),
        equals('/sync-status'),
      );
    });

    test('validateAndWhitelistRoute blocks unauthorized paths and open redirect payloads', () {
      expect(FCMService.validateAndWhitelistRoute('https://evil.com/login'), equals('/'));
      expect(FCMService.validateAndWhitelistRoute('//malicious.site'), equals('/'));
      expect(FCMService.validateAndWhitelistRoute('/unknown/unauthorized/path'), equals('/'));
      expect(FCMService.validateAndWhitelistRoute('javascript:alert(1)'), equals('/'));
      expect(FCMService.validateAndWhitelistRoute(''), equals('/'));
    });

    test('handleUriLink buffers custom scheme and universal links correctly', () async {
      // 1. Custom scheme
      await FCMService.handleUriLink(Uri.parse('thaibahive://operations/fleet'));
      const storage = FlutterSecureStorage();
      var pending = await storage.read(key: 'pending_deeplink_route');
      expect(pending, equals('/operations/fleet'));

      // 2. Universal link https://
      await FCMService.handleUriLink(Uri.parse('https://thaibahive.app/my-work/leaves?tab=pending'));
      pending = await storage.read(key: 'pending_deeplink_route');
      expect(pending, equals('/my-work/leaves?tab=pending'));
    });

    test('handleDeepLink handles typed notification payloads and explicit routes', () async {
      const storage = FlutterSecureStorage();

      // Typed payload
      await FCMService.handleDeepLink({'type': 'task', 'id': 't-777'});
      var pending = await storage.read(key: 'pending_deeplink_route');
      expect(pending, equals('/tasks/t-777'));

      // Explicit route payload
      await FCMService.handleDeepLink({'url': '/operations/bookings/create'});
      pending = await storage.read(key: 'pending_deeplink_route');
      expect(pending, equals('/operations/bookings/create'));
    });
  });
}
