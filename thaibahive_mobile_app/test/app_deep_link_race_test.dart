import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/app/app.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_repository.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/models/user_model.dart';
import 'package:thaibahive_mobile/shared/widgets/failed_sync_banner.dart';

class MockHttpClientAdapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    return ResponseBody.fromString(
      '{"leaves":[],"total":0,"balance":{}}',
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class FastRestoreAuthNotifier extends AuthNotifier {
  FastRestoreAuthNotifier(super.repository, super.storage) {
    // Synchronously set to authenticated before any frame or subscription
    state = AuthState(
      status: AuthStatus.authenticated,
      token: 'valid-test-token',
      user: UserModel(
        id: 'test-staff-id',
        email: 'staff@thaiba.edu',
        employeeId: 'EMP-001',
        firstName: 'Fast',
        lastName: 'Restore',
        role: 'staff',
        isActive: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
      ),
    );
  }

  void triggerStateChange(UserModel newUser) {
    state = state.copyWith(user: newUser);
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({
      'pending_deeplink_route': '/leaves',
      AppConstants.storageTokenKey: 'valid-test-token',
    });
    // The path_provider mock channel handler is required because flutter_secure_storage
    // and offline cache plugins probe platform storage directories during test initialization.
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async => '.',
    );
  });

  testWidgets(
    'Fast-restore race condition test: flushBufferedRoute fires when auth is ALREADY authenticated at subscription time',
    (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      const storage = FlutterSecureStorage();
      final mockApiClient = ApiClient();
      mockApiClient.dio.httpClientAdapter = MockHttpClientAdapter();

      // Pre-check storage has pending route
      final initialPending = await storage.read(key: 'pending_deeplink_route');
      expect(initialPending, '/leaves');

      // Mount app with synchronously pre-authenticated authProvider
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWithValue(mockApiClient),
            dioProvider.overrideWithValue(mockApiClient.dio),
            failedEventsCountProvider.overrideWith((ref) => Stream.value(0)),
            authProvider.overrideWith((ref) {
              final repo = ref.watch(authRepositoryProvider);
              return FastRestoreAuthNotifier(repo, storage);
            }),
          ],
          child: const ThaibaHiveApp(),
        ),
      );

      // Advance past initial frame and post-frame callbacks
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // 1. Storage assertion: Verify that pending_deeplink_route was cleared from storage
      final clearedPending = await storage.read(key: 'pending_deeplink_route');
      expect(clearedPending, isNull);

      // 2. Navigation assertion: Verify actual router location is '/leaves'
      final dynamic appState = tester.state(find.byType(ThaibaHiveApp));
      final String currentPath = appState.router.routerDelegate.currentConfiguration.uri.path;
      expect(currentPath, '/leaves');
    },
  );

  testWidgets(
    'Double-flush prevention test: subsequent AuthState changes do not re-trigger flushBufferedRoute',
    (WidgetTester tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 2.0;
      addTearDown(tester.view.resetPhysicalSize);

      const storage = FlutterSecureStorage();
      final mockApiClient = ApiClient();
      mockApiClient.dio.httpClientAdapter = MockHttpClientAdapter();
      late FastRestoreAuthNotifier notifier;

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            apiClientProvider.overrideWithValue(mockApiClient),
            dioProvider.overrideWithValue(mockApiClient.dio),
            failedEventsCountProvider.overrideWith((ref) => Stream.value(0)),
            authProvider.overrideWith((ref) {
              final repo = ref.watch(authRepositoryProvider);
              notifier = FastRestoreAuthNotifier(repo, storage);
              return notifier;
            }),
          ],
          child: const ThaibaHiveApp(),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Ensure first flush completed and navigated to /leaves
      final dynamic appState = tester.state(find.byType(ThaibaHiveApp));
      expect(appState.router.routerDelegate.currentConfiguration.uri.path, '/leaves');

      // Simulate a new pending route written into storage out-of-band
      await storage.write(key: 'pending_deeplink_route', value: '/tasks');

      // Trigger a subsequent state change on authProvider (e.g. user profile update)
      notifier.triggerStateChange(
        UserModel(
          id: 'test-staff-id',
          email: 'staff@thaiba.edu',
          employeeId: 'EMP-001',
          firstName: 'UpdatedName',
          lastName: 'Restore',
          role: 'staff',
          isActive: true,
          createdAt: DateTime(2026, 1, 1),
          updatedAt: DateTime(2026, 1, 1),
        ),
      );

      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));

      // Verify that flushBufferedRoute was NOT re-triggered (location remains /leaves)
      expect(appState.router.routerDelegate.currentConfiguration.uri.path, '/leaves');
      final unFlushedRoute = await storage.read(key: 'pending_deeplink_route');
      expect(unFlushedRoute, '/tasks');
    },
  );
}
