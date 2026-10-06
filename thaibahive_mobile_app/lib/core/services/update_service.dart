import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
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
  final String? sha256;
  final int? fileSize;

  UpdateInfo({
    required this.isUpdateAvailable,
    required this.currentVersion,
    required this.latestVersion,
    required this.downloadUrl,
    required this.releaseNotes,
    required this.isForceUpdate,
    this.sha256,
    this.fileSize,
  });

  factory UpdateInfo.noUpdate(String currentVersion) {
    return UpdateInfo(
      isUpdateAvailable: false,
      currentVersion: currentVersion,
      latestVersion: currentVersion,
      downloadUrl: '',
      releaseNotes: '',
      isForceUpdate: false,
      sha256: null,
      fileSize: null,
    );
  }
}

class UpdateService {
  CancelToken? _cancelToken;

  UpdateService({Dio? dio});

  /// Validates that download URL uses HTTPS and originates from an allow-listed domain
  bool isDownloadUrlAllowed(String urlString) {
    try {
      final uri = Uri.parse(urlString);

      // 1. Enforce HTTPS (HTTP permitted on localhost/emulator in debug mode only)
      if (uri.scheme != 'https') {
        if (kDebugMode && (uri.host == 'localhost' || uri.host == '10.0.2.2' || uri.host == '127.0.0.1')) {
          // Permitted in debug mode only
        } else {
          logger.error('UPDATE_SERVICE: Insecure download URL rejected (HTTPS required): $urlString');
          return false;
        }
      }

      // 2. Allow-list check
      final allowedHosts = <String>{
        'thaibahive.com',
        'www.thaibahive.com',
        'thaiba-hive.vercel.app',
        'github.com',
        'objects.githubusercontent.com',
      };

      try {
        final configuredWebHost = Uri.parse(AppConstants.webBaseUrl).host;
        if (configuredWebHost.isNotEmpty) {
          allowedHosts.add(configuredWebHost);
        }
      } catch (_) {}

      if (kDebugMode) {
        allowedHosts.addAll(['localhost', '10.0.2.2', '127.0.0.1']);
      }

      final host = uri.host.toLowerCase();
      final isAllowed = allowedHosts.contains(host) || allowedHosts.any((allowed) => host.endsWith('.$allowed'));
      if (!isAllowed) {
        logger.error('UPDATE_SERVICE: Download host not in allowlist: $host');
        return false;
      }

      return true;
    } catch (e) {
      logger.error('UPDATE_SERVICE: Invalid download URL: $e');
      return false;
    }
  }

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
      final plainDio = Dio(BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ));
      final response = await plainDio.get(
        '/system/update?t=${DateTime.now().millisecondsSinceEpoch}',
        options: Options(
          validateStatus: (status) => status != null && status < 500,
        ),
      );

      if (response.statusCode == 200 && response.data is Map) {
        final configs = response.data;
        final latestVersion = configs['latestVersion'] as String?;
        final downloadUrl = configs['downloadUrl'] as String?;
        final releaseNotes = configs['releaseNotes'] as String? ??
            'General stability fixes and performance improvements.';
        final isForceUpdate = configs['forceUpdate'] == true;
        final sha256 = configs['sha256'] as String?;
        final fileSize = configs['fileSize'] is int
            ? configs['fileSize'] as int
            : int.tryParse(configs['fileSize']?.toString() ?? '');

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
          sha256: sha256,
          fileSize: fileSize,
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

  /// Downloads the APK to the local cache directory, verifies SHA-256, and tracks progress
  Future<String?> downloadApk(
    String url,
    Function(double) onProgress, {
    String? expectedSha256,
  }) async {
    logger.info('UPDATE_SERVICE: Starting APK download from $url');

    if (!isDownloadUrlAllowed(url)) {
      logger.error('UPDATE_SERVICE: Download aborted: URL violates security allowlist');
      return null;
    }

    _cancelToken = CancelToken();

    try {
      final directory = await getTemporaryDirectory();
      final filePath = '${directory.path}/ThaibaHive_Update.apk';

      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
      }

      final downloadDio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(minutes: 15),
        followRedirects: true,
        maxRedirects: 10,
      ));

      await downloadDio.download(
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

      // Verify cryptographic SHA-256 checksum if provided
      if (expectedSha256 != null && expectedSha256.trim().isNotEmpty) {
        logger.info('UPDATE_SERVICE: Verifying SHA-256 integrity checksum...');
        final bytes = await file.readAsBytes();
        final digest = sha256.convert(bytes);
        final computedHash = digest.toString().toLowerCase();
        final targetHash = expectedSha256.trim().toLowerCase();

        if (computedHash != targetHash) {
          logger.error('UPDATE_SERVICE: Integrity check failed! SHA-256 mismatch: expected $targetHash, got $computedHash');
          if (await file.exists()) {
            await file.delete();
          }
          return null;
        }
        logger.info('UPDATE_SERVICE: SHA-256 checksum integrity verified successfully.');
      }

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
    logger.info('UPDATE_SERVICE: Triggering APK installation for $filePath');
    try {
      if (Platform.isAndroid) {
        var status = await Permission.requestInstallPackages.status;
        if (!status.isGranted) {
          status = await Permission.requestInstallPackages.request();
        }

        if (status.isGranted) {
          final result = await OpenFilex.open(
            filePath,
            type: 'application/vnd.android.package-archive',
          );
          logger.info('UPDATE_SERVICE: OpenFilex result: ${result.message} (${result.type})');
          return result.type == ResultType.done;
        } else {
          logger.warning('UPDATE_SERVICE: Install permission denied, opening app settings');
          await openAppSettings();
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
