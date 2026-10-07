import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox_uploader.dart';

/// Routes stubbed responses by path/host. Only consumes the request body for
/// `/upload` (to extract the clientEventId for FIFO assertions).
class StubServer implements HttpClientAdapter {
  Future<ResponseBody> Function(RequestOptions options, String? body)? onUpload;
  Future<ResponseBody> Function(RequestOptions options)? onSign;
  Future<ResponseBody> Function(RequestOptions options)? onComplete;
  Future<ResponseBody> Function(RequestOptions options)? onStoragePut;
  Future<ResponseBody> Function(RequestOptions options)? onMediaAssets;
  Future<ResponseBody> Function(RequestOptions options)? onMediaFolders;

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
      if (path.endsWith('/media/assets')) {
        final handler = onMediaAssets;
        if (handler == null) return json(200, {'assets': []});
        return await handler(options);
      }
      if (path.endsWith('/media/folders')) {
        final handler = onMediaFolders;
        if (handler == null) return json(200, {'folders': []});
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

class _SeededNetwork extends NetworkService {
  _SeededNetwork(NetworkStatus initial) : super() {
    state = initial;
  }

  void _init() {
    // Skip real connectivity listener in tests
  }
}

void main() {
  late Directory hiveDir;
  late Directory stagingDir;
  late Directory sourceDir;
  late MediaOutboxStore store;
  late StubServer server;
  late Dio dio;
  late MediaOutboxUploader uploader;

  Future<void> openStore() async {
    store = MediaOutboxStore();
    await store.init(hiveHomePath: hiveDir.path, stagingDir: stagingDir);
  }

  Future<MediaJob> enqueueBytes(Uint8List bytes, {String name = 'shot.jpg'}) async {
    final source = File('${sourceDir.path}/$name');
    await source.writeAsBytes(bytes, flush: true);
    return store.enqueue(
      source: source,
      originalName: name,
      mimeType: name.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg',
    );
  }

  Future<MediaJob> enqueueSmall() =>
      enqueueBytes(Uint8List.fromList(List<int>.filled(2048, 3)));

  Future<MediaJob> enqueueBig() =>
      enqueueBytes(Uint8List.fromList(List<int>.filled(kPresignThresholdBytes + 64, 9)),
          name: 'clip.mp4');

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('media_up_hive');
    stagingDir = await Directory.systemTemp.createTemp('media_up_stage');
    sourceDir = await Directory.systemTemp.createTemp('media_up_src');
    await openStore();

    server = StubServer();
    dio = Dio(BaseOptions(
      baseUrl: 'http://stub.local/api',
      validateStatus: (s) => s != null && s >= 200 && s < 300,
    ))..httpClientAdapter = server;
    uploader = MediaOutboxUploader(store: store, dio: dio);
  });

  tearDown(() async {
    await store.close();
    await Hive.close();
    for (final dir in [hiveDir, stagingDir, sourceDir]) {
      if (await dir.exists()) await dir.delete(recursive: true);
    }
  });

  group('transport selection (D1 hybrid)', () {
    test('multipart strictly below 4 MB, presign at/above', () {
      expect(selectTransport(1), TransportKind.multipart);
      expect(selectTransport(kPresignThresholdBytes - 1), TransportKind.multipart);
      expect(selectTransport(kPresignThresholdBytes), TransportKind.presign);
      expect(selectTransport(50 * 1024 * 1024), TransportKind.presign);
    });

    test('classifyStatusCode maps the documented failure classes', () {
      expect(classifyStatusCode(null), UploadFailureKind.retryable);
      expect(classifyStatusCode(500), UploadFailureKind.retryable);
      expect(classifyStatusCode(503), UploadFailureKind.retryable);
      expect(classifyStatusCode(429), UploadFailureKind.rateLimited);
      expect(classifyStatusCode(422), UploadFailureKind.checksumMismatch);
      expect(classifyStatusCode(400), UploadFailureKind.nonRetryable);
      expect(classifyStatusCode(403), UploadFailureKind.nonRetryable);
      expect(classifyStatusCode(404), UploadFailureKind.nonRetryable);
    });
  });

  group('multipart happy path', () {
    test('hashes, uploads via /upload, records the asset and frees the stage',
        () async {
      final job = await enqueueSmall();
      final expectedSha = (await File(job.stagedPath).readAsBytes()).length;

      server.onUpload = (options, body) async =>
          StubServer.json(201, {'url': '/upload/files/a1.jpg', 'asset': {'id': 'a1'}});

      final summary = await uploader.drain();

      expect(summary.completed, 1);
      expect(summary.failed, 0);
      expect(summary.dead, 0);

      final done = store.job(job.clientEventId)!;
      expect(done.status, MediaJobStatus.completed);
      expect(done.sha256, hasLength(64), reason: 'digest persisted for receipts');
      expect(done.fileUrl, '/upload/files/a1.jpg');
      expect(done.assetId, 'a1');
      expect(done.progress, 1);
      expect(done.errorMessage, isNull);
      expect(File(job.stagedPath).existsSync(), isFalse);
      expect(server.log, ['POST http://stub.local/api/upload']);
      expect(expectedSha, 2048);

      // Receipts remain visible after completion (drain skips them).
      expect(store.allJobs().single.status, MediaJobStatus.completed);
      expect(store.dueJobs(), isEmpty);
      expect(await uploader.drain(), (s) => s.processed == 0);
    });
  });

