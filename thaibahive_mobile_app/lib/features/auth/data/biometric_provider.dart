import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/biometric_service.dart';

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
      await _service.setBiometricEnabled(false);
      enabled = false;
    }

    if (!mounted) return;
    state = state.copyWith(
      isHardwareAvailable: available && enrolled,
      isBiometricEnabled: enabled,
    );
  }

  void onAppPaused() {
    state = state.copyWith(backgroundTimestamp: DateTime.now());
  }

  void onAppResumed() {
    if (!state.isBiometricEnabled || state.backgroundTimestamp == null) return;

    final elapsed = DateTime.now().difference(state.backgroundTimestamp!);
    if (elapsed > const Duration(seconds: 30)) {
      state = state.copyWith(isLocked: true);
    }
  }

  void setPendingDeepLink(String targetRoute) {
    if (state.isLocked) {
      state = state.copyWith(pendingDeepLinkTarget: targetRoute);
    }
  }

  void unlock(GoRouter? router) {
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
    await _service.setBiometricEnabled(false);
    state = state.copyWith(isBiometricEnabled: false);
  }

  Future<BiometricToggleResult> toggleBiometricSetting(bool enabled) async {
    if (!enabled) {
      await _service.setBiometricEnabled(false);
      state = state.copyWith(isBiometricEnabled: false);
      return BiometricToggleResult.disabled;
    }

    final hasEnrolled = await _service.hasEnrolledBiometrics();
    if (!hasEnrolled) {
      return BiometricToggleResult.notEnrolled;
    }

    final authResult = await _service.authenticate(
      localizedReason: 'Scan fingerprint or Face ID to enable Biometric Security',
    );

    if (authResult.success) {
      await _service.setBiometricEnabled(true);
      state = state.copyWith(isBiometricEnabled: true);
      return BiometricToggleResult.success;
    }

    return BiometricToggleResult.authFailed;
  }
}

final biometricLockProvider = StateNotifierProvider<BiometricLockNotifier, BiometricLockState>((ref) {
  return BiometricLockNotifier();
});
