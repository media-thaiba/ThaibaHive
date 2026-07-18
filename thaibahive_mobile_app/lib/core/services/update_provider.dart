import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'logger_service.dart';
import 'update_service.dart';

enum UpdateDownloadState {
  idle,
  downloading,
  downloaded,
  installing,
  error,
}

/// Provider for the UpdateService
final updateServiceProvider = Provider<UpdateService>((ref) {
  return UpdateService();
});

/// FutureProvider that fetches the latest update metadata
final updateInfoProvider = FutureProvider<UpdateInfo>((ref) async {
  final service = ref.watch(updateServiceProvider);
  return await service.checkForUpdate();
});

/// StateProvider to manage the download progress percentage (0.0 to 1.0)
final updateProgressProvider = StateProvider<double>((ref) => 0.0);

/// StateNotifier to orchestrate the download and install state
final updateStateProvider =
    StateNotifierProvider<UpdateStateNotifier, UpdateDownloadState>((ref) {
  final service = ref.watch(updateServiceProvider);
  return UpdateStateNotifier(service, ref);
});

class UpdateStateNotifier extends StateNotifier<UpdateDownloadState> {
  final UpdateService _service;
  final Ref _ref;
  String? _downloadedFilePath;

  UpdateStateNotifier(this._service, this._ref)
      : super(UpdateDownloadState.idle);

  String? get downloadedFilePath => _downloadedFilePath;

  Future<void> downloadUpdate(String url) async {
    if (state == UpdateDownloadState.downloading) return;

    state = UpdateDownloadState.downloading;
    _ref.read(updateProgressProvider.notifier).state = 0.0;

    final path = await _service.downloadApk(url, (progress) {
      _ref.read(updateProgressProvider.notifier).state = progress;
    });

    if (path != null) {
      _downloadedFilePath = path;
      state = UpdateDownloadState.downloaded;
    } else {
      state = UpdateDownloadState.error;
    }
  }

  Future<void> installUpdate() async {
    if (_downloadedFilePath == null) {
      state = UpdateDownloadState.error;
      return;
    }

    state = UpdateDownloadState.installing;
    final success = await _service.installApk(_downloadedFilePath!);
    if (!success) {
      state = UpdateDownloadState.error;
    } else {
      state = UpdateDownloadState.idle;
    }
  }

  void cancelDownload() {
    _service.cancelDownload();
    state = UpdateDownloadState.idle;
    _ref.read(updateProgressProvider.notifier).state = 0.0;
  }

  void reset() {
    state = UpdateDownloadState.idle;
    _ref.read(updateProgressProvider.notifier).state = 0.0;
    _downloadedFilePath = null;
  }
}
