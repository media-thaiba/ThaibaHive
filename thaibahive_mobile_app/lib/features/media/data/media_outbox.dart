import 'dart:async';
import 'dart:io';
import 'dart:math';

import 'package:hive_flutter/hive_flutter.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

// ─── Job FSM (pure) ───
//
// staged → hashing → uploading → verifying → completed
// failures → staged (retryable, attempts < 3, exponential backoff 5s·2^n
// cap 5 min + jitter) → dead (attempts ≥ 3 or non-retryable 4xx — manual
// revive/discard). Checksum mismatch (422) ⇒ rehash once, then dead.

enum MediaJobStatus { staged, hashing, uploading, verifying, completed, dead }

enum MediaJobEvent {
  start,
  hashOk,
  hashFail,
  presignUploaded,
  multipartUploaded,
  verifyOk,
  checksumMismatch,
  retryableFailure,
  rateLimited,
  fatalFailure,
  revive,
}

const int kMediaMaxAttempts = 3;

bool isMediaTerminal(MediaJobStatus status) =>
    status == MediaJobStatus.completed || status == MediaJobStatus.dead;

/// Exponential backoff for the n-th failure: 5s·2^(failures-1), capped at
/// 5 minutes, plus optional jitter (callers pass the jitter so the function
/// stays deterministic under test).
Duration mediaBackoffDelay(int failures, {int jitterMs = 0}) {
  if (failures < 1) return Duration.zero;
  final exponent = min(failures - 1, 8);
  final baseMs = 5000 * (1 << exponent);
  return Duration(milliseconds: min(baseMs, 300000) + max(0, jitterMs));
}

class MediaJob {
  MediaJob({
    required this.clientEventId,
    required this.name,
    required this.stagedPath,
    required this.mimeType,
    required this.size,
    this.folderId,
    this.sha256,
    this.status = MediaJobStatus.staged,
    this.attempts = 0,
    this.hashRetried = false,
    this.progress = 0,
    this.errorMessage,
    this.signedPath,
    this.assetId,
    this.fileUrl,
    required this.createdAt,
    required this.updatedAt,
    this.nextAttemptAt,
    this.completedAt,
  });

  final String clientEventId;
  final String name;
  final String stagedPath;
  final String mimeType;
  final int size;
  final String? folderId;
  String? sha256;
  MediaJobStatus status;
  int attempts;
  bool hashRetried;
  double progress;
  String? errorMessage;
  String? signedPath;
  String? assetId;
  String? fileUrl;
  final DateTime createdAt;
  DateTime updatedAt;
  DateTime? nextAttemptAt;
  DateTime? completedAt;

  Map<String, dynamic> toJson() => {
        'clientEventId': clientEventId,
        'name': name,
        'stagedPath': stagedPath,
        'mimeType': mimeType,
        'size': size,
        'folderId': folderId,
        'sha256': sha256,
        'status': status.name,
        'attempts': attempts,
        'hashRetried': hashRetried,
        'progress': progress,
        'errorMessage': errorMessage,
        'signedPath': signedPath,
        'assetId': assetId,
        'fileUrl': fileUrl,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
        'nextAttemptAt': nextAttemptAt?.toIso8601String(),
        'completedAt': completedAt?.toIso8601String(),
      };

