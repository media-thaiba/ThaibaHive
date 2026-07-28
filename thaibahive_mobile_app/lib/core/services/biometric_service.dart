import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;

class BiometricService {
  static final BiometricService _instance = BiometricService._internal();
  factory BiometricService() => _instance;
  BiometricService._internal();

  final LocalAuthentication _auth = LocalAuthentication();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const String _storageBiometricEnabledKey = 'biometric_enabled';

  /// Check if hardware supports biometrics and has enrolled credentials
  Future<bool> isAvailable() async {
    try {
      final bool canAuthenticateWithBiometrics = await _auth.canCheckBiometrics;
      final bool canAuthenticate = canAuthenticateWithBiometrics || await _auth.isDeviceSupported();
      return canAuthenticate;
    } catch (e) {
      if (kDebugMode) print('[BiometricService] Hardware check error: $e');
      return false;
    }
  }

  /// Get list of available biometric types (fingerprint, face, iris)
  Future<List<BiometricType>> getAvailableBiometrics() async {
    try {
      return await _auth.getAvailableBiometrics();
    } catch (e) {
      if (kDebugMode) print('[BiometricService] Error getting available biometrics: $e');
      return [];
    }
  }

  /// Trigger system biometric authentication prompt
  Future<BiometricAuthResult> authenticate({
    String localizedReason = 'Authenticate to access your ThaibaHive account',
  }) async {
    try {
      final bool authenticated = await _auth.authenticate(
        localizedReason: localizedReason,
        options: const AuthenticationOptions(
          biometricOnly: true,
          stickyAuth: true,
          useErrorDialogs: true,
        ),
      );
      return BiometricAuthResult(
        success: authenticated,
        status: authenticated ? BiometricResultStatus.success : BiometricResultStatus.failed,
      );
    } on PlatformException catch (e) {
      if (kDebugMode) print('[BiometricService] Auth error: ${e.code} - ${e.message}');
      if (e.code == auth_error.lockedOut || e.code == auth_error.permanentlyLockedOut) {
        return BiometricAuthResult(
          success: false,
          status: BiometricResultStatus.lockedOut,
          errorMessage: 'Biometric authentication is locked due to multiple failed attempts. Please enter your password.',
        );
      }
      return BiometricAuthResult(
        success: false,
        status: BiometricResultStatus.failed,
        errorMessage: e.message ?? 'Biometric authentication failed',
      );
    } catch (e) {
      return BiometricAuthResult(
        success: false,
        status: BiometricResultStatus.failed,
        errorMessage: e.toString(),
      );
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

enum BiometricResultStatus { success, failed, lockedOut }

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
