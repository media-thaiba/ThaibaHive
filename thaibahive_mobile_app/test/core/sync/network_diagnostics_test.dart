import 'package:flutter_test/flutter_test.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:thaibahive_mobile/core/sync/network_diagnostics_collector.dart';

class MockConnectivity implements Connectivity {
  final List<ConnectivityResult> mockResults;

  MockConnectivity(this.mockResults);

  @override
  Future<List<ConnectivityResult>> checkConnectivity() async {
    return mockResults;
  }

  @override
  Stream<List<ConnectivityResult>> get onConnectivityChanged => Stream.value(mockResults);
}

void main() {
  group('NetworkDiagnosticsCollector Tests', () {
    test('Should return wifi connection status and wifi bandwidth', () async {
      final mock = MockConnectivity([ConnectivityResult.wifi]);
      final collector = NetworkDiagnosticsCollector(connectivity: mock);
      
      final type = await collector.getConnectionType();
      expect(type, equals('wifi'));
      
      final bandwidth = await collector.estimateBandwidth(type);
      expect(bandwidth, equals(12000.0));
    });

    test('Should return cellular connection status and cellular bandwidth', () async {
      final mock = MockConnectivity([ConnectivityResult.mobile]);
      final collector = NetworkDiagnosticsCollector(connectivity: mock);
      
      final type = await collector.getConnectionType();
      expect(type, equals('cellular'));
      
      final bandwidth = await collector.estimateBandwidth(type);
      expect(bandwidth, equals(1500.0));
    });

    test('Should handle offline and none connection status', () async {
      final mock = MockConnectivity([ConnectivityResult.none]);
      final collector = NetworkDiagnosticsCollector(connectivity: mock);
      
      final type = await collector.getConnectionType();
      expect(type, equals('none'));
      
      final bandwidth = await collector.estimateBandwidth(type);
      expect(bandwidth, equals(0.0));
    });

    test('Should return latency as -1 for invalid URLs', () async {
      final mock = MockConnectivity([ConnectivityResult.wifi]);
      final collector = NetworkDiagnosticsCollector(connectivity: mock);
      
      final latency = await collector.measureLatency('http://invalid-domain-name-localhost-test');
      expect(latency, equals(-1));
    });
  });
}
