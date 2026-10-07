import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_provider.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_repository.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';

class _FakeAttendanceRepo extends AttendanceRepository {
  _FakeAttendanceRepo() : super(Dio());

  int checkInCalls = 0;
  int checkOutCalls = 0;
  bool shouldFail = false;

  @override
  Future<List<AttendanceLogModel>> getMyAttendance({int page = 1, int limit = 20}) async {
    return [];
  }

  @override
  Future<AttendanceStatsModel> getStats() async {
    return const AttendanceStatsModel(
      presentDays: 10,
      absentDays: 1,
      lateDays: 0,
      todayStatus: 'not_marked',
    );
  }

  @override
  Future<AttendanceLogModel> checkIn({
    String method = 'qr',
    String? nfcTagId,
    String? qrCode,
    double? latitude,
    double? longitude,
  }) async {
    checkInCalls++;
    if (shouldFail) throw DioException(requestOptions: RequestOptions(), error: 'Network fail');
    return const AttendanceLogModel(
      id: 'log-1',
      staffId: 's1',
      date: '2026-10-07',
      method: 'qr',
      status: 'present',
      checkIn: '09:00',
    );
  }

  @override
  Future<AttendanceLogModel> checkOut() async {
    checkOutCalls++;
    if (shouldFail) throw DioException(requestOptions: RequestOptions(), error: 'Network fail');
    return const AttendanceLogModel(
      id: 'log-1',
      staffId: 's1',
      date: '2026-10-07',
      method: 'qr',
      status: 'present',
      checkIn: '09:00',
      checkOut: '17:00',
    );
  }
}

class _ControllableNetwork extends NetworkService {
  _ControllableNetwork(NetworkStatus initial) : super() {
    state = initial;
  }

  void _init() {
    // Skip real connectivity listener in test
  }

  void setOnline(bool online) => state = online ? NetworkStatus.online : NetworkStatus.offline;
}

Dio stubDio({
  required Map<String, dynamic> body,
  int statusCode = 200,
}) {
  final dio = Dio();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        handler.resolve(
          Response(
            requestOptions: options,
            statusCode: statusCode,
            data: body,
          ),
        );
      },
    ),
  );
  return dio;
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory tempDir;

  setUpAll(() async {
    FlutterSecureStorage.setMockInitialValues({});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async => '.',
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('dev.fluttercommunity.plus/connectivity'),
      (MethodCall methodCall) async => ['none'],
    );
    tempDir = await Directory.systemTemp.createTemp('att_offline_test');
    Hive.init(tempDir.path);
  });

  tearDownAll(() async {
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  tearDown(() async {
    final pending = offlineQueue.getAllEvents();
    for (final e in pending) {
      await offlineQueue.markCompleted(e.clientEventId);
    }
  });

  List<Override> createOverrides({
    required AttendanceRepository repo,
    required _ControllableNetwork network,
  }) {
    return [
      attendanceRepositoryProvider.overrideWithValue(repo),
      networkStatusProvider.overrideWith((ref) => network),
      isOnlineProvider.overrideWith(
        (ref) => network.isOnline,
      ),
    ];
  }

  group('Offline Attendance State Machine', () {
    test('offline check-out enqueues attendance_punch and triggers sync', () async {
      final repo = _FakeAttendanceRepo();
      final network = _ControllableNetwork(NetworkStatus.offline);

      final container = ProviderContainer(
        overrides: createOverrides(repo: repo, network: network),
      );

      final notifier = container.read(attendanceProvider.notifier);
      await notifier.checkOut();

      final state = container.read(attendanceProvider);
      expect(state.isOfflineCheckOut, isTrue);
      expect(state.pendingCheckOutId, isNotNull);
      expect(state.error, isNull);
      expect(repo.checkOutCalls, equals(0), reason: 'Must not call repository directly when offline');

      final pending = offlineQueue.getPendingEvents();
      expect(pending.length, equals(1));
      expect(pending.first.type, equals('attendance_punch'));
      expect(pending.first.payload['mode'], equals('out'));
      expect(pending.first.clientEventId, equals(state.pendingCheckOutId));

      // Flush when online
      final flushed = await offlineQueue.flush(
        httpClient: stubDio(body: {
          'processedMutations': [state.pendingCheckOutId],
        }),
      );
      expect(flushed, equals(1));
      expect(offlineQueue.getPendingEvents(), isEmpty);
    });

    test('offline NFC check-in enqueues attendance_nfc_checkin into queue', () async {
      final repo = _FakeAttendanceRepo();
      final network = _ControllableNetwork(NetworkStatus.offline);

      final container = ProviderContainer(
        overrides: createOverrides(repo: repo, network: network),
      );

      final notifier = container.read(attendanceProvider.notifier);
      await notifier.checkIn(method: 'nfc', nfcTagId: 'tag_12345', latitude: 12.97, longitude: 77.59);

      final state = container.read(attendanceProvider);
      expect(state.error, isNull);
      expect(repo.checkInCalls, equals(0), reason: 'Offline NFC must not call API directly');

      final pending = offlineQueue.getPendingEvents();
      expect(pending.length, equals(1));
      expect(pending.first.type, equals('attendance_nfc_checkin'));
      expect(pending.first.payload['tagData']['id'], equals('tag_12345'));
      expect(pending.first.payload['latitude'], equals(12.97));
    });

    test('offline QR check-in is rejected and does not enqueue', () async {
      final repo = _FakeAttendanceRepo();
      final network = _ControllableNetwork(NetworkStatus.offline);

      final container = ProviderContainer(
        overrides: createOverrides(repo: repo, network: network),
      );

      final notifier = container.read(attendanceProvider.notifier);
      await notifier.checkIn(method: 'qr', qrCode: 'qr_nonce_xyz');

      final state = container.read(attendanceProvider);
      expect(state.error, contains('QR Check-in requires an active internet connection'));
      expect(repo.checkInCalls, equals(0));
      expect(offlineQueue.getPendingEvents(), isEmpty, reason: 'QR must never queue offline');
    });

    test('online check-in failure surfaces error without optimistic false success', () async {
      final repo = _FakeAttendanceRepo()..shouldFail = true;
      final network = _ControllableNetwork(NetworkStatus.online);

      final container = ProviderContainer(
        overrides: createOverrides(repo: repo, network: network),
      );

      final notifier = container.read(attendanceProvider.notifier);
      await notifier.checkIn(method: 'qr', qrCode: 'qr_nonce_xyz');

      final state = container.read(attendanceProvider);
      expect(state.error, contains('Check-in failed'));
      expect(state.lastAction, isNull, reason: 'Failed check-in must never set lastAction');
    });

    test('server conflict marks event as conflict in offline queue', () async {
      final event = await offlineQueue.enqueue(
        type: 'attendance_punch',
        payload: {'mode': 'out', 'at': '2026-10-07T17:00:00Z'},
      );

      await offlineQueue.flush(
        httpClient: stubDio(body: {
          'processedMutations': [event.clientEventId],
          'conflicts': [
            {
              'clientEventId': event.clientEventId,
              'entityType': 'attendance',
              'status': 'CONFLICT',
              'fields': ['checkOut'],
            }
          ],
        }),
      );

      final conflictEvents = offlineQueue.getConflictEvents();
      expect(conflictEvents.length, equals(1));
      expect(conflictEvents.first.clientEventId, equals(event.clientEventId));
      expect(conflictEvents.first.status, equals(QueueStatus.conflict));
    });
  });
}
