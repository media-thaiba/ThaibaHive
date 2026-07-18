import 'dart:io';
import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import '../network/api_client.dart';
import 'logger_service.dart';

class UpdateInfo {
  final bool isUpdateAvailable;
  final String currentVersion;
  final String latestVersion;
  final String downloadUrl;
  final String releaseNotes;
  final bool isForceUpdate;

  UpdateInfo({
    required this.isUpdateAvailable,
    required this.currentVersion,
    required this.latestVersion,
    required this.downloadUrl,
    required this.releaseNotes,
    required this.isForceUpdate,
  });

  factory UpdateInfo.noUpdate(String currentVersion) {
    return UpdateInfo(
      isUpdateAvailable: false,
      currentVersion: currentVersion,
      latestVersion: currentVersion,
      downloadUrl: '',
      releaseNotes: '',
      isForceUpdate: false,
    );
  }
}

class UpdateService {
  final ApiClient _api;
  final LoggerService _logger;
  final Dio _dio = Dio();
  CancelToken? _cancelToken;

  UpdateService(this._api, this._logger);

  /// Compares version strings. Returns true if latest > current.
  /// Handles beta versions e.g. 1.0.0+1 vs 1.0.1+2
  bool compareVersions(String current, String latest) {
    _logger.info('UPDATE_SERVICE: Comparing versions: current=$current, latest=$latest');
    if (current == latest) {
      _logger.info('UPDATE_SERVICE: Versions are identical, no update');
      return false;
    }

    try {
      // Normalize version strings
      final currentClean = current.split('-').first.split('+').first;
      final latestClean = latest.split('-').first.split('+').first;
      _logger.info('UPDATE_SERVICE: Core versions: current=$currentClean, latest=$latestClean');

      final currentParts = currentClean.split('.').map(int.parse).toList();
      final latestParts = latestClean.split('.').map(int.parse).toList();

      for (int i = 0; i < 3; i++) {
        final currentVal = i < currentParts.length ? currentParts[i] : 0;
        final latestVal = i < latestParts.length ? latestParts[i] : 0;
        if (latestVal > currentVal) {
          _logger.info('UPDATE_SERVICE: Core version segment $i: latest($latestVal) > current($currentVal) → UPDATE');
          return true;
        }
        if (latestVal < currentVal) {
          _logger.info('UPDATE_SERVICE: Core version segment $i: latest($latestVal) < current($currentVal) → NO UPDATE');
          return false;
        }
      }

      _logger.info('UPDATE_SERVICE: Core versions equal, checking build numbers...');
      
      final currentBuildStr = current.contains('+') ? current.split('+').last : null;
      final latestBuildStr = latest.contains('+') ? latest.split('+').last : null;
      
      _logger.info('UPDATE_SERVICE: Build strings: current=$currentBuildStr, latest=$latestBuildStr');
      
      if (currentBuildStr != null && latestBuildStr != null) {
        final currentBuild = int.tryParse(currentBuildStr) ?? 0;
        final latestBuild = int.tryParse(latestBuildStr) ?? 0;
        _logger.info('UPDATE_SERVICE: Build numbers: current=$currentBuild, latest=$latestBuild, result=${latestBuild > currentBuild}');
        return latestBuild > currentBuild;
      }
    } catch (e) {
      _logger.error('UPDATE_SERVICE: Error comparing versions: $e');
    }
    
    final fallbackResult = latest.compareTo(current) > 0;
    _logger.info('UPDATE_SERVICE: Fallback string comparison result=$fallbackResult');
    return fallbackResult;
  }

  /// Checks Next.js system update API for details
  Future<UpdateInfo> checkForUpdate() async {
    _logger.info('UPDATE_SERVICE: Checking for app updates...');
    try {
      final PackageInfo packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = '${packageInfo.version}+${packageInfo.buildNumber}';

      final response = await _api.get(
        '/system/update',
        fromJson: (json) => json as Map<String, dynamic>,
      );

      final latestVersion = response['latestVersion'] as String?;
      final downloadUrl = response['downloadUrl'] as String?;
      final releaseNotes = response['releaseNotes'] as String? ?? 'General stability fixes and performance improvements.';
      final isForceUpdate = response['forceUpdate'] == true;

      if (latestVersion == null || downloadUrl == null || downloadUrl.isEmpty) {
        _logger.warning('UPDATE_SERVICE: Latest version or download URL not found in update config');
        return UpdateInfo.noUpdate(currentVersion);
      }

      final hasUpdate = compareVersions(currentVersion, latestVersion);
      _logger.info('UPDATE_SERVICE: App update check finished. Update available: $hasUpdate');

      return UpdateInfo(
        isUpdateAvailable: hasUpdate,
        currentVersion: currentVersion,
        latestVersion: latestVersion,
        downloadUrl: downloadUrl,
        releaseNotes: releaseNotes,
        isForceUpdate: isForceUpdate,
      );
    } catch (e, stack) {
      _logger.error('UPDATE_SERVICE: Failed to check for updates', e, stack);
      try {
        final PackageInfo packageInfo = await PackageInfo.fromPlatform();
        return UpdateInfo.noUpdate('${packageInfo.version}+${packageInfo.buildNumber}');
      } catch (_) {
        return UpdateInfo.noUpdate('1.0.0+1');
      }
    }
  }

  /// Downloads the APK to the local cache directory and tracks progress
  Future<String?> downloadApk(String url, Function(double) onProgress) async {
    _logger.info('UPDATE_SERVICE: Starting APK download from $url');
    _cancelToken = CancelToken();

    try {
      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/ThaibaHive_Update.apk';

      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
      }

      await _dio.download(
        url,
        filePath,
        cancelToken: _cancelToken,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            final progress = received / total;
            onProgress(progress);
          }
        },
      );

      _logger.info('UPDATE_SERVICE: APK download completed successfully: $filePath');
      return filePath;
    } catch (e, stack) {
      if (e is DioException && CancelToken.isCancel(e)) {
        _logger.info('UPDATE_SERVICE: APK download was cancelled by the user');
      } else {
        _logger.error('UPDATE_SERVICE: APK download failed', e, stack);
      }
      return null;
    }
  }

  /// Cancels any ongoing download process
  void cancelDownload() {
    if (_cancelToken != null && !_cancelToken!.isCancelled) {
      _cancelToken!.cancel('Cancelled by user');
      _logger.info('UPDATE_SERVICE: Sent cancel signal to download token');
    }
  }

  /// Triggers the Android package installer to open the downloaded APK
  Future<bool> installApk(String filePath) async {
    _logger.info('UPDATE_SERVICE: Triggering APK installation for path: $filePath');
    try {
      if (Platform.isAndroid) {
        final status = await Permission.requestInstallPackages.request();
        if (status.isGranted) {
          final result = await OpenFilex.open(filePath, type: 'application/vnd.android.package-archive');
          _logger.info('UPDATE_SERVICE: OpenFilex result: ${result.message} (type: ${result.type})');
          return result.type == ResultType.done;
        } else {
          _logger.warning('UPDATE_SERVICE: Request install packages permission was denied');
          return false;
        }
      }
      return false;
    } catch (e, stack) {
      _logger.error('UPDATE_SERVICE: Failed to install APK', e, stack);
      return false;
    }
  }
}
