import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:mockito/annotations.dart';
import 'package:mockito/mockito.dart';
import 'package:thaibahive_mobile/core/sync/adaptive_sync_decision_engine.dart';
import 'package:thaibahive_mobile/core/sync/policy_manager.dart';
import 'package:thaibahive_mobile/core/sync/policy_provider.dart';

class MockPolicyManager extends Mock implements PolicyManager {
  @override
  Future<void> init() async => Future.value();

  @override
  Map<String, dynamic>? getCachedPolicy() {
    return {
      'WIFI': {
        'batchSize': 120,
        'compressionLevel': 2,
        'retryBackoffMs': 4000,
        'minBandwidthKbps': 800,
        'maxLatencyMs': 300,
      }
    };
  }
}

class FailureMockPolicyManager extends Mock implements PolicyManager {
  @override
  Future<void> init() async => Future.value();

  @override
  Map<String, dynamic>? getCachedPolicy() => null;

  @override
  Future<Map<String, dynamic>> fetchPoliciesFromServer(String baseUrl, String token) async {
    throw Exception('Server error');
  }
}

class SuccessMockPolicyManager extends Mock implements PolicyManager {
  @override
  Future<void> init() async => Future.value();

  @override
  Map<String, dynamic>? getCachedPolicy() => null;

  @override
  Future<Map<String, dynamic>> fetchPoliciesFromServer(String baseUrl, String token) async {
    return {
      'WIFI': {
        'batchSize': 150,
        'compressionLevel': 1,
        'retryBackoffMs': 3000,
        'minBandwidthKbps': 1000,
        'maxLatencyMs': 200,
      }
    };
  }
}

void main() {
  group('AdaptiveSyncDecisionEngine Tests', () {
    test('WiFi Connection evaluates to high throughput and low compression parameters', () {
      final params = AdaptiveSyncDecisionEngine.evaluate(
        connectionType: 'wifi',
        latencyMs: 100,
        bandwidthKbps: 5000.0,
        batteryLevel: 90.0,
      );

      expect(params.maxBatchSize, equals(100));
      expect(params.compressionLevel, equals(1));
      expect(params.retryBackoffMs, equals(3000));
    });

    test('Cellular Connection evaluates to lower batch size and moderate compression', () {
      final params = AdaptiveSyncDecisionEngine.evaluate(
        connectionType: 'cellular',
        latencyMs: 300,
        bandwidthKbps: 1200.0,
        batteryLevel: 80.0,
      );

      expect(params.maxBatchSize, equals(25));
      expect(params.compressionLevel, equals(5));
      expect(params.retryBackoffMs, equals(10000));
    });

    test('Low Bandwidth triggers Max Compression and Batch size degradation', () {
      final params = AdaptiveSyncDecisionEngine.evaluate(
        connectionType: 'wifi',
        latencyMs: 100,
        bandwidthKbps: 30.0, // < 50Kbps
        batteryLevel: 75.0,
      );

      // Wifi baseline batchSize=100 scale down by 75% -> 25
      expect(params.maxBatchSize, equals(25));
      expect(params.compressionLevel, equals(9));
    });

    test('High Latency triggers Batch Size downscaling and retry backoff increase', () {
      final params = AdaptiveSyncDecisionEngine.evaluate(
        connectionType: 'wifi',
        latencyMs: 2000, // > 1500ms
        bandwidthKbps: 2000.0,
        batteryLevel: 70.0,
      );

      // Wifi baseline batchSize=100 scale down by 75% -> 25. retryBackoff=3000 * 3 -> 9000
      expect(params.maxBatchSize, equals(25));
      expect(params.retryBackoffMs, equals(9000));
      expect(params.compressionLevel, greaterThanOrEqualTo(6));
    });

    test('Low Battery forces best speed compression (1) to save CPU cycles', () {
      final params = AdaptiveSyncDecisionEngine.evaluate(
        connectionType: 'cellular',
        latencyMs: 100,
        bandwidthKbps: 1500.0,
        batteryLevel: 15.0, // < 20%
      );

      expect(params.compressionLevel, equals(1));
      // batchSize slightly reduced (25 * 0.75 = 19)
      expect(params.maxBatchSize, equals(19));
    });

    test('Evaluates with customized active policy map correctly', () {
      final customPolicy = {
        'batchSize': 150,
        'compressionLevel': 3,
        'retryBackoffMs': 8000,
      };

      final params = AdaptiveSyncDecisionEngine.evaluate(
        connectionType: 'wifi',
        latencyMs: 50,
        bandwidthKbps: 10000.0,
        batteryLevel: 100.0,
        activePolicy: customPolicy,
      );

      expect(params.maxBatchSize, equals(150));
      expect(params.compressionLevel, equals(3));
      expect(params.retryBackoffMs, equals(8000));
    });
  });

  group('SyncPolicyNotifier & Circuit Breaker Tests', () {
    test('Initialization loads cached policy from PolicyManager', () async {
      final mock = MockPolicyManager();
      final notifier = SyncPolicyNotifier(manager: mock);

      // Allow microtasks to complete
      await Future.delayed(Duration.zero);

      expect(notifier.state.policies, isNotNull);
      expect(notifier.state.policies!['WIFI']['batchSize'], equals(120));
      expect(notifier.state.consecutiveFailures, equals(0));
    });

    test('3 consecutive failures activates circuit breaker and locks out fetches', () async {
      final mock = FailureMockPolicyManager();
      final notifier = SyncPolicyNotifier(manager: mock);

      await Future.delayed(Duration.zero);

      // Fetch 1
      await notifier.fetchPolicies(baseUrl: 'http://test', token: 'token');
      expect(notifier.state.consecutiveFailures, equals(1));
      expect(notifier.state.isCircuitBreakerActive, isFalse);

      // Fetch 2
      await notifier.fetchPolicies(baseUrl: 'http://test', token: 'token');
      expect(notifier.state.consecutiveFailures, equals(2));
      expect(notifier.state.isCircuitBreakerActive, isFalse);

      // Fetch 3
      await notifier.fetchPolicies(baseUrl: 'http://test', token: 'token');
      expect(notifier.state.consecutiveFailures, equals(3));
      expect(notifier.state.isCircuitBreakerActive, isTrue);
      expect(notifier.state.circuitBreakerActiveUntil, isNotNull);

      // Try to fetch again while CB is active - should skip fetch
      await notifier.fetchPolicies(baseUrl: 'http://test', token: 'token');
      expect(notifier.state.error, contains('Circuit Breaker Active'));
    });

    test('Successful fetch resets consecutive failures count', () async {
      final failMock = FailureMockPolicyManager();
      final notifier = SyncPolicyNotifier(manager: failMock);

      await Future.delayed(Duration.zero);

      // Fail twice
      await notifier.fetchPolicies(baseUrl: 'http://test', token: 'token');
      await notifier.fetchPolicies(baseUrl: 'http://test', token: 'token');
      expect(notifier.state.consecutiveFailures, equals(2));

      // Now switch to successful manager
      final successMock = SuccessMockPolicyManager();
      final successNotifier = SyncPolicyNotifier(manager: successMock);
      await Future.delayed(Duration.zero);

      // Simulate a success fetch
      await successNotifier.fetchPolicies(baseUrl: 'http://test', token: 'token');
      expect(successNotifier.state.consecutiveFailures, equals(0));
      expect(successNotifier.state.policies!['WIFI']['batchSize'], equals(150));
    });
  });
}
