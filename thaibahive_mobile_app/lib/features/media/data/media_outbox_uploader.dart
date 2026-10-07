import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:path/path.dart' as p;

import '../../../core/network/api_client.dart';
import 'media_outbox.dart';

// ─── Transport selection (D1 hybrid) ───

/// Below the threshold a single-shot multipart POST to `/api/upload` is used
/// (the serverless proxy hard-caps that route at 4.5 MB); at or above it the
/// client must take the presign → PUT → complete path.
const int kPresignThresholdBytes = 4 * 1024 * 1024;

enum TransportKind { multipart, presign }

TransportKind selectTransport(int fileSize) =>
    fileSize >= kPresignThresholdBytes ? TransportKind.presign : TransportKind.multipart;

enum UploadFailureKind { retryable, nonRetryable, rateLimited, checksumMismatch }

/// 429 → pause, 422 → rehash-once, other 4xx → dead, 5xx/transport → retry.
UploadFailureKind classifyStatusCode(int? statusCode) {
  if (statusCode == null) return UploadFailureKind.retryable;
  if (statusCode == 429) return UploadFailureKind.rateLimited;
  if (statusCode == 422) return UploadFailureKind.checksumMismatch;
  if (statusCode >= 400 && statusCode < 500) return UploadFailureKind.nonRetryable;
  return UploadFailureKind.retryable;
}

class MediaDrainSummary {
  int completed = 0;
  int failed = 0;
  int dead = 0;
  int skipped = 0;
  bool paused = false;

  int get processed => completed + failed + dead + skipped;

  @override
  String toString() =>
      'MediaDrainSummary(completed: $completed, failed: $failed, dead: $dead, skipped: $skipped, paused: $paused)';
}

class MediaOutboxUploader {
  MediaOutboxUploader({required this.store, Dio? dio})
      : dio = dio ?? ApiClient().dio;

  final MediaOutboxStore store;
  final Dio dio;

  /// Drains due jobs FIFO with concurrency 2. A 429 pauses the drain
  /// (persisted) until the backoff elapses; in-flight jobs finish first and
  /// no further jobs are started while paused.
  Future<MediaDrainSummary> drain() async {
    final summary = MediaDrainSummary();
    if (store.pausedUntil != null) {
      if (store.isPaused()) {
        summary.paused = true;
        return summary;
      }
      await store.clearPause();
    }

    final queue = List<MediaJob>.from(store.dueJobs());

    Future<void> worker() async {
      while (queue.isNotEmpty) {
        if (store.isPaused()) {
          summary.paused = true;
          return;
        }
        final job = queue.removeAt(0);
        final outcome = await _runJob(job);
        switch (outcome) {
          case _JobOutcome.completed:
            summary.completed++;
          case _JobOutcome.failed:
            summary.failed++;
          case _JobOutcome.dead:
            summary.dead++;
          case _JobOutcome.paused:
            summary.paused = true;
          case _JobOutcome.skipped:
            summary.skipped++;
        }
      }
    }

    await Future.wait([worker(), worker()]);
    return summary;
  }

  Future<_JobOutcome> _runJob(MediaJob job) async {
    // staged → hashing (the FSM guard rejects anything but `staged`)
    var current = await store.applyEvent(job.clientEventId, MediaJobEvent.start);
    if (current == null) return _JobOutcome.skipped;

    try {
      // hashing → uploading (streaming SHA-256; a persisted digest is reused
      // after crash recovery so a completed hash is never recomputed).
      if (current.sha256 == null) {
        final digest = await _hashFile(current.stagedPath);
        if (digest == null) {
          await store.applyEvent(current.clientEventId, MediaJobEvent.hashFail);
          return _JobOutcome.failed;
        }
        current = await store.applyEvent(current.clientEventId, MediaJobEvent.hashOk);
        if (current == null) return _JobOutcome.skipped;
        current = current.copyWith(sha256: digest);
        await store.save(current);
      } else {
        current = await store.applyEvent(current.clientEventId, MediaJobEvent.hashOk);
        if (current == null) return _JobOutcome.skipped;
      }

      final transport = selectTransport(current.size);
      if (transport == TransportKind.presign) {
        return await _runPresignFlow(current);
      }
      return await _runMultipartFlow(current);
    } on DioException catch (e) {
      return await _handleFailure(job.clientEventId, e.response?.statusCode, e.message);
    } catch (_) {
      // Filesystem/unexpected errors are retryable — the staged copy stays.
      return await _handleFailure(job.clientEventId, null, 'local error');
    }
  }

