import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/core/services/network_service.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox.dart';
import 'package:thaibahive_mobile/features/media/data/media_outbox_uploader.dart';
import 'package:thaibahive_mobile/features/media/data/media_repository.dart';

final mediaOutboxStoreProvider = Provider<MediaOutboxStore>((ref) {
  return mediaOutbox;
});

final mediaUploaderProvider = Provider<MediaOutboxUploader>((ref) {
  return MediaOutboxUploader(store: ref.watch(mediaOutboxStoreProvider));
});

final mediaDrainProvider = StateNotifierProvider<MediaDrainController, MediaDrainState>((ref) {
  return MediaDrainController(
    store: ref.watch(mediaOutboxStoreProvider),
    uploader: ref.watch(mediaUploaderProvider),
  );
});

final mediaGalleryProvider =
    AsyncNotifierProvider<MediaGalleryNotifier, List<MediaAssetModel>>(
      MediaGalleryNotifier.new,
    );

final mediaFoldersProvider =
    AsyncNotifierProvider<MediaFoldersNotifier, List<MediaFolderModel>>(
      MediaFoldersNotifier.new,
    );

final mediaOutboxJobsProvider =
    StateNotifierProvider<MediaOutboxJobsNotifier, List<MediaJob>>((ref) {
      return MediaOutboxJobsNotifier(ref.watch(mediaOutboxStoreProvider));
    });

class MediaDrainState {
  const MediaDrainState({
    this.draining = false,
    this.lastSummary,
    this.lastDrainedAt,
  });

  final bool draining;
  final MediaDrainSummary? lastSummary;
  final DateTime? lastDrainedAt;

  MediaDrainState copyWith({
    bool? draining,
    MediaDrainSummary? lastSummary,
    DateTime? lastDrainedAt,
  }) {
    return MediaDrainState(
      draining: draining ?? this.draining,
      lastSummary: lastSummary ?? this.lastSummary,
      lastDrainedAt: lastDrainedAt ?? this.lastDrainedAt,
    );
  }
}

class MediaDrainController extends StateNotifier<MediaDrainState> {
  MediaDrainController({
    required this.store,
    required this.uploader,
  }) : super(const MediaDrainState()) {
    _wasOnline = true;
  }

  final MediaOutboxStore store;
  final MediaOutboxUploader uploader;
  bool _wasOnline = true;

  Future<MediaDrainSummary?> drain({bool force = false}) async {
    if (state.draining && !force) return null;
    state = state.copyWith(draining: true);
    try {
      final summary = await uploader.drain();
      state = state.copyWith(
        draining: false,
        lastSummary: summary,
        lastDrainedAt: DateTime.now(),
      );
      return summary;
    } catch (_) {
      state = state.copyWith(draining: false);
      rethrow;
    }
  }

  void onConnectivityChanged(bool isOnline) {
    if (!_wasOnline && isOnline) {
      unawaited(drain());
    }
    _wasOnline = isOnline;
  }
}

class MediaGalleryNotifier extends AsyncNotifier<List<MediaAssetModel>> {
  @override
  Future<List<MediaAssetModel>> build() async {
    final repo = ref.read(mediaRepositoryProvider);
    return repo.getAssets();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(mediaRepositoryProvider);
      return repo.getAssets();
    });
  }
}

class MediaFoldersNotifier extends AsyncNotifier<List<MediaFolderModel>> {
  @override
  Future<List<MediaFolderModel>> build() async {
    final repo = ref.read(mediaRepositoryProvider);
    return repo.getFolders();
  }

  Future<void> refresh() async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final repo = ref.read(mediaRepositoryProvider);
      return repo.getFolders();
    });
  }
}

class MediaOutboxJobsNotifier extends StateNotifier<List<MediaJob>> {
  MediaOutboxJobsNotifier(this.store) : super([]) {
    load();
  }

  final MediaOutboxStore store;

  void load() {
    state = store.allJobs()
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
  }

  void retry(String clientEventId) {
    store.retry(clientEventId);
    load();
  }

  void discard(String clientEventId) {
    store.discard(clientEventId);
    load();
  }

  void retryAll() {
    store.retryAll();
    load();
  }

  void clearPause() {
    store.clearPause();
  }
}