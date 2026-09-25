import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/sync/local_db_adapter.dart';
import 'package:thaibahive_mobile/core/sync/offline_sync_queue.dart';

void main() {
  group('OfflineSyncQueue Persistence Tests', () {
    late OfflineSyncQueue queue;
    late LocalDbAdapter dbAdapter;
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('hive_queue_test');
      Hive.init(tempDir.path);
      dbAdapter = LocalDbAdapter();
      await dbAdapter.init();
      queue = OfflineSyncQueue(adapter: dbAdapter);
      await queue.initialize();
    });

    tearDown(() async {
      await Hive.close();
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('enqueues mutations and fetches pending records sorted by priority', () async {
      await queue.enqueueMutation(
        entityType: 'STUDENT_LEAVE',
        mutationType: 'CREATE',
        payload: {'studentId': 's-1', 'reason': 'Medical'},
        priority: 1,
      );

      await queue.enqueueMutation(
        entityType: 'CRITICAL_ALERT',
        mutationType: 'UPDATE',
        payload: {'alertId': 'a-99'},
        priority: 10,
      );

      final pending = await queue.getPendingRecords();
      expect(pending.length, equals(2));
      expect(pending.first.entityType, equals('CRITICAL_ALERT'));
      expect(pending.first.priority, equals(10));
    });

    test('marks records synced and purges synced items', () async {
      final rec = await queue.enqueueMutation(
        entityType: 'MARK_ENTRY',
        mutationType: 'CREATE',
        payload: {'examId': 'ex-1', 'score': 95},
      );

      final pendingBefore = await queue.getPendingRecords();
      expect(pendingBefore.length, equals(1));

      await queue.markSynced([rec.id]);

      final pendingAfter = await queue.getPendingRecords();
      expect(pendingAfter.length, equals(0));
    });
  });
}