  factory MediaJob.fromJson(Map<String, dynamic> json) => MediaJob(
        clientEventId: json['clientEventId'] as String,
        name: json['name'] as String,
        stagedPath: json['stagedPath'] as String,
        mimeType: json['mimeType'] as String,
        size: json['size'] as int? ?? 0,
        folderId: json['folderId'] as String?,
        sha256: json['sha256'] as String?,
        status: MediaJobStatus.values.firstWhere(
          (s) => s.name == json['status'],
          orElse: () => MediaJobStatus.dead,
        ),
        attempts: json['attempts'] as int? ?? 0,
        hashRetried: json['hashRetried'] as bool? ?? false,
        progress: (json['progress'] as num?)?.toDouble() ?? 0,
        errorMessage: json['errorMessage'] as String?,
        signedPath: json['signedPath'] as String?,
        assetId: json['assetId'] as String?,
        fileUrl: json['fileUrl'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        updatedAt: DateTime.parse(json['updatedAt'] as String),
        nextAttemptAt: json['nextAttemptAt'] != null
            ? DateTime.parse(json['nextAttemptAt'] as String)
            : null,
        completedAt: json['completedAt'] != null
            ? DateTime.parse(json['completedAt'] as String)
            : null,
      );

  MediaJob copyWith({
    MediaJobStatus? status,
    String? sha256,
    bool clearSha256 = false,
    int? attempts,
    bool? hashRetried,
    double? progress,
    String? errorMessage,
    bool clearError = false,
    String? signedPath,
    String? assetId,
    String? fileUrl,
    DateTime? updatedAt,
    DateTime? nextAttemptAt,
    bool clearNextAttemptAt = false,
    DateTime? completedAt,
  }) =>
      MediaJob(
        clientEventId: clientEventId,
        name: name,
        stagedPath: stagedPath,
        mimeType: mimeType,
        size: size,
        folderId: folderId,
        sha256: clearSha256 ? null : (sha256 ?? this.sha256),
        status: status ?? this.status,
        attempts: attempts ?? this.attempts,
        hashRetried: hashRetried ?? this.hashRetried,
        progress: progress ?? this.progress,
        errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
        signedPath: signedPath ?? this.signedPath,
        assetId: assetId ?? this.assetId,
        fileUrl: fileUrl ?? this.fileUrl,
        createdAt: createdAt,
        updatedAt: updatedAt ?? this.updatedAt,
        nextAttemptAt:
            clearNextAttemptAt ? null : (nextAttemptAt ?? this.nextAttemptAt),
        completedAt: completedAt ?? this.completedAt,
      );
}

class InvalidMediaTransition implements Exception {
  InvalidMediaTransition(this.status, this.event);
  final MediaJobStatus status;
  final MediaJobEvent event;
  @override
  String toString() => 'InvalidMediaTransition(${status.name}, ${event.name})';
}

/// Pure transition function. Returns the next job state, or `null` when the
/// event is not valid for the current state (guard table below).
MediaJob? applyMediaJobEvent(
  MediaJob job,
  MediaJobEvent event, {
  DateTime? now,
  int jitterMs = 0,
}) {
  final at = now ?? DateTime.now();
  MediaJob fail() {
    final attempts = job.attempts + 1;
    if (attempts >= kMediaMaxAttempts) {
      return job.copyWith(
        status: MediaJobStatus.dead,
        attempts: attempts,
        errorMessage: job.errorMessage ?? 'retry limit reached',
        updatedAt: at,
        clearNextAttemptAt: true,
      );
    }
    return job.copyWith(
      status: MediaJobStatus.staged,
      attempts: attempts,
      nextAttemptAt: at.add(mediaBackoffDelay(attempts, jitterMs: jitterMs)),
      updatedAt: at,
    );
  }

  switch (event) {
    case MediaJobEvent.start:
      if (job.status != MediaJobStatus.staged) return null;
      return job.copyWith(status: MediaJobStatus.hashing, updatedAt: at);

    case MediaJobEvent.hashOk:
      if (job.status != MediaJobStatus.hashing) return null;
      return job.copyWith(status: MediaJobStatus.uploading, updatedAt: at);

    case MediaJobEvent.hashFail:
      if (job.status != MediaJobStatus.hashing) return null;
      return fail();

    case MediaJobEvent.presignUploaded:
      if (job.status != MediaJobStatus.uploading) return null;
      return job.copyWith(
        status: MediaJobStatus.verifying,
        progress: 1,
        updatedAt: at,
      );

    case MediaJobEvent.multipartUploaded:
      if (job.status != MediaJobStatus.uploading) return null;
      return job.copyWith(
        status: MediaJobStatus.completed,
        progress: 1,
        completedAt: at,
        updatedAt: at,
        clearNextAttemptAt: true,
        clearError: true,
      );

    case MediaJobEvent.verifyOk:
      if (job.status != MediaJobStatus.verifying) return null;
      return job.copyWith(
        status: MediaJobStatus.completed,
        progress: 1,
        completedAt: at,
        updatedAt: at,
        clearNextAttemptAt: true,
        clearError: true,
      );

    case MediaJobEvent.checksumMismatch:
      // 422 from /api/upload (uploading) or /complete (verifying).
      if (job.status != MediaJobStatus.uploading &&
          job.status != MediaJobStatus.verifying) {
        return null;
      }
      if (job.hashRetried) {
        return job.copyWith(
          status: MediaJobStatus.dead,
          attempts: job.attempts + 1,
          errorMessage: 'checksum mismatch after rehash',
          updatedAt: at,
          clearNextAttemptAt: true,
        );
      }
      // Rehash once: force a fresh digest on the next attempt.
      return fail().copyWith(
        hashRetried: true,
        clearSha256: true,
        errorMessage: 'checksum mismatch — rehashing once',
      );

    case MediaJobEvent.retryableFailure:
      if (isMediaTerminal(job.status)) return null;
      return fail();

    case MediaJobEvent.rateLimited:
      if (isMediaTerminal(job.status)) return null;
      return fail();

    case MediaJobEvent.fatalFailure:
      if (isMediaTerminal(job.status)) return null;
      return job.copyWith(
        status: MediaJobStatus.dead,
        attempts: job.attempts + 1,
        updatedAt: at,
        clearNextAttemptAt: true,
      );

    case MediaJobEvent.revive:
      if (job.status != MediaJobStatus.dead) return null;
      return job.copyWith(
        status: MediaJobStatus.staged,
        attempts: 0,
        hashRetried: false,
        progress: 0,
        updatedAt: at,
        nextAttemptAt: at,
        clearError: true,
        clearNextAttemptAt: false,
      );
  }
}

/// v4 UUID — the server's `mediaUploadCompleteSchema` requires `z.string().uuid()`
/// (and the multipart route validates the same shape).
String generateMediaClientEventId() {
  final r = Random.secure();
  final bytes = List<int>.generate(16, (_) => r.nextInt(256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  String hex(int b) => b.toRadixString(16).padLeft(2, '0');
  final h = bytes.map(hex).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}'
      '-${h.substring(16, 20)}-${h.substring(20)}';
}

class MediaOutboxFullException implements Exception {
  const MediaOutboxFullException(this.message);
  final String message;
  @override
  String toString() => 'MediaOutboxFullException: $message';
}

// ─── Hive store (action_center schema-version pattern) ───

class MediaOutboxStore {
  static const String boxName = 'media_outbox';
  static const int schemaVersion = 1;
  static const String metaKey = '__meta';
  static const int maxLiveJobs = 200;
  static const int maxStagedBytes = 500 * 1024 * 1024;
  static const Duration progressDebounce = Duration(milliseconds: 300);

  Box? _box;
  Directory? _stagingDir;
  Timer? _progressTimer;
  DateTime? pausedUntil;
  final Map<String, double> _pendingProgress = {};

  bool get isInitialized => _box != null;
  Box get box => _box!;
  Directory get stagingDir => _stagingDir!;

  /// [hiveHomePath] + [stagingDir] are injected by tests (temp dirs);
  /// production uses `Hive.initFlutter()` + `documents/outbox/`.
  Future<void> init({String? hiveHomePath, Directory? stagingDir}) async {
    if (_box != null) return;
    if (hiveHomePath != null) {
      Hive.init(hiveHomePath);
    } else {
      await Hive.initFlutter();
    }
    _box = await Hive.openBox(boxName);
    if (stagingDir != null) {
      _stagingDir = stagingDir;
    } else {
      final docs = await getApplicationDocumentsDirectory();
      _stagingDir = Directory(p.join(docs.path, 'outbox'));
    }
    await _stagingDir!.create(recursive: true);

    await _ensureSchema();
    await _recoverInterrupted();
  }

  /// v1 = discard-on-mismatch (action_center pattern). A schema bump clears
  /// the job records AND the staged files (they are only meaningful with
  /// their jobs).
  Future<void> _ensureSchema() async {
    final meta = _box!.get(metaKey);
    if (meta is! Map || meta['schemaVersion'] != schemaVersion) {
      await _box!.clear();
      await _purgeStagingDir();
      await _box!.put(metaKey, {'schemaVersion': schemaVersion});
      pausedUntil = null;
      return;
    }
    final paused = _box!.get('__paused_until');
    pausedUntil = paused is String ? DateTime.tryParse(paused) : null;
  }

  Future<void> _purgeStagingDir() async {
    if (_stagingDir == null) return;
    if (await _stagingDir!.exists()) {
      await for (final entry in _stagingDir!.list()) {
        try {
          await entry.delete(recursive: true);
        } catch (_) {
          // best-effort cleanup
        }
      }
    }
  }

  /// Crash-mid-drain recovery: transient states reset to `staged` (the job
  /// record, digest, attempt budget and persisted progress all survive; the
  /// server dedupes by clientEventId/sha256 on replay).
  Future<void> _recoverInterrupted() async {
    for (final job in allJobs()) {
      if (job.status == MediaJobStatus.hashing ||
          job.status == MediaJobStatus.uploading ||
          job.status == MediaJobStatus.verifying) {
        await save(job.copyWith(
          status: MediaJobStatus.staged,
          updatedAt: DateTime.now(),
        ));
      }
    }
  }

  // ─── Staging + bounds ───

  Future<MediaJob> enqueue({
    required File source,
    required String originalName,
    required String mimeType,
    String? folderId,
  }) async {
    _requireInit();
    final id = generateMediaClientEventId();
    final ext = p
        .extension(originalName)
        .replaceFirst('.', '')
        .replaceAll(RegExp('[^a-zA-Z0-9]'), '');
    final staged = File(
        '${_stagingDir!.path}/$id.${ext.isEmpty ? 'bin' : ext.toLowerCase()}');
    await source.copy(staged.path);
    final size = await staged.length();

    try {
      await _enforceBounds(size);
    } catch (_) {
      try {
        await staged.delete();
      } catch (_) {
        // best-effort rollback
      }
      rethrow;
    }

    final now = DateTime.now();
    final job = MediaJob(
      clientEventId: id,
      name: originalName,
      stagedPath: staged.path,
      mimeType: mimeType,
      size: size,
      folderId: folderId,
      createdAt: now,
      updatedAt: now,
    );
    await _box!.put(id, job.toJson());
    return job;
  }

  /// Bounds: max 200 records / 200 pending (live + dead) / 500 MB staged.
  /// Eviction always targets the oldest completed (terminal) records first;
  /// `dead` and pending work are never auto-destroyed — when the box is
  /// genuinely full the incoming enqueue is rejected.
  Future<void> _enforceBounds(int incomingBytes) async {
    // Record hygiene: keep the box itself bounded by purging the oldest
    // completed records first (their staged files are already gone or
    // removed here).
    while (allJobs().length + 1 > maxLiveJobs) {
      final oldestCompleted = allJobs()
          .where((j) => j.status == MediaJobStatus.completed)
          .toList()
        ..sort((a, b) => a.createdAt.compareTo(b.createdAt));
      if (oldestCompleted.isEmpty) break;
      await _deleteJobRecord(oldestCompleted.first, removeStagedFile: true);
    }

    final live = allJobs().where((j) => !isMediaTerminal(j.status)).length;
    if (live + 1 > maxLiveJobs) {
      throw const MediaOutboxFullException(
          'Outbox is full (max 200 pending jobs)');
    }

    final bytes = allJobs()
        .where((j) => j.status != MediaJobStatus.completed)
        .fold<int>(0, (sum, j) => sum + j.size);
    if (bytes + incomingBytes > maxStagedBytes) {
      throw const MediaOutboxFullException(
          'Outbox is full (max 500 MB staged)');
    }
  }

  // ─── Job CRUD ───

  List<MediaJob> allJobs() {
    _requireInit();
    final jobs = <MediaJob>[];
    for (final key in _box!.keys) {
      if (key is String && key.startsWith('__')) continue;
      final value = _box!.get(key);
      if (value is Map) {
        jobs.add(MediaJob.fromJson(Map<String, dynamic>.from(value)));
      }
    }
    jobs.sort((a, b) => a.createdAt.compareTo(b.createdAt));
    return jobs;
  }

  List<MediaJob> dueJobs({DateTime? now}) {
    final at = now ?? DateTime.now();
    return allJobs()
        .where((j) =>
            j.status == MediaJobStatus.staged &&
            (j.nextAttemptAt == null || !j.nextAttemptAt!.isAfter(at)))
        .toList();
  }

  List<MediaJob> deadJobs() =>
      allJobs().where((j) => j.status == MediaJobStatus.dead).toList();

  int deadCount() => deadJobs().length;

  MediaJob? job(String clientEventId) {
    _requireInit();
    final value = _box!.get(clientEventId);
    if (value is Map) {
      return MediaJob.fromJson(Map<String, dynamic>.from(value));
    }
    return null;
  }

  Future<void> save(MediaJob job) async {
    _requireInit();
    job.updatedAt = DateTime.now();
    await _box!.put(job.clientEventId, job.toJson());
  }

  /// Applies the pure FSM transition; returns the updated job, or `null`
  /// when the event is invalid for the current state.
  Future<MediaJob?> applyEvent(
    String clientEventId,
    MediaJobEvent event, {
    DateTime? now,
  }) async {
    final current = job(clientEventId);
    if (current == null) return null;
    final next = applyMediaJobEvent(current, event, now: now);
    if (next == null) return null;
    await save(next);
    return next;
  }

  Future<void> discard(String clientEventId) async {
    final current = job(clientEventId);
    if (current == null) return;
    await _deleteJobRecord(current, removeStagedFile: true);
  }

  /// Per-row retry: `dead` → revive (fresh attempt budget); `staged` →
  /// bypass the backoff wait and make it due now.
  Future<MediaJob?> retry(String clientEventId, {DateTime? now}) async {
    final current = job(clientEventId);
    if (current == null) return null;
    if (current.status == MediaJobStatus.dead) {
      return applyEvent(clientEventId, MediaJobEvent.revive, now: now);
    }
    if (current.status == MediaJobStatus.staged) {
      final next = current.copyWith(
        clearNextAttemptAt: true,
        clearError: true,
        updatedAt: now ?? DateTime.now(),
      );
      await save(next);
      return next;
    }
    return null;
  }

  Future<List<MediaJob>> retryAll({DateTime? now}) async {
    final retried = <MediaJob>[];
    for (final job in allJobs()) {
      if (job.status == MediaJobStatus.dead ||
          job.status == MediaJobStatus.staged) {
        final next = await retry(job.clientEventId, now: now);
        if (next != null) retried.add(next);
      }
    }
    return retried;
  }

  Future<void> _deleteJobRecord(MediaJob job,
      {required bool removeStagedFile}) async {
    await _box!.delete(job.clientEventId);
    if (removeStagedFile) {
      try {
        final file = File(job.stagedPath);
        if (await file.exists()) await file.delete();
      } catch (_) {
        // best-effort cleanup
      }
    }
  }

  // ─── Progress (debounced 300 ms — survives app kill) ───

  void updateProgress(String clientEventId, double value) {
    if (_box == null) return;
    _pendingProgress[clientEventId] = value.clamp(0.0, 1.0);
    _progressTimer?.cancel();
    _progressTimer = Timer(progressDebounce, flushProgress);
  }

  /// Flushes pending progress writes immediately (also the test seam).
  Future<void> flushProgress() async {
    _progressTimer?.cancel();
    _progressTimer = null;
    if (_box == null || _pendingProgress.isEmpty) return;
    final pending = Map<String, double>.from(_pendingProgress);
    _pendingProgress.clear();
    for (final entry in pending.entries) {
      final current = job(entry.key);
      if (current == null || isMediaTerminal(current.status)) continue;
      await _box!.put(
        entry.key,
        current.copyWith(progress: entry.value).toJson(),
      );
    }
  }

  // ─── 429 pause (persisted) ───

  Future<void> pauseDrainUntil(DateTime until) async {
    pausedUntil = until;
    await _box!.put('__paused_until', until.toIso8601String());
  }

  bool isPaused({DateTime? now}) =>
      pausedUntil != null && pausedUntil!.isAfter(now ?? DateTime.now());

  Future<void> clearPause() async {
    pausedUntil = null;
    await _box!.delete('__paused_until');
  }

  int get liveCount =>
      allJobs().where((j) => !isMediaTerminal(j.status)).length;

  void _requireInit() {
    if (_box == null) {
      throw StateError('MediaOutboxStore not initialized — call init() first');
    }
  }

  Future<void> close() async {
    await flushProgress();
    _progressTimer?.cancel();
    _progressTimer = null;
    await _box?.close();
    _box = null;
    pausedUntil = null;
  }
}

final mediaOutbox = MediaOutboxStore();
