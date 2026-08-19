import 'dart:math';

class SyncParameters {
  final int maxBatchSize;
  final int compressionLevel;
  final int retryBackoffMs;

  const SyncParameters({
    required this.maxBatchSize,
    required this.compressionLevel,
    required this.retryBackoffMs,
  });

  @override
  String toString() {
    return 'SyncParameters(maxBatchSize: $maxBatchSize, compressionLevel: $compressionLevel, retryBackoffMs: $retryBackoffMs)';
  }

  Map<String, dynamic> toJson() {
    return {
      'maxBatchSize': maxBatchSize,
      'compressionLevel': compressionLevel,
      'retryBackoffMs': retryBackoffMs,
    };
  }

  factory SyncParameters.fromJson(Map<String, dynamic> json) {
    return SyncParameters(
      maxBatchSize: json['maxBatchSize'] ?? 50,
      compressionLevel: json['compressionLevel'] ?? 1,
      retryBackoffMs: json['retryBackoffMs'] ?? 5000,
    );
  }
}

class AdaptiveSyncDecisionEngine {
  /// Evaluates raw network metrics and device battery status to yield optimal sync parameters.
  /// [activePolicy] contains policy thresholds (e.g. read from cached policies table).
  /// If null, default hardcoded values are applied.
  static SyncParameters evaluate({
    required String connectionType,
    required int latencyMs,
    required double bandwidthKbps,
    required double batteryLevel, // 0.0 to 100.0 or 0.0 to 1.0 (normalized dynamically)
    Map<String, dynamic>? activePolicy,
  }) {
    // Determine default base parameters based on connection type
    int baseMaxBatchSize = 50;
    int baseCompressionLevel = 1;
    int baseRetryBackoffMs = 5000;

    // Apply network policies if provided
    if (activePolicy != null) {
      baseMaxBatchSize = activePolicy['batchSize'] ?? baseMaxBatchSize;
      baseCompressionLevel = activePolicy['compressionLevel'] ?? baseCompressionLevel;
      baseRetryBackoffMs = activePolicy['retryBackoffMs'] ?? baseRetryBackoffMs;
    } else {
      // Fallback defaults based on connection type
      if (connectionType == 'wifi' || connectionType == 'ethernet') {
        baseMaxBatchSize = 100;
        baseCompressionLevel = 1; // Z_BEST_SPEED is sufficient for WiFi to save CPU
        baseRetryBackoffMs = 3000;
      } else if (connectionType == 'cellular') {
        baseMaxBatchSize = 25;
        baseCompressionLevel = 5; // Z_DEFAULT_COMPRESSION to save bandwidth on cellular
        baseRetryBackoffMs = 10000;
      } else {
        baseMaxBatchSize = 10;
        baseCompressionLevel = 9; // Best compression on unknown/degraded network
        baseRetryBackoffMs = 20000;
      }
    }

    // Dynamic adjustments based on current runtime metrics (e.g., latency, bandwidth, battery)
    int maxBatchSize = baseMaxBatchSize;
    int compressionLevel = baseCompressionLevel;
    int retryBackoffMs = baseRetryBackoffMs;

    // Latency degradation: If latency is high, reduce batch size
    if (latencyMs > 1500) {
      maxBatchSize = (maxBatchSize * 0.25).round(); // scale down by 75%
      retryBackoffMs = retryBackoffMs * 3;
      compressionLevel = max(compressionLevel, 6);
    } else if (latencyMs > 500) {
      maxBatchSize = (maxBatchSize * 0.5).round(); // scale down by 50%
      retryBackoffMs = retryBackoffMs * 2;
      compressionLevel = max(compressionLevel, 3);
    }

    // Bandwidth degradation: If bandwidth is low, reduce batch size and increase compression
    if (bandwidthKbps > 0.0 && bandwidthKbps < 50.0) {
      maxBatchSize = (maxBatchSize * 0.25).round(); // scale down by 75%
      compressionLevel = 9; // Max compression
    } else if (bandwidthKbps > 0.0 && bandwidthKbps < 250.0) {
      maxBatchSize = (maxBatchSize * 0.5).round(); // scale down by 50%
      compressionLevel = max(compressionLevel, 6);
    }

    // Battery degradation: If battery is low (< 20%), force low compression level to save CPU
    final batteryPct = batteryLevel <= 1.0 && batteryLevel > 0.0 ? batteryLevel * 100.0 : batteryLevel;
    if (batteryPct < 20.0 && batteryPct > 0.0) {
      compressionLevel = 1; // best speed
      maxBatchSize = max(5, (maxBatchSize * 0.75).round()); // slight batch reduction to minimize active time
    }

    // Enforce sanity limits
    maxBatchSize = max(1, min(maxBatchSize, 200));
    compressionLevel = max(1, min(compressionLevel, 9));
    retryBackoffMs = max(1000, min(retryBackoffMs, 120000));

    return SyncParameters(
      maxBatchSize: maxBatchSize,
      compressionLevel: compressionLevel,
      retryBackoffMs: retryBackoffMs,
    );
  }
}
