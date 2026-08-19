import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/foundation.dart';
import 'policy_manager.dart';

class SyncPolicyState {
  final Map<String, dynamic>? policies;
  final bool isLoading;
  final String? error;
  final int consecutiveFailures;
  final DateTime? circuitBreakerActiveUntil;

  SyncPolicyState({
    this.policies,
    this.isLoading = false,
    this.error,
    this.consecutiveFailures = 0,
    this.circuitBreakerActiveUntil,
  });

  bool get isCircuitBreakerActive {
    if (circuitBreakerActiveUntil == null) return false;
    return DateTime.now().isBefore(circuitBreakerActiveUntil!);
  }

  SyncPolicyState copyWith({
    Map<String, dynamic>? policies,
    bool? isLoading,
    String? error,
    int? consecutiveFailures,
    DateTime? circuitBreakerActiveUntil,
  }) {
    return SyncPolicyState(
      policies: policies ?? this.policies,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
      consecutiveFailures: consecutiveFailures ?? this.consecutiveFailures,
      circuitBreakerActiveUntil: circuitBreakerActiveUntil ?? this.circuitBreakerActiveUntil,
    );
  }
}

class SyncPolicyNotifier extends StateNotifier<SyncPolicyState> {
  final PolicyManager _manager;

  SyncPolicyNotifier({PolicyManager? manager})
      : _manager = manager ?? PolicyManager(),
        super(SyncPolicyState()) {
    _init();
  }

  Future<void> _init() async {
    await _manager.init();
    final cached = _manager.getCachedPolicy();
    if (cached != null) {
      state = state.copyWith(policies: cached);
    }
  }

  Future<void> fetchPolicies({required String baseUrl, required String token}) async {
    // Check Circuit Breaker
    if (state.isCircuitBreakerActive) {
      debugPrint('[SyncPolicyNotifier] Circuit Breaker Active. Skipping fetch from server.');
      state = state.copyWith(error: 'Circuit Breaker Active: Using Cached/Default Policies');
      return;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final fresh = await _manager.fetchPoliciesFromServer(baseUrl, token);
      state = state.copyWith(
        policies: fresh,
        isLoading: false,
        consecutiveFailures: 0,
        circuitBreakerActiveUntil: null,
      );
      debugPrint('[SyncPolicyNotifier] Successfully fetched sync policies.');
    } catch (e) {
      final nextFailuresCount = state.consecutiveFailures + 1;
      DateTime? activeUntil;
      if (nextFailuresCount >= 3) {
        activeUntil = DateTime.now().add(const Duration(hours: 2));
        debugPrint('[SyncPolicyNotifier] 3 consecutive failures. Activating circuit breaker for 2 hours.');
      }

      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
        consecutiveFailures: nextFailuresCount,
        circuitBreakerActiveUntil: activeUntil,
      );
      
      // Fallback to cache if available
      final cached = _manager.getCachedPolicy();
      if (cached != null) {
        state = state.copyWith(policies: cached);
      }
    }
  }

  void forceResetCircuitBreaker() {
    state = state.copyWith(
      consecutiveFailures: 0,
      circuitBreakerActiveUntil: null,
    );
  }
}

final syncPolicyProvider = StateNotifierProvider<SyncPolicyNotifier, SyncPolicyState>((ref) {
  return SyncPolicyNotifier();
});
