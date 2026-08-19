import 'dart:convert';

/// Mobile sync performance & telemetry event record
class SyncTelemetryEvent {
  final String id;
  final int batchSize;
  final double syncDurationMs;
  final String networkType; // 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown'
  final int retryCount;
  final int conflictCount;
  final bool success;
  final String? errorCode;
  final DateTime timestamp;

  SyncTelemetryEvent({
    required this.id,
    required this.batchSize,
    required this.syncDurationMs,
    required this.networkType,
    required this.retryCount,
    required this.conflictCount,
    required this.success,
    this.errorCode,
    DateTime? timestamp,
  }) : timestamp = timestamp ?? DateTime.now();

  Map<String, dynamic> toJson() => {
        'id': id,
        'batchSize': batchSize,
        'syncDurationMs': syncDurationMs,
        'networkType': networkType,
        'retryCount': retryCount,
        'conflictCount': conflictCount,
        'success': success,
        if (errorCode != null) 'errorCode': errorCode,
        'timestamp': timestamp.toIso8601String(),
      };

  factory SyncTelemetryEvent.fromJson(Map<String, dynamic> json) => SyncTelemetryEvent(
        id: json['id'] ?? '',
        batchSize: json['batchSize'] ?? 0,
        syncDurationMs: (json['syncDurationMs'] as num?)?.toDouble() ?? 0.0,
        networkType: json['networkType'] ?? 'unknown',
        retryCount: json['retryCount'] ?? 0,
        conflictCount: json['conflictCount'] ?? 0,
        success: json['success'] ?? true,
        errorCode: json['errorCode'],
        timestamp: json['timestamp'] != null ? DateTime.tryParse(json['timestamp']) : null,
      );
}

/// In-memory buffer & dispatcher for mobile sync telemetry
class MobileSyncTelemetry {
  static final MobileSyncTelemetry _instance = MobileSyncTelemetry._internal();
  factory MobileSyncTelemetry() => _instance;
  MobileSyncTelemetry._internal();

  bool isEnabled = true;
  final List<SyncTelemetryEvent> _buffer = [];
  static const int maxBufferSize = 50;

  List<SyncTelemetryEvent> get buffer => List.unmodifiable(_buffer);

  void recordSyncEvent({
    required int batchSize,
    required double durationMs,
    required String networkType,
    int retryCount = 0,
    int conflictCount = 0,
    bool success = true,
    String? errorCode,
  }) {
    if (!isEnabled) return;

    final event = SyncTelemetryEvent(
      id: 'tel_${DateTime.now().millisecondsSinceEpoch}_${_buffer.length}',
      batchSize: batchSize,
      syncDurationMs: durationMs,
      networkType: networkType,
      retryCount: retryCount,
      conflictCount: conflictCount,
      success: success,
      errorCode: errorCode,
    );

    if (_buffer.length >= maxBufferSize) {
      _buffer.removeAt(0); // Evict oldest
    }
    _buffer.add(event);
  }

  Map<String, dynamic> exportBatchPayload({String? deviceId, String? appVersion}) {
    final events = _buffer.map((e) => e.toJson()).toList();
    return {
      'deviceId': deviceId ?? 'mobile-client',
      'appVersion': appVersion ?? '1.0.0+14',
      'reportedAt': DateTime.now().toIso8601String(),
      'events': events,
    };
  }

  void clearFlushedEvents(List<String> eventIds) {
    _buffer.removeWhere((e) => eventIds.contains(e.id));
  }

  void reset() {
    _buffer.clear();
    isEnabled = true;
  }
}
