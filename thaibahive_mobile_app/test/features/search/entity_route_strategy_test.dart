import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/search/data/search_models.dart';

void main() {
  group('Entity Route Strategy Parity Tests', () {
    test('contains all 15 core searchable entity types', () {
      const expectedTypes = [
        'students',
        'staff',
        'tasks',
        'events',
        'announcements',
        'daily-reports',
        'purchase-requests',
        'help-desk-tickets',
        'recognition',
        'asset-inventory',
        'circulars',
        'bookings',
        'polls',
        'comments',
        'media-assets',
      ];

      expect(kSearchableEntityTypes.length, equals(15));
      for (final type in expectedTypes) {
        expect(kSearchableEntityTypes.contains(type), isTrue,
            reason: 'Missing searchable entity type: $type');
      }
    });

    test('all 15 entity types have route strategy mappings', () {
      for (final type in kSearchableEntityTypes) {
        expect(kEntityRouteStrategyMap.containsKey(type), isTrue,
            reason: 'Missing route strategy for entity type: $type');
      }
    });

    test('handoff entities route to handoff strategy', () {
      expect(kEntityRouteStrategyMap['purchase-requests'],
          equals(EntityRouteStrategy.handoff));
      expect(kEntityRouteStrategyMap['expense-claims'],
          equals(EntityRouteStrategy.handoff));
      expect(kEntityRouteStrategyMap['fee-receipts'],
          equals(EntityRouteStrategy.handoff));
    });

    test('native entities route to native strategy', () {
      final nativeTypes = [
        'students',
        'staff',
        'tasks',
        'events',
        'announcements',
        'daily-reports',
        'help-desk-tickets',
        'recognition',
        'asset-inventory',
        'circulars',
        'bookings',
        'polls',
        'comments',
        'media-assets',
      ];

      for (final type in nativeTypes) {
        expect(kEntityRouteStrategyMap[type], equals(EntityRouteStrategy.native),
            reason: 'Entity $type should map to native strategy');
      }
    });

    test('SearchResult.routeStrategy correctly uses isWebOnly override', () {
      const nativeResult = SearchResult(
        id: '1',
        entityType: 'tasks',
        title: 'Task 1',
        nativeRoute: '/tasks/1',
        webRoute: '/tasks/1',
        isWebOnly: false,
      );
      expect(nativeResult.routeStrategy, equals(EntityRouteStrategy.native));

      const webOnlyResult = SearchResult(
        id: '2',
        entityType: 'tasks',
        title: 'Task 2',
        nativeRoute: '/tasks/2',
        webRoute: '/tasks/2',
        isWebOnly: true,
      );
      expect(webOnlyResult.routeStrategy, equals(EntityRouteStrategy.handoff));
    });
  });
}
