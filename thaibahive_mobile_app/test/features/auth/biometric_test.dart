import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/auth/data/biometric_provider.dart';

void main() {
  group('BiometricLockNotifier Tests', () {
    late BiometricLockNotifier notifier;

    beforeEach() {
      notifier = BiometricLockNotifier();
    }

    test('Initial lock state is unlocked', () {
      final state = BiometricLockNotifier().debugState;
      expect(state.isLocked, false);
      expect(state.pendingDeepLinkTarget, isNull);
    });

    test('onAppPaused records timestamp', () {
      final notifier = BiometricLockNotifier();
      notifier.onAppPaused();
      expect(notifier.debugState.backgroundTimestamp, isNotNull);
    });

    test('App backgrounded for >30s triggers lock if biometric is enabled', () {
      final notifier = BiometricLockNotifier();
      notifier.toggleBiometricSetting(true);
      
      // Simulate paused 35 seconds ago
      notifier.state = notifier.state.copyWith(
        isBiometricEnabled: true,
        backgroundTimestamp: DateTime.now().subtract(const Duration(seconds: 35)),
      );

      notifier.onAppResumed();
      expect(notifier.state.isLocked, true);
    });

    test('App backgrounded for <30s does not trigger lock', () {
      final notifier = BiometricLockNotifier();
      notifier.state = notifier.state.copyWith(
        isBiometricEnabled: true,
        backgroundTimestamp: DateTime.now().subtract(const Duration(seconds: 10)),
      );

      notifier.onAppResumed();
      expect(notifier.state.isLocked, false);
    });

    test('Buffers deep-link target when locked and clears target on unlock', () {
      final notifier = BiometricLockNotifier();
      notifier.state = notifier.state.copyWith(isLocked: true);

      notifier.setPendingDeepLink('/leaves');
      expect(notifier.state.pendingDeepLinkTarget, '/leaves');

      notifier.unlock(null);
      expect(notifier.state.isLocked, false);
      expect(notifier.state.pendingDeepLinkTarget, isNull);
    });
  });
}

extension on BiometricLockNotifier {
  BiometricLockState get debugState => state;
  set debugState(BiometricLockState val) => state = val;
}
