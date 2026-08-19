class IsolateSyncCommand {
  final String action; // 'START_SYNC' | 'STOP_SYNC' | 'FLUSH_QUEUE'
  final String baseUrl;
  final String authToken;
  final Map<String, dynamic>? params;

  IsolateSyncCommand({
    required this.action,
    required this.baseUrl,
    required this.authToken,
    this.params,
  });

  Map<String, dynamic> toJson() => {
        'action': action,
        'baseUrl': baseUrl,
        'authToken': authToken,
        'params': params,
      };

  factory IsolateSyncCommand.fromJson(Map<String, dynamic> json) =>
      IsolateSyncCommand(
        action: json['action'] as String,
        baseUrl: json['baseUrl'] as String,
        authToken: json['authToken'] as String,
        params: json['params'] as Map<String, dynamic>?,
      );
}

class IsolateSyncResult {
  final bool success;
  final int syncedCount;
  final int failedCount;
  final String? error;
  final int? rawBytesCount;
  final int? compressedBytesCount;
  final double? compressionRatio;

  IsolateSyncResult({
    required this.success,
    required this.syncedCount,
    required this.failedCount,
    this.error,
    this.rawBytesCount,
    this.compressedBytesCount,
    this.compressionRatio,
  });

  Map<String, dynamic> toJson() => {
        'success': success,
        'syncedCount': syncedCount,
        'failedCount': failedCount,
        'error': error,
        'rawBytesCount': rawBytesCount,
        'compressedBytesCount': compressedBytesCount,
        'compressionRatio': compressionRatio,
      };
}
