import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_sync_service.dart';

/// In-memory fake implementation of OfflineQueue for unit tests
class FakeOfflineQueue implements OfflineQueue {
  final Map<String, OfflineEvent> events = {};

  @override
  Future<OfflineEvent> enqueue({
    required String type,
    required Map<String, dynamic> payload,
  }) async {
    final clientEventId =
        payload['clientEventId'] as String? ?? 'evt_mock_${events.length}';
    final event = OfflineEvent(
      clientEventId: clientEventId,
      type: type,
      payload: Map<String, dynamic>.from(payload),
      createdAt: DateTime.now(),
      status: QueueStatus.pending,
    );
    events[clientEventId] = event;
    return event;
  }

  @override
  List<OfflineEvent> getAllEvents() => events.values.toList();

  @override
  Future<void> markSyncing(String clientEventId) async {
    final ev = events[clientEventId];
    if (ev != null) {
      events[clientEventId] = OfflineEvent(
        clientEventId: ev.clientEventId,
        type: ev.type,
        payload: ev.payload,
        status: QueueStatus.syncing,
        createdAt: ev.createdAt,
      );
    }
  }

  @override
  Future<void> markCompleted(String clientEventId) async {
    final ev = events[clientEventId];
    if (ev != null) {
      events[clientEventId] = OfflineEvent(
        clientEventId: ev.clientEventId,
        type: ev.type,
        payload: ev.payload,
        status: QueueStatus.completed,
        createdAt: ev.createdAt,
        completedAt: DateTime.now(),
      );
    }
  }

  @override
  Future<void> markFailed(String clientEventId, String error,
      {bool isTerminal = false}) async {
    final ev = events[clientEventId];
    if (ev != null) {
      events[clientEventId] = OfflineEvent(
        clientEventId: ev.clientEventId,
        type: ev.type,
        payload: ev.payload,
        status: QueueStatus.failed,
        errorMessage: error,
        createdAt: ev.createdAt,
      );
    }
  }

