import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

enum NetworkStatus { online, offline }

class NetworkService extends StateNotifier<NetworkStatus> {
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  NetworkService() : super(NetworkStatus.online) {
    _init();
  }

  void _init() {
    _subscription = _connectivity.onConnectivityChanged.listen(
      (results) {
        _updateStatus(results);
      },
      onError: (error) {
        debugPrint('[NetworkService] Error: $error');
      },
    );

    // Check initial status
    _connectivity.checkConnectivity().then(_updateStatus);
  }

  void _updateStatus(List<ConnectivityResult> results) {
    final hasConnection = results.any(
      (r) => r != ConnectivityResult.none,
    );
    final newStatus = hasConnection ? NetworkStatus.online : NetworkStatus.offline;

    if (state != newStatus) {
      state = newStatus;
      debugPrint('[NetworkService] Status changed: $newStatus');
    }
  }

  bool get isOnline => state == NetworkStatus.online;
  bool get isOffline => state == NetworkStatus.offline;

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }
}

final networkStatusProvider = StateNotifierProvider<NetworkService, NetworkStatus>(
  (ref) => NetworkService(),
);

final isOnlineProvider = Provider<bool>((ref) {
  return ref.watch(networkStatusProvider) == NetworkStatus.online;
});
