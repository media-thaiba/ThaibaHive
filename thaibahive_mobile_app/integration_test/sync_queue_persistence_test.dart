import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/sync/local_db_adapter.dart';
import 'package:thaibahive_mobile/core/sync/offline_sync_queue.dart';
import 'mock_sync_server.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MOB-002: Flutter Offline Queue & Hive Persistence Integration Tests', () {
    late MockSyncServer mockServer;
    late LocalDbAdapter dbAdapter;
    late OfflineSyncQueue syncQueue;

    setUp(() async {
      mockServer = MockSyncServer();
      await mockServer.start();
      dbAdapter = LocalDbAdapter();
      await dbAdapter.init();
      syncQueue = OfflineSyncQueue(adapter: dbAdapter);
      await syncQueue.initialize();
    });

    tearDown(() async {
      await mockServer.stop();
    });

    test('Enqueue mutations offline and verify persistence across queue inspection', () async {
      // Step 1: Enqueue 3 mutations
      final mut1 = await syncQueue.enqueueMutation(
        entityType: 'ATTENDANCE',
        mutationType: 'CREATE',
        payload: {'staffId': 'STF-001', 'checkInTime': '2026-08-19T08:00:00Z'},
        priority: 10,
      );

      final mut2 = await syncQueue.enqueueMutation(
        entityType: 'VOUCHER',
        mutationType: 'UPDATE',
        payload: {'voucherId': 'VCH-101', 'status': 'APPROVED'},
        priority: 5,
      );

      final mut3 = await syncQueue.enqueueMutation(
        entityType: 'STUDENT_LEAVE',
        mutationType: 'CREATE',
        payload: {'studentId': 'STD-505', 'days': 2},
        priority: 1,
      );

      expect(mut1.id, isNotEmpty);
      expect(mut2.id, isNotEmpty);
      expect(mut3.id, isNotEmpty);

      // Step 2: Verify pending records in queue
      final pending = await syncQueue.getPendingRecords();
      expect(pending.length, equals(3));
      // Verify priority ordering (highest first)
      expect(pending[0].entityType, equals('ATTENDANCE'));
      expect(pending[1].entityType, equals('VOUCHER'));
      expect(pending[2].entityType, equals('STUDENT_LEAVE'));

      // Step 3: Mark mut1 and mut2 as synced
      await syncQueue.markSynced([mut1.id, mut2.id]);

      // Step 4: Verify remaining queue
      final remaining = await syncQueue.getPendingRecords();
      expect(remaining.length, equals(1));
      expect(remaining[0].id, equals(mut3.id));
    });

    test('Batch extraction respects configured batch limits', () async {
      for (int i = 0; i < 25; i++) {
        await syncQueue.enqueueMutation(
          entityType: 'BULK_ITEM',
          mutationType: 'CREATE',
          payload: {'index': i},
          priority: i,
        );
      }

      final batch = await syncQueue.getOutboxBatch(limit: 10);
      expect(batch.length, equals(10));
      // Highest priority should be first
      expect(batch.first.priority, equals(24));
    });

    test('Failed mutations remain flagged with failure status in store', () async {
      final mut = await syncQueue.enqueueMutation(
        entityType: 'TASK',
        mutationType: 'CREATE',
        payload: {'title': 'Offline Task'},
      );

      await syncQueue.markFailed(mut.id, '500 Internal Server Error');
      final pending = await syncQueue.getPendingRecords();
      // Failed mutations are excluded from PENDING list until retry
      expect(pending.where((p) => p.id == mut.id).isEmpty, isTrue);
    });
  });
}