  Future<_JobOutcome> _runMultipartFlow(MediaJob job) async {
    final file = File(job.stagedPath);
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: job.name),
      'sha256': job.sha256,
      'clientEventId': job.clientEventId,
    });

    final response = await dio.post(
      '/upload',
      data: formData,
      onSendProgress: (sent, total) {
        if (total > 0) {
          store.updateProgress(job.clientEventId, sent / total);
        }
      },
    );

    final data = response.data is Map ? response.data as Map : const {};
    final next = await store.applyEvent(job.clientEventId, MediaJobEvent.multipartUploaded);
    if (next == null) return _JobOutcome.skipped;
    final asset = data['asset'];
    await store.save(next.copyWith(
      fileUrl: data['url'] as String?,
      assetId: asset is Map ? asset['id'] as String? : null,
      clearError: true,
    ));
    await _cleanupStaged(job);
    return _JobOutcome.completed;
  }

  Future<_JobOutcome> _runPresignFlow(MediaJob job) async {
    final ext = p.extension(job.stagedPath).replaceFirst('.', '');
    final sign = await dio.post('/media/upload/sign', data: {
      'ext': ext,
      'mime': job.mimeType,
      'size': job.size,
    });
    final signData = sign.data is Map ? sign.data as Map : const {};

    if (signData['mode'] != 'presign') {
      // Server-side fallback (storage not configured) — same bytes, plain
      // multipart through /api/upload.
      return await _runMultipartFlow(job);
    }

    final uploadUrl = signData['uploadUrl'] as String?;
    final path = signData['path'] as String?;
    if (uploadUrl == null || path == null) {
      await store.applyEvent(job.clientEventId, MediaJobEvent.retryableFailure);
      return _JobOutcome.failed;
    }

    final file = File(job.stagedPath);
    await dio.put(
      uploadUrl,
      data: file.openRead(),
      options: Options(headers: {'Content-Type': job.mimeType}),
      onSendProgress: (sent, total) {
        if (total > 0) {
          store.updateProgress(job.clientEventId, sent / total);
        }
      },
    );

    // uploading → verifying (completion ack pending)
    var current = await store.applyEvent(job.clientEventId, MediaJobEvent.presignUploaded);
    if (current == null) return _JobOutcome.skipped;
    current = current.copyWith(signedPath: path);
    await store.save(current);

    final complete = await dio.post('/media/upload/complete', data: {
      'clientEventId': current.clientEventId,
      'path': path,
      'sha256': current.sha256,
      'name': current.name,
      'mime': current.mimeType,
      'size': current.size,
      if (current.folderId != null) 'folderId': current.folderId,
    });
    final completeData = complete.data is Map ? complete.data as Map : const {};

    final done =
        await store.applyEvent(current.clientEventId, MediaJobEvent.verifyOk);
    if (done == null) return _JobOutcome.skipped;
    final asset = completeData['asset'];
    await store.save(done.copyWith(
      assetId: asset is Map ? asset['id'] as String? : null,
      fileUrl: asset is Map ? asset['fileUrl'] as String? : null,
      clearError: true,
    ));
    await _cleanupStaged(job);
    return _JobOutcome.completed;
  }

  Future<_JobOutcome> _handleFailure(
    String clientEventId,
    int? statusCode,
    String? message,
  ) async {
    // Reload so FSM guards always see the live state (the job may have
    // advanced — e.g. presignUploaded — before the failure).
    final live = store.job(clientEventId);
    if (live == null || isMediaTerminal(live.status)) return _JobOutcome.skipped;

    switch (classifyStatusCode(statusCode)) {
      case UploadFailureKind.rateLimited:
        final next = await store.applyEvent(
          live.clientEventId,
          MediaJobEvent.rateLimited,
        );
        final delay = mediaBackoffDelay((next ?? live).attempts);
        await store.pauseDrainUntil(DateTime.now().add(delay));
        return _JobOutcome.paused;

      case UploadFailureKind.checksumMismatch:
        final next = await store.applyEvent(
          live.clientEventId,
          MediaJobEvent.checksumMismatch,
        );
        if (next == null) return _JobOutcome.skipped;
        if (next.status == MediaJobStatus.dead) return _JobOutcome.dead;
        // Rehash once: digest is cleared, job waits out the backoff.
        return _JobOutcome.failed;

      case UploadFailureKind.nonRetryable:
        await store.applyEvent(
          live.clientEventId,
          MediaJobEvent.fatalFailure,
          // (message kept on the record for the DLQ UI)
        );
        final after = store.job(live.clientEventId);
        if (after != null && message != null) {
          await store.save(after.copyWith(errorMessage: message));
        }
        return _JobOutcome.dead;

      case UploadFailureKind.retryable:
        if (message != null) {
          final withError = live.copyWith(errorMessage: message);
          await store.save(withError);
        }
        final next = await store.applyEvent(
          live.clientEventId,
          MediaJobEvent.retryableFailure,
        );
        if (next == null) return _JobOutcome.skipped;
        if (next.status == MediaJobStatus.dead) return _JobOutcome.dead;
        return _JobOutcome.failed;
    }
  }

  Future<String?> _hashFile(String path) async {
    try {
      final file = File(path);
      if (!await file.exists()) return null;
      final digest = await sha256.bind(file.openRead()).first;
      return digest.toString();
    } catch (_) {
      return null;
    }
  }

  Future<void> _cleanupStaged(MediaJob job) async {
    try {
      final file = File(job.stagedPath);
      if (await file.exists()) await file.delete();
    } catch (_) {
      // best-effort — eviction also purges
    }
  }
}

enum _JobOutcome { completed, failed, dead, paused, skipped }
