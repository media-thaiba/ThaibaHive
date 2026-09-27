import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';

/// Unit tests for the consolidated offline drain.
///
/// Regression coverage: the drain must only remove server-confirmed events.
/// A previous implementation marked queued mutations as synced without
/// transmitting them, silently discarding offline work on reconnect.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async => '.',
    );
  });

  Dio stubDio({
    required Map<String, dynamic> body,
    int statusCode = 200,
    bool throwTransportError = false,
  }) {
    final dio = Dio();
    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          if (throwTransportError) {
            handler.reject(
              DioException(
                requestOptions: options,
                type: DioExceptionType.connectionError,
                error: 'Simulated offline transport failure',
              ),
            );
            return;
          }
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

  test('flush returns 0 and transmits nothing when the queue is empty', () async {
    final count = await offlineQueue.flush(
      httpClient: stubDio(body: {'processedMutations': []}),
    );
    expect(count, equals(0));
    expect(offlineQueue.getPendingEvents(), isEmpty);
  });

  test('flush transmits pending events and removes only confirmed IDs', () async {
    final first = await offlineQueue.enqueue(
      type: 'expense_create',
      payload: {'amount': 1200},
    );
    final second = await offlineQueue.enqueue(
      type: 'leave_apply',
      payload: {'days': 2},
    );

    final count = await offlineQueue.flush(
      httpClient: stubDio(
        body: {
          'processedMutations': [first.clientEventId],
        },
      ),
    );

    expect(count, equals(1));
    final remaining = offlineQueue.getPendingEvents();
    expect(remaining.map((e) => e.clientEventId), contains(second.clientEventId));
    expect(remaining.map((e) => e.clientEventId), isNot(contains(first.clientEventId)));

    // Clean up the re-queued remainder so tests stay isolated.
    await offlineQueue.markCompleted(second.clientEventId);
    expect(offlineQueue.getPendingEvents(), isEmpty);
  });

  test('flush keeps every event queued when transport fails', () async {    final event = await offlineQueue.enqueue(
      type: 'task_create',
      payload: {'title': 'Offline task'},
    );

    final count = await offlineQueue.flush(
      httpClient: stubDio(body: {}, throwTransportError: true),
    );

    expect(count, equals(0));
    expect(
      offlineQueue.getPendingEvents().map((e) => e.clientEventId),
      contains(event.clientEventId),
    );

    await offlineQueue.markCompleted(event.clientEventId);
  });

  test('flush posts leave/task mutations in the server sync contract', () async {
    await offlineQueue.enqueue(
      type: 'leave_apply',
      payload: {'leave_type_id': 'lt1', 'days': 2},
    );
    await offlineQueue.enqueue(
      type: 'leave_cancel',
      payload: {'id': 'leave_9', 'status': 'cancelled'},
    );

    Map<String, dynamic>? capturedBody;
    final capturingDio = Dio()
      ..interceptors.add(
        InterceptorsWrapper(
          onRequest: (options, handler) {
            capturedBody = Map<String, dynamic>.from(options.data as Map);
            handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 200,
                data: {'processedMutations': []},
              ),
            );
          },
        ),
      );

    await offlineQueue.flush(httpClient: capturingDio);

    final mutations = capturedBody!['mutations'] as List;
    expect(mutations, hasLength(2));
    final actions = mutations
        .map((m) => (m as Map)['action'] as String)
        .toSet();
    expect(actions, containsAll({'leave_apply', 'leave_cancel'}));
    for (final mutation in mutations) {
      final map = mutation as Map;
      expect(map['id'], isNotEmpty);
      expect(map['timestamp'], isNotEmpty);
      expect(map['payload'], isA<Map>());
    }

    // Drain the unconfirmed remainder to keep tests isolated.
    for (final event in offlineQueue.getPendingEvents()) {
      await offlineQueue.markCompleted(event.clientEventId);
    }
    expect(offlineQueue.getPendingEvents(), isEmpty);
  });
}
