import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';

class NetworkDiagnosticsCollector {
  final Connectivity _connectivity;

  NetworkDiagnosticsCollector({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  /// Gathers connection type, latency, and estimated bandwidth capacity.
  Future<Map<String, dynamic>> collectDiagnostics(String baseUrl) async {
    final connectionType = await getConnectionType();
    final latencyMs = await measureLatency(baseUrl);
    final bandwidthKbps = await estimateBandwidth(connectionType);

    // If bandwidth is <50kbps or latency is >1500ms, flag that we should degrade sync size
    final shouldDegrade = (bandwidthKbps > 0 && bandwidthKbps < 50) || latencyMs > 1500;

    return {
      'connectionType': connectionType,
      'latencyMs': latencyMs,
      'bandwidthKbps': bandwidthKbps,
      'shouldDegrade': shouldDegrade,
    };
  }

  /// Returns connection type as string: wifi, cellular, ethernet, none, or unknown.
  Future<String> getConnectionType() async {
    try {
      final List<ConnectivityResult> results = await _connectivity.checkConnectivity();
      if (results.isEmpty) return 'none';
      final result = results.first;
      
      switch (result) {
        case ConnectivityResult.wifi:
          return 'wifi';
        case ConnectivityResult.mobile:
          return 'cellular';
        case ConnectivityResult.ethernet:
          return 'ethernet';
        case ConnectivityResult.vpn:
          return 'vpn';
        case ConnectivityResult.none:
          return 'none';
        default:
          return 'unknown';
      }
    } catch (_) {
      return 'unknown';
    }
  }

  /// Measures connection latency using a rapid HTTP HEAD request to /api/health.
  /// If HEAD requests are blocked, falls back to a GET request.
  Future<int> measureLatency(String baseUrl) async {
    final client = HttpClient();
    client.connectionTimeout = const Duration(milliseconds: 1500);
    final stopwatch = Stopwatch()..start();
    
    try {
      final request = await client.openUrl('HEAD', Uri.parse('$baseUrl/api/health'));
      final response = await request.close();
      stopwatch.stop();
      await response.drain(); // exhaust body bytes
      return stopwatch.elapsedMilliseconds;
    } catch (_) {
      stopwatch.stop();
      // Graceful fallback to GET request
      stopwatch.reset();
      stopwatch.start();
      try {
        final request = await client.openUrl('GET', Uri.parse('$baseUrl/api/health'));
        final response = await request.close();
        stopwatch.stop();
        await response.drain();
        return stopwatch.elapsedMilliseconds;
      } catch (_) {
        stopwatch.stop();
        return -1; // timed out or blocked by VPN/firewall
      }
    } finally {
      client.close();
    }
  }

  /// Estimates connection bandwidth capability.
  Future<double> estimateBandwidth(String connectionType) async {
    switch (connectionType) {
      case 'wifi':
        return 12000.0; // WiFi standard ~12 Mbps
      case 'cellular':
        return 1500.0;  // Cellular standard ~1.5 Mbps
      case 'ethernet':
        return 50000.0; // Ethernet ~50 Mbps
      case 'none':
        return 0.0;
      default:
        return 150.0;   // Slow cellular or degraded network
    }
  }
}
