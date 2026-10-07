import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:image_picker/image_picker.dart';
import 'package:thaibahive_mobile/app/capability_registry.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_repository.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox_uploader.dart';
import 'package:thaibahive_mobile/features/media/data/media_providers.dart';
import 'package:thaibahive_mobile/features/media/data/media_repository.dart';
import 'package:thaibahive_mobile/features/media/presentation/media_screen.dart';
import 'package:thaibahive_mobile/models/auth_response_model.dart';
import 'package:thaibahive_mobile/models/user_model.dart';

/// Seeded gallery notifier for tests.
class _SeededGallery extends MediaGalleryNotifier {
  _SeededGallery() : super() {
    state = AsyncValue.data([
      MediaAssetModel(
        id: 'a1',
        name: 'Campus Event.jpg',
        mimeType: 'image/jpeg',
        fileType: 'image',
        fileSize: 1024 * 1024,
        thumbnailUrl: '/thumb/a1.jpg',
        fileUrl: '/file/a1.jpg',
      ),
      MediaAssetModel(
        id: 'a2',
        name: 'Sports Day.mp4',
        mimeType: 'video/mp4',
        fileType: 'video',
        fileSize: 50 * 1024 * 1024,
        thumbnailUrl: '/thumb/a2.jpg',
        fileUrl: '/file/a2.mp4',
      ),
    ]);
  }

  @override
  Future<List<MediaAssetModel>> build() async => [
        MediaAssetModel(
          id: 'a1',
          name: 'Campus Event.jpg',
          mimeType: 'image/jpeg',
          fileType: 'image',
          fileSize: 1024 * 1024,
          thumbnailUrl: '/thumb/a1.jpg',
          fileUrl: '/file/a1.jpg',
        ),
        MediaAssetModel(
          id: 'a2',
          name: 'Sports Day.mp4',
          mimeType: 'video/mp4',
          fileType: 'video',
          fileSize: 50 * 1024 * 1024,
          thumbnailUrl: '/thumb/a2.jpg',
          fileUrl: '/file/a2.mp4',
        ),
      ];
}

/// Seeded folders notifier for tests.
class _SeededFolders extends MediaFoldersNotifier {
  _SeededFolders() : super() {
    state = AsyncValue.data([]);
  }

  @override
  Future<List<MediaFolderModel>> build() async => [];
}

/// Controllable network status for testing online/offline transitions.
class _ControllableNetwork extends NetworkService {
  _ControllableNetwork(NetworkStatus initial) : super() {
    state = initial;
  }

  void _init() {
    // Skip real connectivity listener
  }

  void setOnline(bool online) => state = online ? NetworkStatus.online : NetworkStatus.offline;
}

class _SeededAuth extends AuthNotifier {
  _SeededAuth(AuthState initial) : super(_FakeAuthRepository(), const FlutterSecureStorage()) {
    state = initial;
  }
}

class _FakeAuthRepository extends AuthRepository {
  _FakeAuthRepository() : super(Dio());

  @override
  Future<AuthResponseModel> login(String email, String password, {bool rememberMe = false}) async =>
      throw UnimplementedError();
  @override
  Future<AuthResponseModel> signup(Map<String, dynamic> data) async => throw UnimplementedError();
  @override
  Future<UserModel> getProfile() async => throw UnimplementedError();
  @override
  Future<void> logout() async {}
  @override
  Future<AuthResponseModel> refreshAccessToken(String refreshToken) async => throw UnimplementedError();
  @override
  Future<AuthResponseModel> loginWithGoogle(String idToken) async => throw UnimplementedError();
  @override
  Future<String> getHandoffNonce({String? firstName, String? lastName}) async => throw UnimplementedError();
}

