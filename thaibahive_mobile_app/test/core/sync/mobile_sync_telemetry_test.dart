import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/sync/mobile_sync_telemetry.dart';

void main() {
  group('MOB-006: MobileSyncTelemetry Unit Tests', () {
    late MobileSyncTelemetry telemetry;

    setUp(() {
      telemetry = MobileSyncTelemetry();
      telemetry.reset();
    });

    test('Records sync events and exports structured batch payload', () {
      telemetry.recordSyncEvent(
        batchSize: 12,
        durationMs: 145.5,
        networkType: 'wifi',
        retryCount: 0,
        conflictCount: 1,
        success: true,
      );

      expect(telemetry.buffer.length, equals(1));
      final event = telemetry.buffer.first;
      expect(event.batchSize, equals(12));
      expect(event.syncDurationMs, equals(145.5));
      expect(event.networkType, equals('wifi'));
      expect(event.conflictCount, equals(1));
      expect(event.success, isTrue);

      final payload = telemetry.exportBatchPayload(
        deviceId: 'pixel-8-test',
        appVersion: '1.0.0+14',
      );

      expect(payload['deviceId'], equals('pixel-8-test'));
      expect(payload['events'], isA<List>());
      expect((payload['events'] as List).length, equals(1));
    });

    test('Evicts oldest record when buffer exceeds max limit (50 items)', () {
      for (int i = 0; i < 60; i++) {
        telemetry.recordSyncEvent(
          batchSize: i,
          durationMs: 50.0 + i,
          networkType: 'cellular',
        );
      }

      expect(telemetry.buffer.length, equals(50));
      // First item in buffer should be item index 10 (0..9 evicted)
      expect(telemetry.buffer.first.batchSize, equals(10));
      expect(telemetry.buffer.last.batchSize, equals(59));
    });

    test('Clears flushed events by ID', () {
      telemetry.recordSyncEvent(batchSize: 1, durationMs: 100, networkType: 'wifi');
      telemetry.recordSyncEvent(batchSize: 2, durationMs: 200, networkType: 'wifi');

      final idToFlush = telemetry.buffer.first.id;
      telemetry.clearFlushedEvents([idToFlush]);

      expect(telemetry.buffer.length, equals(1));
      expect(telemetry.buffer.first.batchSize, equals(2));
    });

    test('Bypasses recording when disabled', () {
      telemetry.isEnabled = false;
      telemetry.recordSyncEvent(batchSize: 5, durationMs: 50, networkType: 'wifi');

      expect(telemetry.buffer.isEmpty, isTrue);
    });
  });
}