  @override
  Future<void> resetToPending(String clientEventId) async {
    final ev = events[clientEventId];
    if (ev != null) {
      events[clientEventId] = OfflineEvent(
        clientEventId: ev.clientEventId,
        type: ev.type,
        payload: ev.payload,
        status: QueueStatus.pending,
        createdAt: ev.createdAt,
      );
    }
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  group('Step 2b: Attendance Sync Client & Ledger Contract Tests', () {
    late FakeOfflineQueue fakeQueue;
    late Dio dio;
    late AttendanceSyncService service;

    setUp(() {
      fakeQueue = FakeOfflineQueue();
      dio = Dio(BaseOptions(baseUrl: 'https://thaibahive.internal'));
      service = AttendanceSyncService(dio: dio, queue: fakeQueue);
    });

    test('generateClientEventId produces unique monotonic IDs with prefix', () {
      final id1 = service.generateClientEventId();
      final id2 = service.generateClientEventId();

      expect(id1.startsWith('evt_'), isTrue);
      expect(id2.startsWith('evt_'), isTrue);
      expect(id1, isNot(equals(id2)));

      final pattern = RegExp(r'^evt_\d+_\d+$');
      expect(pattern.hasMatch(id1), isTrue, reason: 'ID should match evt_{millis}_{rand}');
      expect(pattern.hasMatch(id2), isTrue);
    });

    test('recordPunch adheres to Zero-Trust: never transmits staffId, institutionId, or effectiveAt', () async {
      Map<String, dynamic>? transmittedPayload;

      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          if (options.path == '/attendance/sync') {
            final events = (options.data as Map<String, dynamic>)['events'] as List;
            transmittedPayload = events.first as Map<String, dynamic>;
            return handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'results': [
                  {'clientEventId': transmittedPayload!['clientEventId'], 'status': 'accepted'}
                ]
              },
            ));
          }
          return handler.next(options);
        },
      ));

      final position = Position(
        latitude: 11.123456,
        longitude: 75.987654,
        timestamp: DateTime.now(),
        accuracy: 8.5,
        altitude: 20.0,
        altitudeAccuracy: 1.0,
        heading: 0.0,
        headingAccuracy: 1.0,
        speed: 0.0,
        speedAccuracy: 0.0,
        isMocked: false,
      );

      final outcome = await service.recordPunch(
        kind: AttendancePunchKind.inEvent,
        method: AttendancePunchMethod.geofence,
        position: position,
      );

      expect(outcome.success, isTrue);
      expect(transmittedPayload, isNotNull);

      // CRITICAL ZERO-TRUST CONTRACT CHECKS
      expect(transmittedPayload!.containsKey('staffId'), isFalse,
          reason: 'Client must NEVER send staffId; derived strictly from JWT server-side');
      expect(transmittedPayload!.containsKey('institutionId'), isFalse,
          reason: 'Client must NEVER send institutionId; derived strictly from JWT server-side');
      expect(transmittedPayload!.containsKey('effectiveAt'), isFalse,
          reason: 'Client must NEVER send effectiveAt; computed server-side from server clock & plausibility');
      expect(transmittedPayload!.containsKey('timeTrust'), isFalse,
          reason: 'Client must NEVER send timeTrust; computed by server-side gatekeeper');

      // VERIFY CLIENT-SIDE ATTESTATIONS
      expect(transmittedPayload!['kind'], equals('in'));
      expect(transmittedPayload!['method'], equals('geofence'));
      expect(transmittedPayload!['latitude'], equals(11.123456));
      expect(transmittedPayload!['longitude'], equals(75.987654));
      expect(transmittedPayload!['accuracyM'], equals(8.5));
      expect(transmittedPayload!['isMocked'], isFalse);
      expect(transmittedPayload!['deviceClaimedAt'], isA<int>());
    });

    test('recordPunch handles accepted punch: completes queue item immediately', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          final events = (options.data as Map<String, dynamic>)['events'] as List;
          final id = events.first['clientEventId'] as String;
          return handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {
              'results': [
                {'clientEventId': id, 'status': 'accepted'}
              ]
            },
          ));
        },
      ));

      final outcome = await service.recordPunch(
        kind: AttendancePunchKind.outEvent,
        method: AttendancePunchMethod.geofence,
      );

      expect(outcome.success, isTrue);
      expect(outcome.isQueuedOffline, isFalse);
      expect(outcome.status, equals('accepted'));

      final queued = fakeQueue.events[outcome.clientEventId];
      expect(queued, isNotNull);
      expect(queued!.status, equals(QueueStatus.completed));
    });

    test('recordPunch handles duplicate punch idempotently: marks completed without error', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          final events = (options.data as Map<String, dynamic>)['events'] as List;
          final id = events.first['clientEventId'] as String;
          return handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {
              'results': [
                {'clientEventId': id, 'status': 'duplicate'}
              ]
            },
          ));
        },
      ));

      final outcome = await service.recordPunch(
        kind: AttendancePunchKind.inEvent,
        method: AttendancePunchMethod.geofence,
      );

      expect(outcome.success, isTrue);
      expect(outcome.isQueuedOffline, isFalse);
      expect(outcome.status, equals('duplicate'));

      final queued = fakeQueue.events[outcome.clientEventId];
      expect(queued, isNotNull);
      expect(queued!.status, equals(QueueStatus.completed));
    });

    test('recordPunch handles rejected punch: marks failed terminal to avoid poison retry loops', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          final events = (options.data as Map<String, dynamic>)['events'] as List;
          final id = events.first['clientEventId'] as String;
          return handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {
              'results': [
                {'clientEventId': id, 'status': 'rejected', 'reason': 'DEVICE_TIME_SKEW_EXCEEDED'}
              ]
            },
          ));
        },
      ));

      final outcome = await service.recordPunch(
        kind: AttendancePunchKind.inEvent,
        method: AttendancePunchMethod.geofence,
      );

      expect(outcome.success, isFalse);
      expect(outcome.isQueuedOffline, isFalse);
      expect(outcome.status, equals('rejected'));
      expect(outcome.message, contains('DEVICE_TIME_SKEW_EXCEEDED'));

      final queued = fakeQueue.events[outcome.clientEventId];
      expect(queued, isNotNull);
      expect(queued!.status, equals(QueueStatus.failed));
    });

    test('recordPunch falls back safely to offline queue on network failure', () async {
      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          return handler.reject(DioException(
            requestOptions: options,
            type: DioExceptionType.connectionError,
            error: 'Network unreachable (offline mode)',
          ));
        },
      ));

      final outcome = await service.recordPunch(
        kind: AttendancePunchKind.inEvent,
        method: AttendancePunchMethod.geofence,
      );

      expect(outcome.success, isTrue);
      expect(outcome.isQueuedOffline, isTrue);
      expect(outcome.status, equals('pending_sync'));

      final queued = fakeQueue.events[outcome.clientEventId];
      expect(queued, isNotNull);
      expect(queued!.status, equals(QueueStatus.pending));
    });

    test('flushPendingAttendanceEvents drains batch and isolates rejections correctly', () async {
      // 1. Pre-seed offline queue with 3 events
      await fakeQueue.enqueue(
        type: 'attendance_event',
        payload: {
          'clientEventId': 'evt_accepted_1',
          'kind': 'in',
          'method': 'geofence',
          'deviceClaimedAt': 1700000000000,
        },
      );
      await fakeQueue.enqueue(
        type: 'attendance_event',
        payload: {
          'clientEventId': 'evt_duplicate_2',
          'kind': 'out',
          'method': 'geofence',
          'deviceClaimedAt': 1700000010000,
        },
      );
      await fakeQueue.enqueue(
        type: 'attendance_event',
        payload: {
          'clientEventId': 'evt_rejected_3',
          'kind': 'in',
          'method': 'geofence',
          'deviceClaimedAt': 1700000020000,
        },
      );

      dio.interceptors.add(InterceptorsWrapper(
        onRequest: (options, handler) {
          return handler.resolve(Response(
            requestOptions: options,
            statusCode: 200,
            data: {
              'results': [
                {'clientEventId': 'evt_accepted_1', 'status': 'accepted'},
                {'clientEventId': 'evt_duplicate_2', 'status': 'duplicate'},
                {'clientEventId': 'evt_rejected_3', 'status': 'rejected', 'reason': 'OUT_OF_CAMPUS_BOUNDS'},
              ]
            },
          ));
        },
      ));

      final summary = await service.flushPendingAttendanceEvents();

      expect(summary.total, equals(3));
      expect(summary.accepted, equals(1));
      expect(summary.duplicates, equals(1));
      expect(summary.rejected, equals(1));

      // Accepted item is marked completed
      expect(fakeQueue.events['evt_accepted_1']!.status, equals(QueueStatus.completed));
      // Duplicate item is marked completed (idempotent, safe to purge)
      expect(fakeQueue.events['evt_duplicate_2']!.status, equals(QueueStatus.completed));
      // Rejected item is marked failed terminal (quarantined)
      expect(fakeQueue.events['evt_rejected_3']!.status, equals(QueueStatus.failed));
    });

    test('AttendancePunchMethod & Kind serialization mapping verification', () async {
      final methods = {
        AttendancePunchMethod.geofence: 'geofence',
        AttendancePunchMethod.qr: 'qr',
        AttendancePunchMethod.nfc: 'nfc',
        AttendancePunchMethod.manual: 'manual_correction',
      };

      for (final entry in methods.entries) {
        String? capturedMethod;
        dio.interceptors.clear();
        dio.interceptors.add(InterceptorsWrapper(
          onRequest: (options, handler) {
            final events = (options.data as Map<String, dynamic>)['events'] as List;
            capturedMethod = events.first['method'] as String;
            return handler.resolve(Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'results': [
                  {'clientEventId': events.first['clientEventId'], 'status': 'accepted'}
                ]
              },
            ));
          },
        ));

        await service.recordPunch(
          kind: AttendancePunchKind.inEvent,
          method: entry.key,
        );

        expect(capturedMethod, equals(entry.value));
      }
    });
  });
}
