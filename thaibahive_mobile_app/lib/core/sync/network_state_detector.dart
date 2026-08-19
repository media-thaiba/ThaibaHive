import 'dart:async';

enum NetworkStatus { online, offline }

class NetworkStateDetector {
  final _controller = StreamController<NetworkStatus>.broadcast();
  NetworkStatus _currentStatus = NetworkStatus.online;

  Stream<NetworkStatus> get onStatusChanged => _controller.stream;
  NetworkStatus get currentStatus => _currentStatus;

  void updateStatus(NetworkStatus newStatus) {
    if (_currentStatus != newStatus) {
      _currentStatus = newStatus;
      _controller.add(newStatus);
    }
  }

  void dispose() {
    _controller.close();
  }
}
