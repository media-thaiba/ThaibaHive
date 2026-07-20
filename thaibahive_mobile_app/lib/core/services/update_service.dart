import 'dart:io';
import 'package:dio/dio.dart';
import 'package:open_filex/open_filex.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:thaibahive_mobile/core/constants.dart';
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
  final Dio _dio = Dio();
  CancelToken? _cancelToken;

  /// Compares version strings. Returns true if latest > current.
  bool compareVersions(String current, String latest) {
    logger.info('UPDATE_SERVICE: Comparing versions: current=$current, latest=$latest');
    if (current == latest) {
      logger.info('UPDATE_SERVICE: Versions are identical, no update');
      return false;
    }

    try {
      final currentClean = current.split('-').first.split('+').first;
      final latestClean = latest.split('-').first.split('+').first;
      logger.info('UPDATE_SERVICE: Core versions: current=$currentClean, latest=$latestClean');

      final currentParts = currentClean.split('.').map(int.parse).toList();
      final latestParts = latestClean.split('.').map(int.parse).toList();

      for (int i = 0; i < 3; i++) {
        final currentVal = i < currentParts.length ? currentParts[i] : 0;
        final latestVal = i < latestParts.length ? latestParts[i] : 0;
        if (latestVal > currentVal) {
          logger.info('UPDATE_SERVICE: Core version segment $i: latest($latestVal) > current($currentVal) → UPDATE');
          return true;
        }
        if (latestVal < currentVal) {
          logger.info('UPDATE_SERVICE: Core version segment $i: latest($latestVal) < current($currentVal) → NO UPDATE');
          return false;
        }
      }

      logger.info('UPDATE_SERVICE: Core versions equal, checking build numbers...');
      
      final currentBuildStr = current.contains('+') ? current.split('+').last : null;
      final latestBuildStr = latest.contains('+') ? latest.split('+').last : null;
      
      if (currentBuildStr != null && latestBuildStr != null) {
        final currentBuild = int.tryParse(currentBuildStr) ?? 0;
        final latestBuild = int.tryParse(latestBuildStr) ?? 0;
        logger.info('UPDATE_SERVICE: Build numbers: current=$currentBuild, latest=$latestBuild, result=${latestBuild > currentBuild}');
        return latestBuild > currentBuild;
      }
    } catch (e) {
      logger.error('UPDATE_SERVICE: Error comparing versions: $e');
    }
    
    final fallbackResult = latest.compareTo(current) > 0;
    logger.info('UPDATE_SERVICE: Fallback string comparison result=$fallbackResult');
    return fallbackResult;
  }

  /// Checks the API for the latest app version from system_config.
  Future<UpdateInfo> checkForUpdate({String? apiBaseUrl}) async {
    logger.info('UPDATE_SERVICE: Checking for app updates...');
    try {
      final PackageInfo packageInfo = await PackageInfo.fromPlatform();
      final currentVersion = '${packageInfo.version}+${packageInfo.buildNumber}';

      final baseUrl = apiBaseUrl ?? AppConstants.apiBaseUrl;
      final response = await _dio.get(
        '$baseUrl/system/update',
        options: Options(receiveTimeout: const Duration(seconds: 10)),
      );

      if (response.statusCode == 200 && response.data is Map) {
        final configs = response.data;
        final latestVersion = configs['latestVersion'] as String?;
        final downloadUrl = configs['downloadUrl'] as String?;
        final releaseNotes = configs['releaseNotes'] as String? ??
            'General stability fixes and performance improvements.';
        final isForceUpdate = configs['forceUpdate'] == true;

        if (latestVersion == null || downloadUrl == null || downloadUrl.isEmpty) {
          logger.info('UPDATE_SERVICE: No update config found on server');
          return UpdateInfo.noUpdate(currentVersion);
        }

        final hasUpdate = compareVersions(currentVersion, latestVersion);
        logger.info('UPDATE_SERVICE: Update check finished. Update available: $hasUpdate');

        return UpdateInfo(
          isUpdateAvailable: hasUpdate,
          currentVersion: currentVersion,
          latestVersion: latestVersion,
          downloadUrl: downloadUrl,
          releaseNotes: releaseNotes,
          isForceUpdate: isForceUpdate,
        );
      }

      return UpdateInfo.noUpdate(currentVersion);
    } catch (e) {
      logger.error('UPDATE_SERVICE: Failed to check for updates: $e');
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
    logger.info('UPDATE_SERVICE: Starting APK download from $url');
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

      logger.info('UPDATE_SERVICE: APK download completed: $filePath');
      return filePath;
    } catch (e) {
      if (e is DioException && CancelToken.isCancel(e)) {
        logger.info('UPDATE_SERVICE: APK download cancelled by user');
      } else {
        logger.error('UPDATE_SERVICE: APK download failed: $e');
      }
      return null;
    }
  }

  /// Cancels any ongoing download process
  void cancelDownload() {
    if (_cancelToken != null && !_cancelToken!.isCancelled) {
      _cancelToken!.cancel('Cancelled by user');
      logger.info('UPDATE_SERVICE: Download cancelled');
    }
  }

  /// Triggers the Android package installer to open the downloaded APK
  Future<bool> installApk(String filePath) async {
    logger.info('UPDATE_SERVICE: Triggering APK installation');
    try {
      if (Platform.isAndroid) {
        final status = await Permission.requestInstallPackages.request();
        if (status.isGranted) {
          final result = await OpenFilex.open(
            filePath,
            type: 'application/vnd.android.package-archive',
          );
          logger.info('UPDATE_SERVICE: OpenFilex result: ${result.message}');
          return result.type == ResultType.done;
        } else {
          logger.warning('UPDATE_SERVICE: Install permission denied');
          return false;
        }
      }
      return false;
    } catch (e) {
      logger.error('UPDATE_SERVICE: Failed to install APK: $e');
      return false;
    }
  }
}
