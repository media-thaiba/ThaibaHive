import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/core/services/offline_queue_providers.dart';
import 'package:thaibahive_mobile/core/services/sync_coordinator.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_repository.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/features/sync/data/sync_status_providers.dart';
import 'package:thaibahive_mobile/features/sync/presentation/sync_status_screen.dart';
import 'package:thaibahive_mobile/models/user_model.dart';
import 'package:thaibahive_mobile/shared/widgets/failed_sync_banner.dart';

Dio createMockDio({
  List<Map<String, dynamic>> conflicts = const [],
  bool resolveSuccess = true,
  String? resolveError,
}) {
  final dio = Dio();
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        if (options.path.contains('/mobile/v1/sync/conflicts') &&
            options.method == 'GET') {
          return handler.resolve(
            Response(
              requestOptions: options,
              statusCode: 200,
              data: {'conflicts': conflicts},
            ),
          );
        }
        if (options.path.contains('/resolve') && options.method == 'POST') {
          if (!resolveSuccess) {
            return handler.resolve(
              Response(
                requestOptions: options,
                statusCode: 400,
                data: {'error': resolveError ?? 'Failed to apply resolution'},
              ),
            );
          }
          return handler.resolve(
            Response(
              requestOptions: options,
              statusCode: 200,
              data: {
                'success': true,
                'conflict': {
                  'id': 'c1',
                  'status': 'SYNCED',
                  'fields': options.data?['fields'] ?? {},
                },
              },
            ),
          );
        }
        return handler.resolve(
          Response(
            requestOptions: options,
            statusCode: 200,
            data: {},
          ),
        );
      },
    ),
  );
  return dio;
}

class _TestAuthNotifier extends StateNotifier<AuthState> implements AuthNotifier {
  _TestAuthNotifier(UserModel user)
      : super(
          AuthState(
            status: AuthStatus.authenticated,
            user: user,
            token: 'mock-jwt-token',
          ),
        );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeSyncCoordinator extends SyncCoordinator {
  _FakeSyncCoordinator(Ref ref)
      : super(
          offlineQueue: offlineQueue,
          connectivity: Connectivity(),
          ref: ref,
          autoStart: false,
        );

  @override
  Future<SyncResult> syncNow({SyncTrigger trigger = SyncTrigger.manual}) async {
    return SyncResult(
      confirmed: 0,
      conflicts: 0,
      trigger: trigger,
    );
  }
}

class _MockRef implements Ref {
  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _SeededSyncStatusNotifier extends SyncStatusNotifier {
  _SeededSyncStatusNotifier(SyncStatusState initialState)
      : super(Dio(), _MockRef()) {
    state = initialState;
  }

  @override
  Future<void> loadStatus() async {}
}

UserModel _createUser({
  required String id,
  required String email,
  required String role,
}) {
  final now = DateTime.now();
  return UserModel(
    id: id,
    email: email,
    employeeId: 'EMP-$id',
    firstName: 'Test',
    lastName: 'User',
    role: role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  );
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late Directory tempDir;

  setUpAll(() async {
    FlutterSecureStorage.setMockInitialValues({});
    tempDir = await Directory.systemTemp.createTemp('sync_status_test');
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async => tempDir.path,
    );
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('dev.fluttercommunity.plus/connectivity'),
      (MethodCall methodCall) async => ['wifi'],
    );
    Hive.init(tempDir.path);
  });

