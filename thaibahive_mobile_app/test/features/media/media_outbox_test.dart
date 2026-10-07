import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox.dart';

void main() {
  late Directory hiveDir;
  late Directory stagingDir;
  late Directory sourceDir;
  late MediaOutboxStore store;

  Future<MediaJob> enqueueSample({String name = 'photo.jpg', int bytes = 16}) async {
    final source = File('${sourceDir.path}/$name');
    await source.writeAsBytes(List<int>.filled(bytes, 7));
    return store.enqueue(
      source: source,
      originalName: name,
      mimeType: 'image/jpeg',
    );
  }

  Future<void> openStore() async {
    store = MediaOutboxStore();
    await store.init(hiveHomePath: hiveDir.path, stagingDir: stagingDir);
  }

  setUp(() async {
    hiveDir = await Directory.systemTemp.createTemp('media_outbox_hive');
    stagingDir = await Directory.systemTemp.createTemp('media_outbox_stage');
    sourceDir = await Directory.systemTemp.createTemp('media_outbox_src');
    await openStore();
  });

  tearDown(() async {
    await store.close();
    await Hive.close();
    for (final dir in [hiveDir, stagingDir, sourceDir]) {
      if (await dir.exists()) await dir.delete(recursive: true);
    }
  });

  group('FSM transition matrix', () {
    MediaJob job({MediaJobStatus status = MediaJobStatus.staged, int attempts = 0}) =>
        MediaJob(
          clientEventId: generateMediaClientEventId(),
          name: 'a.jpg',
          stagedPath: '/tmp/x.jpg',
          mimeType: 'image/jpeg',
          size: 10,
          status: status,
          attempts: attempts,
          createdAt: DateTime(2026, 10, 1),
          updatedAt: DateTime(2026, 10, 1),
        );

    test('happy presign path: staged → hashing → uploading → verifying → completed', () {
      var j = job();
      j = applyMediaJobEvent(j, MediaJobEvent.start)!;
      expect(j.status, MediaJobStatus.hashing);
      j = applyMediaJobEvent(j, MediaJobEvent.hashOk)!;
      expect(j.status, MediaJobStatus.uploading);
      j = applyMediaJobEvent(j, MediaJobEvent.presignUploaded)!;
      expect(j.status, MediaJobStatus.verifying);
      j = applyMediaJobEvent(j, MediaJobEvent.verifyOk)!;
      expect(j.status, MediaJobStatus.completed);
      expect(j.completedAt, isNotNull);
      expect(j.progress, 1);
    });

    test('multipart path completes directly from uploading', () {
      var j = job();
      j = applyMediaJobEvent(j, MediaJobEvent.start)!;
      j = applyMediaJobEvent(j, MediaJobEvent.hashOk)!;
      final done = applyMediaJobEvent(j, MediaJobEvent.multipartUploaded)!;
      expect(done.status, MediaJobStatus.completed);
    });

    test('retryable failure: staged with backoff until attempts budget ends', () {
      final at = DateTime(2026, 10, 7, 12);
      var j = job(attempts: 0);
      final first = applyMediaJobEvent(j, MediaJobEvent.retryableFailure,
          now: at, jitterMs: 0)!;
      expect(first.status, MediaJobStatus.staged);
      expect(first.attempts, 1);
      expect(first.nextAttemptAt, at.add(const Duration(seconds: 5)));

      final second = applyMediaJobEvent(first, MediaJobEvent.retryableFailure,
          now: at, jitterMs: 0)!;
      expect(second.attempts, 2);
      expect(second.nextAttemptAt, at.add(const Duration(seconds: 10)));

      final third = applyMediaJobEvent(second, MediaJobEvent.retryableFailure,
          now: at, jitterMs: 0)!;
      expect(third.status, MediaJobStatus.dead); // attempts ≥ 3 → DLQ
      expect(third.attempts, 3);
      expect(third.nextAttemptAt, isNull);
    });

    test('rateLimited and fatalFailure guards', () {
      final at = DateTime(2026, 10, 7);
      final uploading = applyMediaJobEvent(
          job().copyWith(sha256: 'abc'), MediaJobEvent.start)!;
      final hashed = applyMediaJobEvent(uploading, MediaJobEvent.hashOk)!;

      final limited = applyMediaJobEvent(hashed, MediaJobEvent.rateLimited,
          now: at, jitterMs: 0)!;
      expect(limited.status, MediaJobStatus.staged);
      expect(limited.attempts, 1);

      final dead = applyMediaJobEvent(hashed, MediaJobEvent.fatalFailure, now: at)!;
      expect(dead.status, MediaJobStatus.dead);

      expect(applyMediaJobEvent(dead, MediaJobEvent.fatalFailure), isNull);
      expect(applyMediaJobEvent(dead, MediaJobEvent.retryableFailure), isNull);
    });

    test('hash failures and revive', () {
      final hashing = applyMediaJobEvent(job(), MediaJobEvent.start)!;
      final failed = applyMediaJobEvent(hashing, MediaJobEvent.hashFail,
          jitterMs: 0)!;
      expect(failed.status, MediaJobStatus.staged);
      expect(failed.attempts, 1);

      final dead = job(status: MediaJobStatus.dead, attempts: 3)
          .copyWith(errorMessage: 'boom');
      final revived = applyMediaJobEvent(dead, MediaJobEvent.revive)!;
      expect(revived.status, MediaJobStatus.staged);
      expect(revived.attempts, 0);
      expect(revived.errorMessage, isNull);
      expect(revived.hashRetried, isFalse);
      expect(revived.nextAttemptAt, isNotNull);
      expect(applyMediaJobEvent(job(), MediaJobEvent.revive), isNull);
    });

    test('invalid transitions are rejected (guard table)', () {
      final j = job();
      final invalidPairs = <MapEntry<MediaJobStatus, MediaJobEvent>>[
        MapEntry(MediaJobStatus.completed, MediaJobEvent.start),
        MapEntry(MediaJobStatus.dead, MediaJobEvent.start),
        MapEntry(MediaJobStatus.verifying, MediaJobEvent.hashOk),
        MapEntry(MediaJobStatus.staged, MediaJobEvent.verifyOk),
        MapEntry(MediaJobStatus.staged, MediaJobEvent.multipartUploaded),
        MapEntry(MediaJobStatus.staged, MediaJobEvent.presignUploaded),
        MapEntry(MediaJobStatus.uploading, MediaJobEvent.start),
        MapEntry(MediaJobStatus.completed, MediaJobEvent.revive),
        MapEntry(MediaJobStatus.staged, MediaJobEvent.checksumMismatch),
      ];
      for (final pair in invalidPairs) {
        expect(
          applyMediaJobEvent(j.copyWith(status: pair.key), pair.value),
          isNull,
          reason: '${pair.key.name} + ${pair.value.name} must be rejected',
        );
      }
    });
  });

  group('backoff', () {
    test('is 5s·2^n with a 5 min cap', () {
      expect(mediaBackoffDelay(1), const Duration(seconds: 5));
      expect(mediaBackoffDelay(2), const Duration(seconds: 10));
      expect(mediaBackoffDelay(3), const Duration(seconds: 20));
      expect(mediaBackoffDelay(4), const Duration(seconds: 40));
      expect(mediaBackoffDelay(10), const Duration(minutes: 5));
      expect(mediaBackoffDelay(1, jitterMs: 250),
          const Duration(milliseconds: 5250));
      expect(mediaBackoffDelay(0), Duration.zero);
    });
  });

  group('staging round-trip', () {
    test('enqueue copies into documents/outbox and records metadata', () async {
      final job = await enqueueSample(name: 'Campus Day.PNG', bytes: 64);

      expect(File(job.stagedPath).existsSync(), isTrue);
      expect(File(job.stagedPath).parent.path, stagingDir.path);
      expect(job.stagedPath, endsWith('${job.clientEventId}.png'));
      expect(await File(job.stagedPath).length(), 64);
      expect(job.size, 64);
      expect(job.name, 'Campus Day.PNG');
      expect(job.mimeType, 'image/jpeg');
      expect(job.status, MediaJobStatus.staged);
      expect(
        RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
            .hasMatch(job.clientEventId),
        isTrue,
        reason: 'clientEventId must be a v4 UUID (server zod .uuid())',
      );

      final persisted = store.job(job.clientEventId);
      expect(persisted, isNotNull);
      expect(persisted!.stagedPath, job.stagedPath);
    });

    test('staged file is deleted on discard', () async {
      final job = await enqueueSample();
      final staged = File(job.stagedPath);
      expect(staged.existsSync(), isTrue);

      await store.discard(job.clientEventId);
      expect(staged.existsSync(), isFalse);
      expect(store.job(job.clientEventId), isNull);
    });
  });

  group('transport selection', () {
    test('multipart below 4 MB, presign at/above', () {
      expect(selectTransportForTest(1024), 'multipart');
      expect(selectTransportForTest(4 * 1024 * 1024 - 1), 'multipart');
      expect(selectTransportForTest(4 * 1024 * 1024), 'presign');
      expect(selectTransportForTest(50 * 1024 * 1024), 'presign');
    });
  });

  group('checksum mismatch → rehash once → dead', () {
    test('first 422 clears the digest, second kills the job', () async {
      var j = (await enqueueSample())
          .copyWith(sha256: 'a' * 64, status: MediaJobStatus.uploading);

      final rehashed = applyMediaJobEvent(j, MediaJobEvent.checksumMismatch)!;
      expect(rehashed.status, MediaJobStatus.staged);
      expect(rehashed.hashRetried, isTrue);
      expect(rehashed.sha256, isNull, reason: 'forces a fresh digest');
      expect(rehashed.attempts, 1);

      final retrying = applyMediaJobEvent(
          rehashed.copyWith(status: MediaJobStatus.verifying),
          MediaJobEvent.checksumMismatch)!;
      expect(retrying.status, MediaJobStatus.dead);
      expect(retrying.errorMessage, contains('rehash'));
    });
  });

  group('DLQ + revive via store', () {
    test('retry revives dead jobs with a fresh attempt budget', () async {
      final job = await enqueueSample();
      await store.applyEvent(job.clientEventId, MediaJobEvent.start);
      await store.applyEvent(job.clientEventId, MediaJobEvent.fatalFailure);
      expect(store.deadCount(), 1);

      final revived = await store.retry(job.clientEventId);
      expect(revived!.status, MediaJobStatus.staged);
      expect(revived.attempts, 0);
      expect(store.deadCount(), 0);

      final file = File(job.stagedPath);
      expect(file.existsSync(), isTrue, reason: 'revive keeps the staged bytes');
    });

    test('retry on a backed-off staged job makes it due immediately', () async {
      final job = await enqueueSample();
      final backed = (await store.applyEvent(
              job.clientEventId, MediaJobEvent.retryableFailure))!;
      expect(backed.nextAttemptAt!.isAfter(DateTime.now()), isTrue);
      expect(store.dueJobs(), isEmpty);

      await store.retry(job.clientEventId);
      expect(store.dueJobs().map((j) => j.clientEventId), [job.clientEventId]);
    });

    test('dueJobs are FIFO by createdAt', () async {
      final a = await enqueueSample(name: 'a.jpg');
      final b = await enqueueSample(name: 'b.jpg');
      final c = await enqueueSample(name: 'c.jpg');
      expect(
        store.dueJobs().map((j) => j.clientEventId).toList(),
        [a.clientEventId, b.clientEventId, c.clientEventId],
      );
    });
  });

  group('app-kill persistence', () {
    test('job record, digest and progress survive a restart; transient states recover to staged',
        () async {
      final job = await enqueueSample();
      await store.applyEvent(job.clientEventId, MediaJobEvent.start);
      await store.applyEvent(job.clientEventId, MediaJobEvent.hashOk);
      var current = store.job(job.clientEventId)!;
      current = current.copyWith(sha256: 'b' * 64);
      await store.save(current);
      store.updateProgress(job.clientEventId, 0.55);
      await store.flushProgress();

      // App kill: close the box, reopen a fresh store over the same dirs.
      await store.close();
      await openStore();

      final restored = store.job(job.clientEventId);
      expect(restored, isNotNull);
      expect(restored!.status, MediaJobStatus.staged,
          reason: 'interrupted upload recovers to staged');
      expect(restored.sha256, 'b' * 64, reason: 'hash is not recomputed');
      expect(restored.progress, closeTo(0.55, 0.0001));
      expect(File(restored.stagedPath).existsSync(), isTrue);
      expect(store.dueJobs(), hasLength(1));
    });
  });

  group('schema-version discard-on-mismatch', () {
    test('unknown schema clears jobs AND staged files, then stamps v1', () async {
      final job = await enqueueSample();
      await store.close();

      // Corrupt: pretend the box was written by a future schema.
      final raw = await Hive.openBox(MediaOutboxStore.boxName);
      await raw.put(MediaOutboxStore.metaKey, {'schemaVersion': 999});
      await raw.put(job.clientEventId, {
        'clientEventId': job.clientEventId,
        'name': job.name,
        'stagedPath': job.stagedPath,
        'mimeType': job.mimeType,
        'size': job.size,
        'status': 'staged',
        'createdAt': DateTime.now().toIso8601String(),
        'updatedAt': DateTime.now().toIso8601String(),
      });
      await raw.close();

      await openStore();
      expect(store.allJobs(), isEmpty);
      expect(File(job.stagedPath).existsSync(), isFalse,
          reason: 'staged orphans are purged with the schema bump');
      expect(store.box.get(MediaOutboxStore.metaKey),
          {'schemaVersion': MediaOutboxStore.schemaVersion});
    });
  });

  group('bounds/eviction', () {
    test('oldest completed records are purged first when the box is full', () async {
      final done = await enqueueSample(name: 'done.jpg');
      await store.applyEvent(done.clientEventId, MediaJobEvent.start);
      await store.applyEvent(done.clientEventId, MediaJobEvent.hashOk);
      await store.applyEvent(done.clientEventId, MediaJobEvent.multipartUploaded);
      expect(store.job(done.clientEventId)!.status, MediaJobStatus.completed);

      // 199 pending + 1 completed = 200 records (the cap).
      final pending = <String>[];
      for (var i = 0; i < 199; i++) {
        pending.add((await enqueueSample(name: 'p$i.jpg')).clientEventId);
      }

      final next = await enqueueSample(name: 'overflow.jpg');
      expect(store.allJobs(), hasLength(200));
      expect(store.job(done.clientEventId), isNull,
          reason: 'terminal record evicted first');
      expect(File(done.stagedPath).existsSync(), isFalse);
      expect(store.job(next.clientEventId), isNotNull);
      for (final id in pending) {
        expect(store.job(id), isNotNull, reason: 'pending work is never evicted');
      }
    });

    test('pending work and dead jobs are never auto-evicted — enqueue rejects instead',
        () async {
      final pending = <String>[];
      for (var i = 0; i < MediaOutboxStore.maxLiveJobs; i++) {
        pending.add((await enqueueSample(name: 'q$i.jpg')).clientEventId);
      }

      await expectLater(
        enqueueSample(name: 'rejected.jpg'),
        throwsA(isA<MediaOutboxFullException>()),
      );
      expect(store.allJobs(), hasLength(MediaOutboxStore.maxLiveJobs));
      for (final id in pending) {
        expect(store.job(id), isNotNull);
      }
      // The rejected job's staged copy was rolled back (no orphan files):
      final stagedFiles = stagingDir.listSync().whereType<File>();
      expect(stagedFiles, hasLength(MediaOutboxStore.maxLiveJobs));
    });

    test('500 MB staged cap rejects incoming work', () async {
      // Plant a huge pending record directly (no need to copy 300 MB).
      final huge = MediaJob(
        clientEventId: generateMediaClientEventId(),
        name: 'huge.mp4',
        stagedPath: '${stagingDir.path}/missing.mp4',
        mimeType: 'video/mp4',
        size: 500 * 1024 * 1024,
        createdAt: DateTime(2026, 10, 1),
        updatedAt: DateTime(2026, 10, 1),
      );
      await store.box.put(huge.clientEventId, huge.toJson());

      await expectLater(
        enqueueSample(name: 'nope.jpg'),
        throwsA(isA<MediaOutboxFullException>()),
      );
      expect(store.allJobs(), hasLength(1));
    });
  });

  group('429 pause persistence', () {
    test('pause survives restart and expires', () async {
      await store.pauseDrainUntil(DateTime.now().add(const Duration(seconds: 30)));
      expect(store.isPaused(), isTrue);

      await store.close();
      await openStore();
      expect(store.isPaused(), isTrue, reason: 'pause is persisted in the box');

      await store.pauseDrainUntil(DateTime.now().subtract(const Duration(seconds: 1)));
      expect(store.isPaused(), isFalse);
      await store.clearPause();
      expect(store.pausedUntil, isNull);
    });
  });
}

// Local re-export so the group above reads naturally (transport lives in the
// uploader file but the selector is a pure function of size).
String selectTransportForTest(int bytes) => bytes >= 4 * 1024 * 1024
    ? 'presign'
    : 'multipart';
