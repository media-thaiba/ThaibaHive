import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/biometric_service.dart';
import '../../../core/services/logger_service.dart';

class BiometricLockState {
  final bool isLocked;
  final bool isBiometricEnabled;
  final bool isHardwareAvailable;
  final String? pendingDeepLinkTarget;
  final DateTime? backgroundTimestamp;

  const BiometricLockState({
    this.isLocked = false,
    this.isBiometricEnabled = false,
    this.isHardwareAvailable = false,
    this.pendingDeepLinkTarget,
    this.backgroundTimestamp,
  });

  BiometricLockState copyWith({
    bool? isLocked,
    bool? isBiometricEnabled,
    bool? isHardwareAvailable,
    String? pendingDeepLinkTarget,
    DateTime? backgroundTimestamp,
    bool clearPendingTarget = false,
  }) {
    return BiometricLockState(
      isLocked: isLocked ?? this.isLocked,
      isBiometricEnabled: isBiometricEnabled ?? this.isBiometricEnabled,
      isHardwareAvailable: isHardwareAvailable ?? this.isHardwareAvailable,
      pendingDeepLinkTarget: clearPendingTarget ? null : (pendingDeepLinkTarget ?? this.pendingDeepLinkTarget),
      backgroundTimestamp: backgroundTimestamp ?? this.backgroundTimestamp,
    );
  }
}

enum BiometricToggleResult { success, disabled, notEnrolled, authFailed }

class BiometricLockNotifier extends StateNotifier<BiometricLockState> {
  final BiometricService _service = BiometricService();

  BiometricLockNotifier() : super(const BiometricLockState()) {
    init();
  }

  Future<void> init() async {
    final available = await _service.isAvailable();
    final enrolled = await _service.hasEnrolledBiometrics();
    var enabled = await _service.isBiometricEnabled();

    // Auto-clear stale setting if biometrics were removed from device
    if (enabled && (!available || !enrolled)) {
      logger.warning('[BiometricLock] Biometric setting auto-cleared: hardware or enrollment unavailable');
      await _service.setBiometricEnabled(false);
      enabled = false;
    }

    if (!mounted) return;
    state = state.copyWith(
      isHardwareAvailable: available && enrolled,
      isBiometricEnabled: enabled,
    );
    logger.info('[BiometricLock] Initialized: available=$available, enrolled=$enrolled, enabled=$enabled');
  }

  void onAppPaused() {
    if (_service.isAuthenticatingNow) {
      logger.info('[BiometricLock] onAppPaused ignored: biometric prompt is active');
      return;
    }
    logger.info('[BiometricLock] App paused. Setting background timestamp.');
    state = state.copyWith(backgroundTimestamp: DateTime.now());
  }

  void onAppResumed() {
    if (_service.isAuthenticatingNow) {
      logger.info('[BiometricLock] onAppResumed ignored: biometric prompt is active');
      return;
    }
    if (!state.isBiometricEnabled || state.backgroundTimestamp == null) return;

    final elapsed = DateTime.now().difference(state.backgroundTimestamp!);
    logger.info('[BiometricLock] App resumed after ${elapsed.inSeconds}s (threshold: 30s)');
    if (elapsed > const Duration(seconds: 30)) {
      logger.warning('[BiometricLock] App locked due to background inactivity (${elapsed.inSeconds}s)');
      state = state.copyWith(isLocked: true);
    }
  }

  void setPendingDeepLink(String targetRoute) {
    if (state.isLocked) {
      state = state.copyWith(pendingDeepLinkTarget: targetRoute);
    }
  }

  void unlock(GoRouter? router) {
    logger.info('[BiometricLock] App unlocked successfully');
    final pendingRoute = state.pendingDeepLinkTarget;
    state = state.copyWith(
      isLocked: false,
      clearPendingTarget: true,
      backgroundTimestamp: null,
    );

    if (pendingRoute != null && router != null) {
      router.go(pendingRoute);
    }
  }

  Future<void> autoDisableBiometrics() async {
    logger.warning('[BiometricLock] autoDisableBiometrics invoked');
    await _service.setBiometricEnabled(false);
    state = state.copyWith(isBiometricEnabled: false);
  }

  Future<BiometricToggleResult> toggleBiometricSetting(bool enabled) async {
    if (!enabled) {
      logger.info('[BiometricLock] User disabled biometric security');
      await _service.setBiometricEnabled(false);
      state = state.copyWith(isBiometricEnabled: false);
      return BiometricToggleResult.disabled;
    }

    final hasEnrolled = await _service.hasEnrolledBiometrics();
    if (!hasEnrolled) {
      logger.warning('[BiometricLock] Toggle failed: no biometrics enrolled');
      return BiometricToggleResult.notEnrolled;
    }

    final authResult = await _service.authenticate(
      localizedReason: 'Scan fingerprint or Face ID to enable Biometric Security',
    );

    if (authResult.success) {
      logger.info('[BiometricLock] Biometric security enabled successfully');
      await _service.setBiometricEnabled(true);
      state = state.copyWith(isBiometricEnabled: true);
      return BiometricToggleResult.success;
    }

    logger.warning('[BiometricLock] Biometric security toggle failed: verification was unsuccessful');
    return BiometricToggleResult.authFailed;
  }
}

final biometricLockProvider = StateNotifierProvider<BiometricLockNotifier, BiometricLockState>((ref) {
  return BiometricLockNotifier();
});