  group('presign happy path (≥ 4 MB)', () {
    test('sign → PUT → complete in order, then completes', () async {
      final job = await enqueueBig();

      server.onSign = (options) async => StubServer.json(200, {
            'mode': 'presign',
            'uploadUrl': 'https://storage.example.com/bucket/put',
            'path': 'private_tmp/tenant_1/dept_general/u1.mp4',
            'fileUrl': '/api/upload/files/u1.mp4',
          });
      server.onStoragePut = (options) async => StubServer.json(200, {});
      server.onComplete = (options) async => StubServer.json(201, {
            'asset': {'id': 'a9', 'fileUrl': '/api/upload/files/assets/a9.mp4'},
          });

      final summary = await uploader.drain();

      expect(summary.completed, 1);
      expect(server.log, [
        'POST http://stub.local/api/media/upload/sign',
        'PUT https://storage.example.com/bucket/put',
        'POST http://stub.local/api/media/upload/complete',
      ]);

      final done = store.job(job.clientEventId)!;
      expect(done.status, MediaJobStatus.completed);
      expect(done.signedPath, 'private_tmp/tenant_1/dept_general/u1.mp4');
      expect(done.assetId, 'a9');
      expect(done.fileUrl, '/api/upload/files/assets/a9.mp4');
      expect(File(job.stagedPath).existsSync(), isFalse);
    });

    test('server-side sign fallback (storage unconfigured) degrades to multipart',
        () async {
      final job = await enqueueBig();

      server.onSign = (options) async =>
          StubServer.json(200, {'mode': 'multipart', 'uploadUrl': '/api/upload'});
      server.onUpload = (options, body) async =>
          StubServer.json(201, {'url': '/upload/files/f1.mp4', 'asset': {'id': 'f1'}});

      final summary = await uploader.drain();

      expect(summary.completed, 1);
      expect(server.log, [
        'POST http://stub.local/api/media/upload/sign',
        'POST http://stub.local/api/upload',
      ]);
      expect(store.job(job.clientEventId)!.status, MediaJobStatus.completed);
    });

    test('a failed presigned PUT is retryable and keeps the staged bytes',
        () async {
      final job = await enqueueBig();

      server.onSign = (options) async => StubServer.json(200, {
            'mode': 'presign',
            'uploadUrl': 'https://storage.example.com/bucket/put',
            'path': 'private_tmp/x.mp4',
          });
      server.onStoragePut =
          (options) async => StubServer.json(500, {'error': 'storage down'});

      final summary = await uploader.drain();

      expect(summary.failed, 1);
      final retrying = store.job(job.clientEventId)!;
      expect(retrying.status, MediaJobStatus.staged);
      expect(retrying.attempts, 1);
      expect(retrying.nextAttemptAt!.isAfter(DateTime.now()), isTrue);
      expect(File(job.stagedPath).existsSync(), isTrue);
      expect(store.isPaused(), isFalse, reason: '5xx never pauses the drain');
    });
  });

  group('429 → pause (persisted)', () {
    test('pauses the drain, keeps the job, and blocks later drains until expiry',
        () async {
      final job = await enqueueSmall();
      server.onUpload =
          (options, body) async => StubServer.json(429, {'error': 'slow down'});

      final first = await uploader.drain();
      expect(first.paused, isTrue);
      expect(first.failed, 0);

      final pausedJob = store.job(job.clientEventId)!;
      expect(pausedJob.status, MediaJobStatus.staged);
      expect(pausedJob.attempts, 1);
      expect(store.isPaused(), isTrue);

      final callsBefore = server.log.length;
      final second = await uploader.drain();
      expect(second.paused, isTrue);
      expect(server.log, hasLength(callsBefore), reason: 'no network while paused');

      // Expiry reopens the flow (the job also waits out its own 5s backoff —
      // a coordinator retry clears it, same as the outbox UI).
      await store.pauseDrainUntil(DateTime.now().subtract(const Duration(seconds: 1)));
      await store.retry(job.clientEventId);
      server.onUpload = (options, body) async =>
          StubServer.json(201, {'url': '/upload/files/ok.jpg', 'asset': {'id': 'ok'}});
      final third = await uploader.drain();
      expect(third.paused, isFalse);
      expect(third.completed, 1);
      expect(store.job(job.clientEventId)!.status, MediaJobStatus.completed);
    });
  });

