import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;
import 'logger_service.dart';

class BiometricService {
  static final BiometricService _instance = BiometricService._internal();
  factory BiometricService() => _instance;
  BiometricService._internal();

  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const String _storageBiometricEnabledKey = 'biometric_enabled';

  /// Tracks whether an OS biometric prompt is currently active to prevent lifecycle thrashing
  bool isAuthenticatingNow = false;

  /// Check if hardware supports biometrics and has enrolled credentials
  Future<bool> isAvailable() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      logger.info('[BiometricService] Hardware check: canCheckBiometrics=$canAuthenticateWithBiometrics, isDeviceSupported=${await _auth.isDeviceSupported()}');
      return canAuthenticate;
    } catch (e, stack) {
      logger.error('[BiometricService] Hardware check error: $e', e, stack);
      return false;
    }
  }

  /// Check if device actually has enrolled biometrics (fingerprints or face registered)
  Future<bool> hasEnrolledBiometrics() async {
    try {
      final canCheck = await _auth.canCheckBiometrics;
      final isSupported = await _auth.isDeviceSupported();
      final available = await _auth.getAvailableBiometrics();
      logger.info('[BiometricService] Enrolled check: canCheck=$canCheck, isSupported=$isSupported, availableTypes=$available');
      // On some Android OEMs / OS versions, getAvailableBiometrics() returns empty even when
      // enrolled fingerprints exist. Relying on canCheck || isSupported avoids false negatives.
      return canCheck || isSupported || available.isNotEmpty;
    } catch (e, stack) {
      logger.error('[BiometricService] Enrolled check error: $e', e, stack);
      return false;
    }
  }

  /// Get list of available biometric types (fingerprint, face, iris)
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      final list = await _auth.getAvailableBiometrics();
      logger.info('[BiometricService] Available biometrics: $list');
      return list;
    } catch (e, stack) {
      logger.error('[BiometricService] Error getting available biometrics: $e', e, stack);
      return [];
    }
  }

  /// Trigger system biometric authentication prompt
  Future<BiometricAuthResult> authenticate({
    String localizedReason = 'Authenticate to access your ThaibaHive account',
  }) async {
    if (isAuthenticatingNow) {
      logger.warning('[BiometricService] Authentication prompt already active. Ignoring duplicate call.');
      return BiometricAuthResult(
        success: false,
        status: BiometricResultStatus.failed,
        errorMessage: 'Authentication is already in progress.',
      );
    }

    try {
      isAuthenticatingNow = true;
      final enrolled = await hasEnrolledBiometrics();
      if (!enrolled) {
        logger.warning('[BiometricService] No biometrics enrolled or supported on device.');
        return BiometricAuthResult(
          success: false,
          status: BiometricResultStatus.noBiometricsEnrolled,
          errorMessage: 'No biometric credentials enrolled on this device. Please set up fingerprint or Face ID in system settings.',
        );
      }

      logger.info('[BiometricService] Displaying biometric prompt: "$localizedReason"');
      // biometricOnly: false allows system credentials (PIN/pattern/password) as fallback,
      // avoiding lockouts on devices where fingerprint hardware classification is WEAK/Class 2.
      final bool authenticated = await _auth.authenticate(
        localizedReason: localizedReason,
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );

      logger.info('[BiometricService] Auth completed. Success: $authenticated');
      return BiometricAuthResult(
        success: authenticated,
        status: authenticated ? BiometricResultStatus.success : BiometricResultStatus.failed,
        errorMessage: authenticated ? null : 'Authentication not completed. Please try again or use your password.',
      );
    } on PlatformException catch (e, stack) {
      logger.error('[BiometricService] Auth PlatformException: ${e.code} - ${e.message}', e, stack);
      if (e.code == auth_error.lockedOut || e.code == auth_error.permanentlyLockedOut) {
        return BiometricAuthResult(
          success: false,
          status: BiometricResultStatus.lockedOut,
          errorMessage: 'Biometric authentication is locked due to multiple failed attempts. Please enter your password.',
        );
      }
      if (e.code == auth_error.notEnrolled) {
        return BiometricAuthResult(
          success: false,
          status: BiometricResultStatus.noBiometricsEnrolled,
          errorMessage: 'No biometrics enrolled on this device. Please register biometrics in device settings.',
        );
      }
      return BiometricAuthResult(
        success: false,
        status: BiometricResultStatus.failed,
        errorMessage: e.message ?? 'Biometric authentication failed (${e.code})',
      );
    } catch (e, stack) {
      logger.error('[BiometricService] Unexpected auth error: $e', e, stack);
      return BiometricAuthResult(
        success: false,
        status: BiometricResultStatus.failed,
        errorMessage: e.toString(),
      );
    } finally {
      isAuthenticatingNow = false;
    }
  }

  /// Check if user has enabled biometric security in App Settings
  Future<bool> isBiometricEnabled() async {
    final value = await _storage.read(key: _storageBiometricEnabledKey);
    return value == 'true';
  }

  /// Update user preference for biometric security in App Settings
  Future<void> setBiometricEnabled(bool enabled) async {
    await _storage.write(key: _storageBiometricEnabledKey, value: enabled ? 'true' : 'false');
  }
}

enum BiometricResultStatus { success, failed, lockedOut, noBiometricsEnrolled }

class BiometricAuthResult {
  final bool success;
  final BiometricResultStatus status;
  final String? errorMessage;

  BiometricAuthResult({
    required this.success,
    required this.status,
    this.errorMessage,
  });
}
