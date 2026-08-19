import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:isolate';
import 'package:flutter/foundation.dart';
import 'adaptive_sync_decision_engine.dart';
import 'compression_util.dart';
import 'isolate_message_protocol.dart';
import 'offline_sync_queue.dart';

void backgroundSyncIsolateEntryPoint(SendPort sendPort) {
  final receivePort = ReceivePort();
  sendPort.send(receivePort.sendPort);

  // Explicit 30-second execution timeout to prevent runaway background isolates
  final timeoutTimer = Timer(const Duration(seconds: 30), () {
    debugPrint('[BackgroundSyncIsolate] Execution timeout reached (30s). Terminating isolate.');
    sendPort.send(IsolateSyncResult(
      success: false,
      syncedCount: 0,
      failedCount: 0,
      error: 'Execution timeout (30s exceeded)',
    ).toJson());
    receivePort.close();
    Isolate.exit(sendPort, 'TIMEOUT');
  });

  receivePort.listen((message) async {
    if (message is Map<String, dynamic>) {
      final command = IsolateSyncCommand.fromJson(message);
      if (command.action == 'FLUSH_QUEUE') {
        try {
          final queue = OfflineSyncQueue();
          await queue.initialize();

          // Extract sync parameters passed from the main thread
          final syncParamsMap = command.params?['syncParams'] as Map<String, dynamic>?;
          final syncParams = syncParamsMap != null
              ? SyncParameters.fromJson(syncParamsMap)
              : const SyncParameters(maxBatchSize: 50, compressionLevel: 1, retryBackoffMs: 5000);

          // Get batch of records restricted by the adaptive maxBatchSize
          final pending = await queue.getOutboxBatch(limit: syncParams.maxBatchSize);

          int syncedCount = 0;
          int failedCount = 0;
          int rawBytesCount = 0;
          int compressedBytesCount = 0;
          double compressionRatio = 0.0;

          if (pending.isNotEmpty) {
            final mutations = pending.map((r) => {
              'id': r.id,
              'mutationType': r.mutationType,
              'entityType': r.entityType,
              'payload': r.payload,
              'clientTimestamp': r.clientTimestamp,
            }).toList();

            final deviceId = command.params?['deviceId'] as String? ?? 'mobile-device';
            
            // Gather diagnostics telemetry if present in command params
            final diagnostics = command.params?['diagnostics'] as Map<String, dynamic>?;

            final body = {
              'deviceId': deviceId,
              'mutations': mutations,
            };

            // Capture raw payload size
            final jsonString = jsonEncode(body);
            final rawBytes = utf8.encode(jsonString);
            rawBytesCount = rawBytes.length;

            // Compress payload and measure time with adaptive compression level
            final stopwatch = Stopwatch()..start();
            final compressedBytes = CompressionUtil.compress(body, level: syncParams.compressionLevel);
            stopwatch.stop();
            final compressionTimeMs = stopwatch.elapsedMilliseconds;
            
            compressedBytesCount = compressedBytes.length;
            compressionRatio = rawBytesCount > 0 ? (1.0 - (compressedBytesCount / rawBytesCount)) : 0.0;

            final payloadWithTelemetry = {
              'deviceId': deviceId,
              'mutations': mutations,
              'diagnostics': {
                if (diagnostics != null) ...diagnostics,
                'compressionStats': {
                  'rawBytes': rawBytesCount,
                  'compressedBytes': compressedBytesCount,
                  'compressionRatio': compressionRatio,
                  'compressionTimeMs': compressionTimeMs,
                },
                'syncParams': syncParams.toJson(),
              }
            };

            // Compress final payload with diagnostics metadata
            final finalCompressedBytes = CompressionUtil.compress(payloadWithTelemetry, level: syncParams.compressionLevel);
            final finalRawBytes = utf8.encode(jsonEncode(payloadWithTelemetry));

            final client = HttpClient();
            client.connectionTimeout = const Duration(seconds: 10);

            try {
              final request = await client.postUrl(Uri.parse('${command.baseUrl}/api/mobile/v1/sync/push'));
              
              request.headers.set('Authorization', 'Bearer ${command.authToken}');
              request.headers.set('Content-Encoding', 'gzip');
              request.headers.set('Content-Type', 'application/json');
              request.add(finalCompressedBytes);

              final response = await request.close();
              final responseBody = await response.transform(utf8.decoder).join();

              if (response.statusCode == 200) {
                final syncedIds = pending.map((e) => e.id).toList();
                await queue.markSynced(syncedIds);
                syncedCount = pending.length;
              } else {
                // Rollback fallback logic: if server returns 415 or 400, retry uncompressed sync
                if (response.statusCode == 415 || response.statusCode == 400) {
                  debugPrint('[BackgroundSyncIsolate] Compression rejected (${response.statusCode}). Retrying uncompressed sync.');
                  final retryRequest = await client.postUrl(Uri.parse('${command.baseUrl}/api/mobile/v1/sync/push'));
                  retryRequest.headers.set('Authorization', 'Bearer ${command.authToken}');
                  retryRequest.headers.set('Content-Type', 'application/json');
                  retryRequest.add(finalRawBytes);

                  final retryResponse = await retryRequest.close();
                  if (retryResponse.statusCode == 200) {
                    final syncedIds = pending.map((e) => e.id).toList();
                    await queue.markSynced(syncedIds);
                    syncedCount = pending.length;
                  } else {
                    failedCount = pending.length;
                  }
                } else {
                  failedCount = pending.length;
                }
              }
            } catch (netError) {
              debugPrint('[BackgroundSyncIsolate] Network sync request failed: $netError');
              failedCount = pending.length;
            } finally {
              client.close();
            }
          }

          timeoutTimer.cancel();
          sendPort.send(IsolateSyncResult(
            success: failedCount == 0,
            syncedCount: syncedCount,
            failedCount: failedCount,
            rawBytesCount: rawBytesCount,
            compressedBytesCount: compressedBytesCount,
            compressionRatio: compressionRatio,
          ).toJson());
        } catch (e) {
          timeoutTimer.cancel();
          sendPort.send(IsolateSyncResult(
            success: false,
            syncedCount: 0,
            failedCount: 0,
            error: e.toString(),
          ).toJson());
        } finally {
          receivePort.close();
          Isolate.exit();
        }
      }
    }
  });
}
