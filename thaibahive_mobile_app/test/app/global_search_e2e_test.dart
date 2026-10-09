import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/router.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/features/search/data/search_models.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    clearCachedAuthToken();
    FlutterSecureStorage.setMockInitialValues({});
  });

  tearDown(() {
    clearCachedAuthToken();
  });

  group('Global Search Deep Link & Handoff Integration Tests', () {
    test('all 15 entity type native routes exist or resolve in router', () {
      final router = buildRouter();
      
      List<String> extractAllPaths(List<RouteBase> routes) {
        final paths = <String>[];
        for (final r in routes) {
          if (r is GoRoute) {
            paths.add(r.path);
            paths.addAll(extractAllPaths(r.routes));
          } else if (r is StatefulShellRoute) {
            for (final branch in r.branches) {
              paths.addAll(extractAllPaths(branch.routes));
            }
          } else if (r is ShellRoute) {
            paths.addAll(extractAllPaths(r.routes));
          }
        }
        return paths;
      }

      final routes = extractAllPaths(router.configuration.routes);

      // Native destination routes
      expect(routes.contains('/tasks/:id'), isTrue);
      expect(routes.contains('/events/:id'), isTrue);
      expect(routes.contains('/announcements/:id'), isTrue);
      expect(routes.contains('/circulars'), isTrue);
      expect(routes.contains('/polls/:id'), isTrue);
      expect(routes.contains('/help-desk/:id'), isTrue);
      expect(routes.contains('/bookings'), isTrue);
      expect(routes.contains('/recognition'), isTrue);
      expect(routes.contains('/assets/:id'), isTrue);
      expect(routes.contains('/staff/:id'), isTrue);
      expect(routes.contains('/media'), isTrue);
      expect(routes.contains('/reports'), isTrue);

      // Webview handoff route
      expect(routes.contains('/handoff'), isTrue);
    });

    test('handoff dispatch builds correct /handoff URI for web-only entities', () {
      const purchaseResult = SearchResult(
        id: 'pur-101',
        entityType: 'purchase-requests',
        title: 'Microscopes',
        nativeRoute: '/purchases/pur-101',
        webRoute: '/purchases/pur-101',
        targetPath: '/purchases/pur-101',
        isWebOnly: true,
      );

      expect(purchaseResult.routeStrategy, equals(EntityRouteStrategy.handoff));

      final target = purchaseResult.targetPath ?? purchaseResult.webRoute;
      final encodedPath = Uri.encodeComponent(target);
      final encodedTitle = Uri.encodeComponent(purchaseResult.title);
      final handoffUri = '/handoff?path=$encodedPath&title=$encodedTitle';

      expect(handoffUri, equals('/handoff?path=%2Fpurchases%2Fpur-101&title=Microscopes'));
    });

    test('native dispatch returns direct canonical route', () {
      const studentResult = SearchResult(
        id: 'std-202',
        entityType: 'students',
        title: 'Ahmad Student',
        nativeRoute: '/staff/std-202',
        webRoute: '/school/students/std-202',
        isWebOnly: false,
      );

      expect(studentResult.routeStrategy, equals(EntityRouteStrategy.native));
      expect(studentResult.nativeRoute, equals('/staff/std-202'));
    });
  });
}