  group('422 → rehash once, then dead', () {
    test('first 422 clears the digest and retries, second run completes', () async {
      final job = await enqueueSmall();
      var uploads = 0;
      server.onUpload = (options, body) async {
        uploads++;
        if (uploads == 1) {
          return StubServer.json(422, {'error': 'checksum_mismatch'});
        }
        return StubServer.json(201,
            {'url': '/upload/files/fixed.jpg', 'asset': {'id': 'fixed'}});
      };

      final first = await uploader.drain();
      expect(first.failed, 1);
      var staged = store.job(job.clientEventId)!;
      expect(staged.status, MediaJobStatus.staged);
      expect(staged.hashRetried, isTrue);
      expect(staged.sha256, isNull, reason: 'digest cleared → fresh hash next run');
      expect(staged.attempts, 1);
      expect(staged.errorMessage, contains('rehash'));

      await store.retry(job.clientEventId); // clear the backoff
      final second = await uploader.drain();
      expect(second.completed, 1);

      final done = store.job(job.clientEventId)!;
      expect(done.status, MediaJobStatus.completed);
      expect(done.sha256, hasLength(64), reason: 'rehashed digest uploaded');
      expect(uploads, 2);
    });

    test('a second 422 dead-letters the job', () async {
      final job = await enqueueSmall();
      server.onUpload =
          (options, body) async => StubServer.json(422, {'error': 'checksum_mismatch'});

      await uploader.drain();
      await store.retry(job.clientEventId);
      final second = await uploader.drain();

      expect(second.dead, 1);
      final dead = store.job(job.clientEventId)!;
      expect(dead.status, MediaJobStatus.dead);
      expect(dead.errorMessage, contains('rehash'));
      expect(File(job.stagedPath).existsSync(), isTrue,
          reason: 'dead jobs keep bytes for manual inspection');
      expect(store.deadCount(), 1);
    });
  });

  group('other failure classes', () {
    test('400 is fatal immediately (DLQ), keeping the staged bytes', () async {
      final job = await enqueueSmall();
      server.onUpload =
          (options, body) async => StubServer.json(400, {'error': 'rejected'});

      final summary = await uploader.drain();
      expect(summary.dead, 1);
      final dead = store.job(job.clientEventId)!;
      expect(dead.status, MediaJobStatus.dead);
      expect(dead.attempts, 1);
      expect(dead.errorMessage, isNotNull);
      expect(File(job.stagedPath).existsSync(), isTrue);
    });

    test('500 backs off with attempts and survives for a later drain', () async {
      final job = await enqueueSmall();
      server.onUpload =
          (options, body) async => StubServer.json(500, {'error': 'boom'});

      final summary = await uploader.drain();
      expect(summary.failed, 1);
      final retrying = store.job(job.clientEventId)!;
      expect(retrying.status, MediaJobStatus.staged);
      expect(retrying.attempts, 1);
      expect(retrying.nextAttemptAt!.isAfter(DateTime.now()), isTrue);
      expect(File(job.stagedPath).existsSync(), isTrue);
      expect(store.isPaused(), isFalse);
    });
  });

  group('drain mechanics', () {
    test('FIFO with concurrency 2 — capture order respected, never more than 2 in flight',
        () async {
      final jobs = <MediaJob>[];
      for (var i = 0; i < 3; i++) {
        jobs.add(await enqueueBytes(Uint8List.fromList(List<int>.filled(512, i)),
            name: 'f$i.jpg'));
      }
      server.uploadDelay = const Duration(milliseconds: 60);
      server.onUpload = (options, body) async => StubServer.json(201, {
            'url': '/upload/files/x.jpg',
            'asset': {'id': 'x${server.uploadClientEventIds.length}'},
          });

      final summary = await uploader.drain();

      expect(summary.completed, 3);
      expect(server.maxInFlight, 2, reason: 'concurrency cap is 2');
      final ids = server.uploadClientEventIds;
      expect(ids, hasLength(3));
      // The first two uploads are exactly the first two captures (in some
      // order); the third capture always goes last.
      expect(ids.take(2).toSet(), {jobs[0].clientEventId, jobs[1].clientEventId});
      expect(ids.last, jobs[2].clientEventId);
      for (final job in jobs) {
        expect(store.job(job.clientEventId)!.status, MediaJobStatus.completed);
      }
    });

    test('an interrupted transient state is recovered and uploaded on restart',
        () async {
      final job = await enqueueSmall();
      // Simulate an app kill mid-upload: record sits in `uploading` with a
      // valid digest (e.g. the presign PUT was in flight when the OS killed us).
      await store.applyEvent(job.clientEventId, MediaJobEvent.start);
      await store.applyEvent(job.clientEventId, MediaJobEvent.hashOk);
      final staged = store.job(job.clientEventId)!;
      await store.save(staged.copyWith(sha256: 'c' * 64));

      await store.close();
      await openStore();
      uploader = MediaOutboxUploader(store: store, dio: dio);

      server.onUpload = (options, body) async =>
          StubServer.json(201, {'url': '/upload/files/r.jpg', 'asset': {'id': 'r'}});
      final summary = await uploader.drain();

      expect(summary.completed, 1);
      final done = store.job(job.clientEventId)!;
      expect(done.status, MediaJobStatus.completed);
      expect(done.sha256, 'c' * 64, reason: 'reused digest — never rehashed');
    });
  });
}
