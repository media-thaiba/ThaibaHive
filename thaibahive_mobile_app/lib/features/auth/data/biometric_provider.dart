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

class BiometricLockNotifier extends StateNotifier<BiometricLockState> {
  final BiometricService _service = BiometricService();

  BiometricLockNotifier() : super(const BiometricLockState()) {
    init();
  }

  Future<void> init() async {
    final available = await _service.isAvailable();
    final enabled = await _service.isBiometricEnabled();
    if (!mounted) return;
    state = state.copyWith(
      isHardwareAvailable: available,
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

  Future<void> toggleBiometricSetting(bool enabled) async {
    await _service.setBiometricEnabled(enabled);
    state = state.copyWith(isBiometricEnabled: enabled);
  }
}

final biometricLockProvider = StateNotifierProvider<BiometricLockNotifier, BiometricLockState>((ref) {
  return BiometricLockNotifier();
});
