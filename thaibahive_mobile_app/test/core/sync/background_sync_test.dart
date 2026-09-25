import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/sync/outbox_queue_manager.dart';
import 'package:thaibahive_mobile/core/sync/background_sync_worker.dart';

void main() {
  group('Sprint-008 Mobile Background Sync Worker Tests', () {
    late Directory tempDir;

    setUp(() async {
      tempDir = await Directory.systemTemp.createTemp('hive_bg_test');
      Hive.init(tempDir.path);
      OutboxQueueManager.clearQueue();
    });

    tearDown(() async {
      await Hive.close();
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    test('executes background sync cleanly when outbox is empty', () async {
      final result = await BackgroundSyncWorker.executeBackgroundSync();
      expect(result.success, isTrue);
      expect(result.syncedCount, equals(0));
    });

    test('flushes pending outbox queue actions during background execution', () async {
      OutboxQueueManager.addAction(OutboxAction(
        id: 'act_001',
        entityType: 'attendance',
        entityId: 'att_101',
        action: 'UPDATE',
        payload: {'status': 'present'},
        timestamp: DateTime.now(),
      ));

      expect(OutboxQueueManager.getPendingActions().length, equals(1));

      final result = await BackgroundSyncWorker.executeBackgroundSync();
      expect(result.success, isTrue);
      expect(result.syncedCount, equals(1));
      expect(OutboxQueueManager.getPendingActions().isEmpty, isTrue);
    });
  });
}
