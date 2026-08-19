import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'push_notification_service.dart';

final pushNotificationServiceProvider = Provider<PushNotificationService>((ref) {
  return PushNotificationService();
});

class PushNotificationState {
  final bool isRegistered;
  final String? token;
  final String? error;

  PushNotificationState({
    this.isRegistered = false,
    this.token,
    this.error,
  });

  PushNotificationState copyWith({
    bool? isRegistered,
    String? token,
    String? error,
  }) {
    return PushNotificationState(
      isRegistered: isRegistered ?? this.isRegistered,
      token: token ?? this.token,
      error: error ?? this.error,
    );
  }
}

class PushNotificationNotifier extends StateNotifier<PushNotificationState> {
  final PushNotificationService _service;

  PushNotificationNotifier(this._service) : super(PushNotificationState());

  Future<void> registerToken({
    required String token,
    required String platform,
    required String baseUrl,
    required String authToken,
  }) async {
    final success = await _service.registerDeviceToken(
      token: token,
      platform: platform,
      baseUrl: baseUrl,
      authToken: authToken,
    );

    if (success) {
      state = state.copyWith(isRegistered: true, token: token, error: null);
    } else {
      state = state.copyWith(isRegistered: false, error: 'Registration failed');
    }
  }
}

final pushNotificationNotifierProvider =
    StateNotifierProvider<PushNotificationNotifier, PushNotificationState>((ref) {
  final service = ref.watch(pushNotificationServiceProvider);
  return PushNotificationNotifier(service);
});
