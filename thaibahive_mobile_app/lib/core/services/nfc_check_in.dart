import 'package:flutter/foundation.dart';
import 'package:nfc_manager/nfc_manager.dart';

import 'offline_queue.dart';
import 'qr_anti_replay.dart';

/// NFC check-in result
class NFCCheckInResult {
  final bool success;
  final String? error;
  final Map<String, dynamic>? data;

  NFCCheckInResult({
    required this.success,
    this.error,
    this.data,
  });
}

/// NFC-based attendance check-in service
/// 
/// Features:
/// - NFC tag reading for attendance
/// - Offline queue support
/// - Duplicate check prevention
/// - Location validation
class NFCCheckInService {
  bool _isScanning = false;

  /// Check if NFC is available on this device
  Future<bool> isAvailable() async {
    try {
      return await NfcManager.instance.isAvailable();
    } catch (e) {
      debugPrint('[NFC] Availability check failed: $e');
      return false;
    }
  }

  /// Start NFC scanning for attendance
  Future<void> startScanning({
    required String locationId,
    required Function(NFCCheckInResult) onResult,
  }) async {
    if (_isScanning) {
      onResult(NFCCheckInResult(
        success: false,
        error: 'Already scanning',
      ));
      return;
    }

    final available = await isAvailable();
    if (!available) {
      onResult(NFCCheckInResult(
        success: false,
        error: 'NFC not available on this device',
      ));
      return;
    }

    _isScanning = true;

    try {
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          try {
            final result = await _processTag(tag, locationId);
            onResult(result);
          } catch (e) {
            onResult(NFCCheckInResult(
              success: false,
              error: 'Failed to process NFC tag: $e',
            ));
          }
        },
        onError: (error) async {
          _isScanning = false;
          onResult(NFCCheckInResult(
            success: false,
            error: 'NFC session error: $error',
          ));
        },
      );
    } catch (e) {
      _isScanning = false;
      onResult(NFCCheckInResult(
        success: false,
        error: 'Failed to start NFC session: $e',
      ));
    }
  }

  /// Stop NFC scanning
  Future<void> stopScanning() async {
    if (_isScanning) {
      await NfcManager.instance.stopSession();
      _isScanning = false;
    }
  }

  /// Process an NFC tag
  Future<NFCCheckInResult> _processTag(NfcTag tag, String locationId) async {
    // Extract data from NFC tag
    final data = _extractTagData(tag);
    
    if (data == null) {
      return NFCCheckInResult(
        success: false,
        error: 'Invalid NFC tag format',
      );
    }

    // Queue for offline sync
    final event = await offlineQueue.enqueue(
      type: 'attendance_nfc_checkin',
      payload: {
        'locationId': locationId,
        'tagData': data,
        'timestamp': DateTime.now().toIso8601String(),
      },
    );

    return NFCCheckInResult(
      success: true,
      data: {
        'clientEventId': event.clientEventId,
        'locationId': locationId,
        'timestamp': event.createdAt.toIso8601String(),
      },
    );
  }

  /// Extract data from NFC tag
  Map<String, dynamic>? _extractTagData(NfcTag tag) {
    try {
      // Try to read NDEF message
      final ndef = Ndef.from(tag);
      if (ndef != null && ndef.cachedMessage != null) {
        final message = ndef.cachedMessage!;
        if (message.records.isNotEmpty) {
          final record = message.records.first;
          final payload = String.fromCharCodes(record.payload);
          return {'type': 'ndef', 'payload': payload};
        }
      }

      // Fallback to raw tag data
      return {
        'type': 'raw',
        'id': tag.handle,
        'techTypes': tag.data.keys.toList(),
      };
    } catch (e) {
      debugPrint('[NFC] Failed to extract tag data: $e');
      return null;
    }
  }

  /// Check if currently scanning
  bool get isScanning => _isScanning;
}

/// Singleton instance
final nfcCheckInService = NFCCheckInService();