  tearDownAll(() async {
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  tearDown(() async {
    final events = offlineQueue.getAllEvents();
    for (final e in events) {
      await offlineQueue.markCompleted(e.clientEventId);
    }
  });

  group('SyncStatusNotifier Unit Tests', () {
    test('loads server conflicts and local DLQ events correctly', () async {
      final mockDio = createMockDio(conflicts: [
        {
          'id': 'conf-1',
          'clientEventId': 'ev-1',
          'entityType': 'task',
          'mutationType': 'UPDATE',
          'status': 'CONFLICT',
          'fields': ['title', 'status'],
          'payload': {'title': 'Updated from mobile', 'status': 'completed'},
        }
      ]);

      // Enqueue a failed event in local queue (terminal failure transitions to DLQ)
      final failedEvent = await offlineQueue.enqueue(
        type: 'task_create',
        payload: {'title': 'Failed task'},
      );
      await offlineQueue.markFailed(failedEvent.clientEventId, 'Server error', isTerminal: true);

      final container = ProviderContainer(
        overrides: [
          dioProvider.overrideWithValue(mockDio),
          offlineQueueProvider.overrideWithValue(offlineQueue),
          syncCoordinatorProvider.overrideWith((ref) => _FakeSyncCoordinator(ref)),
        ],
      );

      final notifier = container.read(syncStatusProvider.notifier);
      await notifier.loadStatus();

      final state = container.read(syncStatusProvider);
      expect(state.conflicts.length, equals(1));
      expect(state.conflicts.first.entityType, equals('task'));
      expect(state.conflicts.first.status, equals('CONFLICT'));
      expect(state.conflicts.first.fields, contains('title'));

      expect(state.dlqEvents.length, equals(1));
      expect(state.dlqEvents.first.clientEventId, equals(failedEvent.clientEventId));
      expect(state.totalIssuesCount, equals(2));
    });

    test('retryEvent resets failed event to pending', () async {
      final event = await offlineQueue.enqueue(
        type: 'leave_apply',
        payload: {'reason': 'Medical'},
      );
      await offlineQueue.markFailed(event.clientEventId, 'Network error', isTerminal: true);

      final mockDio = createMockDio();
      final container = ProviderContainer(
        overrides: [
          dioProvider.overrideWithValue(mockDio),
          offlineQueueProvider.overrideWithValue(offlineQueue),
          syncCoordinatorProvider.overrideWith((ref) => _FakeSyncCoordinator(ref)),
        ],
      );

      final notifier = container.read(syncStatusProvider.notifier);
      await notifier.retryEvent(event.clientEventId);

      expect(offlineQueue.getFailedEvents(), isEmpty);
      expect(offlineQueue.getPendingEvents().length, equals(1));
    });

    test('resolveConflict calls POST /resolve with chosen fields', () async {
      final mockDio = createMockDio(conflicts: [
        {
          'id': 'conf-99',
          'entityType': 'task',
          'status': 'CONFLICT',
          'fields': ['title'],
          'payload': {'title': 'Chosen Title'},
        }
      ]);

      final container = ProviderContainer(
        overrides: [
          dioProvider.overrideWithValue(mockDio),
          offlineQueueProvider.overrideWithValue(offlineQueue),
          syncCoordinatorProvider.overrideWith((ref) => _FakeSyncCoordinator(ref)),
        ],
      );

      final notifier = container.read(syncStatusProvider.notifier);
      final success = await notifier.resolveConflict('conf-99', {'title': 'Chosen Title'});

      expect(success, isTrue);
      expect(container.read(syncStatusProvider).isResolving, isFalse);
    });
  });

  group('SyncStatusScreen & SyncStatusBanner Widget Tests', () {
    testWidgets('renders failed DLQ events with Retry and Discard actions', (tester) async {
      final seededState = SyncStatusState(
        dlqEvents: [
          OfflineEvent(
            clientEventId: 'ev-test-1',
            type: 'expense_create',
            payload: {'amount': 150},
            status: QueueStatus.failed,
            createdAt: DateTime(2026, 10, 7, 10, 0),
            errorMessage: 'Simulated timeout',
            retryCount: 3,
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            syncStatusProvider.overrideWith((ref) => _SeededSyncStatusNotifier(seededState)),
            authProvider.overrideWith(
              (ref) => _TestAuthNotifier(
                _createUser(id: 'u1', email: 'test@thaiba.edu', role: 'staff'),
              ),
            ),
          ],
          child: const MaterialApp(
            home: SyncStatusScreen(),
          ),
        ),
      );

      await tester.pump();

      expect(find.text('expense_create'), findsOneWidget);
      expect(find.textContaining('Failed'), findsWidgets);
      expect(find.text('Retry Now'), findsOneWidget);
      expect(find.text('Discard'), findsOneWidget);
    });

    testWidgets('renders conflict diff and handles role-gated NEEDS_REVIEW resolution', (tester) async {
      final seededState = SyncStatusState(
        conflicts: [
          const SyncConflictModel(
            id: 'conf-rev',
            entityType: 'leave',
            status: 'NEEDS_REVIEW',
            fields: ['startDate', 'endDate'],
            payload: {'startDate': '2026-10-10', 'endDate': '2026-10-12'},
          ),
        ],
      );

      // Regular staff user without sync:manage
      final staffUser = _createUser(
        id: 'u1',
        email: 'teacher@thaiba.edu',
        role: 'staff',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            syncStatusProvider.overrideWith((ref) => _SeededSyncStatusNotifier(seededState)),
            authProvider.overrideWith((ref) => _TestAuthNotifier(staffUser)),
          ],
          child: const MaterialApp(
            home: SyncStatusScreen(),
          ),
        ),
      );

      await tester.pump();

      // Switch to Conflicts tab
      await tester.tap(find.text('Conflicts'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('LEAVE CONFLICT'), findsOneWidget);
      expect(find.text('NEEDS_REVIEW'), findsOneWidget);
      expect(find.textContaining('administrator review'), findsOneWidget);
      expect(find.text('Keep Mine'), findsNothing, reason: 'Staff role must not see resolve button for NEEDS_REVIEW');
    });

    testWidgets('admin role sees resolve buttons for NEEDS_REVIEW conflict', (tester) async {
      final seededState = SyncStatusState(
        conflicts: [
          const SyncConflictModel(
            id: 'conf-admin',
            entityType: 'task',
            status: 'NEEDS_REVIEW',
            fields: ['status'],
            payload: {'status': 'completed'},
          ),
        ],
      );

      final adminUser = _createUser(
        id: 'a1',
        email: 'admin@thaiba.edu',
        role: 'admin',
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            syncStatusProvider.overrideWith((ref) => _SeededSyncStatusNotifier(seededState)),
            authProvider.overrideWith((ref) => _TestAuthNotifier(adminUser)),
          ],
          child: const MaterialApp(
            home: SyncStatusScreen(),
          ),
        ),
      );

      await tester.pump();

      // Switch to Conflicts tab
      await tester.tap(find.text('Conflicts'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));

      expect(find.text('TASK CONFLICT'), findsOneWidget);
      expect(find.text('Keep Mine'), findsOneWidget, reason: 'Admin role should see resolve buttons');
      expect(find.text('Keep Server'), findsOneWidget);
    });

    testWidgets('SyncStatusBanner displays total issues count when issues exist', (tester) async {
      final seededState = SyncStatusState(
        conflicts: [
          const SyncConflictModel(
            id: 'c-b1',
            entityType: 'task',
            status: 'CONFLICT',
            fields: ['title'],
            payload: {},
          ),
        ],
        dlqEvents: [
          OfflineEvent(
            clientEventId: 'ev-b1',
            type: 'task_create',
            payload: {'title': 'Banner test task'},
            status: QueueStatus.failed,
            createdAt: DateTime(2026, 10, 7, 10, 0),
            errorMessage: 'Error 1',
            retryCount: 3,
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            failedEventsCountProvider.overrideWith((ref) => Stream.value(1)),
            syncStatusProvider.overrideWith((ref) => _SeededSyncStatusNotifier(seededState)),
            authProvider.overrideWith(
              (ref) => _TestAuthNotifier(
                _createUser(id: 'u1', email: 'test@thaiba.edu', role: 'staff'),
              ),
            ),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: SyncStatusBanner(),
            ),
          ),
        ),
      );

      await tester.pump();

      expect(find.textContaining('sync issue'), findsOneWidget);
      expect(find.text('Details'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });
  });
}
