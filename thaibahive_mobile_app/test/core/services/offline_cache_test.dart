import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/services/offline_cache_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async => '.',
    );
  });

  group('OfflineCacheService Unit Tests', () {
    test('OfflineCacheService is a singleton instance', () {
      final instance1 = OfflineCacheService();
      final instance2 = OfflineCacheService();
      expect(identical(instance1, instance2), isTrue);
    });

    test('getCache returns null for uninitialized or missing keys', () async {
      final cache = await offlineCacheService.getCache('non_existent_key_test');
      expect(cache, isNull);
    });
  });
}
