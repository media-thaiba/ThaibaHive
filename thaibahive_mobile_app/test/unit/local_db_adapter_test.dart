import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/sync/local_db_adapter.dart';

void main() {
  group('LocalDbAdapter Unit Tests', () {
    late LocalDbAdapter adapter;
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('hive_adapter_test');
      Hive.init(tempDir.path);
      adapter = LocalDbAdapter();
      await adapter.init();
    });

    tearDown(() async {
      await Hive.close();
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('inserts and retrieves pending mutations', () async {
      final record = LocalDbRecord(
        id: 'rec-1',
        entityType: 'ATTENDANCE',
        mutationType: 'CREATE',
        payload: {'studentId': 'st-101', 'status': 'PRESENT'},
        clientTimestamp: '2026-08-01T10:00:00Z',
        priority: 1,
      );

      await adapter.insert(record);

      final pending = await adapter.getPendingMutations();
      expect(pending.length, equals(1));
      expect(pending.first.id, equals('rec-1'));
      expect(pending.first.syncStatus, equals('PENDING'));
    });

    test('updates mutation sync status and clears synced records', () async {
      final record = LocalDbRecord(
        id: 'rec-2',
        entityType: 'FEE_PAYMENT',
        mutationType: 'UPDATE',
        payload: {'amount': 500},
        clientTimestamp: '2026-08-01T10:05:00Z',
      );

      await adapter.insert(record);
      await adapter.updateStatus('rec-2', 'SYNCED');

      final pendingAfterSync = await adapter.getPendingMutations();
      expect(pendingAfterSync.length, equals(0));

      await adapter.clearSynced();
      final pendingAfterClear = await adapter.getPendingMutations();
      expect(pendingAfterClear.length, equals(0));
    });
  });
}
