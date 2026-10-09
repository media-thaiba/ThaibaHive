import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/router.dart';
import 'package:thaibahive_mobile/core/constants.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    clearCachedAuthToken();
    FlutterSecureStorage.setMockInitialValues({});
  });

  tearDown(() {
    clearCachedAuthToken();
  });

  group('Deep Link & Workspace Routing Tests', () {
    test('Workspace alias routes redirect functions return canonical paths', () {
      final router = buildRouter();
      final routes = router.configuration.routes;

      GoRoute findRoute(String path) {
        return routes.whereType<GoRoute>().firstWhere(
              (r) => r.path == path,
              orElse: () => throw Exception('Route $path not found'),
            );
      }

      final attendanceRoute = findRoute('/my-work/attendance');
      expect(
        attendanceRoute.redirect!(_MockBuildContext(), _mockState('/my-work/attendance', router)),
        equals('/attendance'),
      );

      final mediaRoute = findRoute('/operations/media-library');
      expect(
        mediaRoute.redirect!(_MockBuildContext(), _mockState('/operations/media-library', router)),
        equals('/media'),
      );

      final fleetRoute = findRoute('/operations/fleet');
      expect(
        fleetRoute.redirect!(_MockBuildContext(), _mockState('/operations/fleet', router)),
        equals('/vehicles'),
      );

      final taskRoute = findRoute('/my-work/tasks/:id');
      expect(
        taskRoute.redirect!(_MockBuildContext(), _mockState('/my-work/tasks/123', router, pathParams: {'id': '123'})),
        equals('/tasks/123'),
      );

      final purchaseRoute = findRoute('/operations/finance/purchases/:id');
      expect(
        purchaseRoute.redirect!(_MockBuildContext(), _mockState('/operations/finance/purchases/456', router, pathParams: {'id': '456'})),
        equals('/finance/purchase-approvals/456'),
      );

      final reportsNewRoute = findRoute('/my-work/reports/new');
      expect(
        reportsNewRoute.redirect!(_MockBuildContext(), _mockState('/my-work/reports/new', router)),
        equals('/reports/create'),
      );
    });

    test('Generic handoff and Tier-3 routes exist in router configuration', () {
      final router = buildRouter();
      final routes = router.configuration.routes.whereType<GoRoute>().map((r) => r.path).toList();

      expect(routes.contains('/handoff'), isTrue);
      expect(routes.contains('/school/:path*'), isTrue);
      expect(routes.contains('/admin/:path*'), isTrue);
    });
  });
}

GoRouterState _mockState(String uriStr, GoRouter router, {Map<String, String> pathParams = const {}}) {
  final uri = Uri.parse(uriStr);
  return GoRouterState(
    router.configuration,
    uri: uri,
    matchedLocation: uri.path,
    fullPath: uri.path,
    pathParameters: pathParams,
    pageKey: const ValueKey('test'),
  );
}

class _MockBuildContext implements BuildContext {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