void main() {
  late Directory hiveDir;
  late Directory stagingDir;
  late MediaOutboxStore store;
  late Dio dio;
  late MediaOutboxUploader uploader;

  Future<void> openStore() async {
    store = MediaOutboxStore();
    await store.init(hiveHomePath: hiveDir.path, stagingDir: stagingDir);
  }

  List<Override> buildOverrides({
    NetworkStatus networkStatus = NetworkStatus.online,
    String role = 'staff',
  }) {
    final authState = AuthState(
      status: AuthStatus.authenticated,
      user: UserModel(
        id: 'u1',
        email: 'test@test.com',
        employeeId: 'e1',
        firstName: 'Test',
        lastName: 'User',
        role: role,
        isActive: true,
        createdAt: DateTime(2026, 1, 1),
        updatedAt: DateTime(2026, 1, 1),
      ),
      token: 'fake-token',
    );

    return [
      authProvider.overrideWith((ref) => _SeededAuth(authState)),
      networkStatusProvider.overrideWith((ref) => _ControllableNetwork(networkStatus)),
      mediaUploaderProvider.overrideWith((ref) {
        dio = Dio(BaseOptions(
          baseUrl: 'http://stub.local/api',
          validateStatus: (s) => s != null && s >= 200 && s < 300,
        ))..httpClientAdapter = StubServer();
        uploader = MediaOutboxUploader(store: store, dio: dio);
        return uploader;
      }),
      mediaOutboxStoreProvider.overrideWith((ref) => store),
      mediaGalleryProvider.overrideWith(() => _SeededGallery()),
      mediaFoldersProvider.overrideWith(() => _SeededFolders()),
    ];
  }

  Future<void> pumpMediaScreen(WidgetTester tester,
      {List<Override> overrides = const []}) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: overrides,
        child: const MaterialApp(home: MediaScreen()),
      ),
    );
    await tester.pumpAndSettle(const Duration(seconds: 5));
  }

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('media_screen_hive');
    stagingDir = await Directory.systemTemp.createTemp('media_screen_stage');
    await openStore();
  });

  tearDown(() async {
    await store.close();
    await Hive.close();
    for (final dir in [hiveDir, stagingDir]) {
      if (await dir.exists()) await dir.delete(recursive: true);
    }
  });

  group('MediaScreen', () {
    testWidgets('gallery renders repo data with thumbnails', (tester) async {
      await pumpMediaScreen(tester);

      // Gallery tab is default (index 0)
      expect(find.text('Campus Event.jpg'), findsOneWidget);
      expect(find.text('Sports Day.mp4'), findsOneWidget);
    });

    testWidgets('capture tab hidden when no capture capability', (tester) async {
      await pumpMediaScreen(tester, overrides: buildOverrides(role: 'hod'));

      await tester.tap(find.text('Capture'));
      await tester.pumpAndSettle();

      // Should show empty state for no capture capability
      expect(find.text('Capture Unavailable'), findsOneWidget);
      expect(find.text('Open Camera'), findsNothing);
      expect(find.text('Pick from Gallery'), findsNothing);
    });
  });
}

/// Routes stubbed responses by path/host.
class StubServer implements HttpClientAdapter {
  Future<ResponseBody> Function(RequestOptions options, String? body)? onUpload;
  Future<ResponseBody> Function(RequestOptions options)? onSign;
  Future<ResponseBody> Function(RequestOptions options)? onComplete;
  Future<ResponseBody> Function(RequestOptions options)? onStoragePut;

  Duration uploadDelay = Duration.zero;
  final List<String> log = [];
  final List<String> uploadClientEventIds = [];
  int inFlight = 0;
  int maxInFlight = 0;

  static ResponseBody json(int status, Object data) => ResponseBody.fromString(
        jsonEncode(data),
        status,
        headers: {
          Headers.contentTypeHeader: [Headers.jsonContentType],
        },
      );

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    log.add('${options.method} ${options.uri}');
    inFlight++;
    if (inFlight > maxInFlight) maxInFlight = inFlight;
    try {
      var bodyText = '';
      if (requestStream != null) {
        final bytes = await requestStream.fold<List<int>>(
          <int>[],
          (acc, chunk) => acc..addAll(chunk),
        );
        bodyText = utf8.decode(bytes, allowMalformed: true);
      }

      if (options.uri.host == 'storage.example.com') {
        final handler = onStoragePut;
        if (handler == null) return json(500, {'error': 'no put route'});
        return await handler(options);
      }

      final path = options.uri.path;
      if (path.endsWith('/upload')) {
        final match = RegExp(r'name="clientEventId"\r?\n\r?\n([^\r\n]+)')
            .firstMatch(bodyText);
        if (match != null) uploadClientEventIds.add(match.group(1)!);
        if (uploadDelay > Duration.zero) {
          await Future<void>.delayed(uploadDelay);
        }
        final handler = onUpload;
        if (handler == null) return json(404, {'error': 'no upload route'});
        return await handler(options, bodyText);
      }
      if (path.endsWith('/sign')) {
        final handler = onSign;
        if (handler == null) return json(404, {'error': 'no sign route'});
        return await handler(options);
      }
      if (path.endsWith('/complete')) {
        final handler = onComplete;
        if (handler == null) return json(404, {'error': 'no complete route'});
        return await handler(options);
      }
      return json(404, {'error': 'unrouted ${options.uri}'});
    } finally {
      inFlight--;
    }
  }

  @override
  void close({bool force = false}) {}
}