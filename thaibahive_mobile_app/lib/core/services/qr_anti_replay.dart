import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:hive_flutter/hive_flutter.dart';

/// QR code data structure for attendance check-in
class AttendanceQRData {
  final String nonce;
  final DateTime timestamp;
  final String locationId;
  final String hmacSignature;
  final int validDurationSeconds;

  AttendanceQRData({
    required this.nonce,
    required this.timestamp,
    required this.locationId,
    required this.hmacSignature,
    this.validDurationSeconds = 30,
  });

  Map<String, dynamic> toJson() => {
    'nonce': nonce,
    'timestamp': timestamp.toIso8601String(),
    'locationId': locationId,
    'hmac': hmacSignature,
    'validFor': validDurationSeconds,
  };

  factory AttendanceQRData.fromJson(Map<String, dynamic> json) => AttendanceQRData(
    nonce: json['nonce'] as String,
    timestamp: DateTime.parse(json['timestamp'] as String),
    locationId: json['locationId'] as String,
    hmacSignature: json['hmac'] as String,
    validDurationSeconds: json['validFor'] as int? ?? 30,
  );

  /// Encode to base64 for QR display
  String toQRString() {
    final json = toJson();
    final bytes = utf8.encode(jsonEncode(json));
    return base64Url.encode(bytes);
  }

  /// Decode from base64 QR string
  factory AttendanceQRData.fromQRString(String qrString) {
    final bytes = base64Url.decode(qrString);
    final json = jsonDecode(utf8.decode(bytes)) as Map<String, dynamic>;
    return AttendanceQRData.fromJson(json);
  }
}

/// QR anti-replay service
/// 
/// Features:
/// - HMAC-SHA256 signature verification
/// - Time-based validity window (T-1, T, T+1)
/// - Nonce cache to prevent double-scanning
/// - Server-side nonce validation
class QRAntiReplay {
  static const String _nonceCacheBox = 'qr_nonce_cache';
  static const String _lastScanBox = 'qr_last_scan';
  static const int _validWindowSeconds = 30;
  static const int _nonceCacheDurationMinutes = 5;

  late Box<String> _nonceCache;
  late Box<Map> _lastScanCache;
  bool _initialized = false;

  /// Initialize the service
  Future<void> init() async {
    if (_initialized) return;
    
    await Hive.initFlutter();
    
    _nonceCache = await Hive.openBox<String>(_nonceCacheBox);
    _lastScanCache = await Hive.openBox<Map>(_lastScanBox);
    
    _initialized = true;
  }

  /// Generate a signed QR code for a location
  Future<AttendanceQRData> generateQR({
    required String locationId,
    required String hmacSecret,
    int validFor = _validWindowSeconds,
  }) async {
    if (!_initialized) await init();
    
    final nonce = _generateNonce();
    final timestamp = DateTime.now();
    
    // Create HMAC signature
    final signature = _createHMAC(
      nonce: nonce,
      timestamp: timestamp,
      locationId: locationId,
      secret: hmacSecret,
    );
    
    return AttendanceQRData(
      nonce: nonce,
      timestamp: timestamp,
      locationId: locationId,
      hmacSignature: signature,
      validDurationSeconds: validFor,
    );
  }

  /// Validate a scanned QR code
  /// 
  /// Returns true if:
  /// 1. HMAC signature is valid
  /// 2. Timestamp is within valid window (T-1, T, T+1)
  /// 3. Nonce has not been used before
  Future<QRValidationResult> validate({
    required AttendanceQRData qrData,
    required String hmacSecret,
    String? currentLocationId,
  }) async {
    if (!_initialized) await init();
    
    // Check location match
    if (currentLocationId != null && qrData.locationId != currentLocationId) {
      return QRValidationResult(
        isValid: false,
        error: 'Location mismatch',
      );
    }
    
    // Verify HMAC signature
    final expectedSignature = _createHMAC(
      nonce: qrData.nonce,
      timestamp: qrData.timestamp,
      locationId: qrData.locationId,
      secret: hmacSecret,
    );
    
    if (qrData.hmacSignature != expectedSignature) {
      return QRValidationResult(
        isValid: false,
        error: 'Invalid signature',
      );
    }
    
    // Check time validity (T-1, T, T+1 window)
    final now = DateTime.now();
    final timeDiff = now.difference(qrData.timestamp).abs();
    final maxValidTime = Duration(seconds: qrData.validDurationSeconds);
    
    if (timeDiff > maxValidTime) {
      return QRValidationResult(
        isValid: false,
        error: 'QR code expired',
      );
    }
    
    // Check nonce replay
    if (await _isNonceUsed(qrData.nonce)) {
      return QRValidationResult(
        isValid: false,
        error: 'QR code already used',
      );
    }
    
    // Mark nonce as used
    await _markNonceUsed(qrData.nonce);
    
    return QRValidationResult(
      isValid: true,
      attendanceData: {
        'locationId': qrData.locationId,
        'timestamp': qrData.timestamp.toIso8601String(),
        'nonce': qrData.nonce,
      },
    );
  }

  /// Check if a nonce has been used recently
  Future<bool> _isNonceUsed(String nonce) async {
    final usedAt = _nonceCache.get(nonce);
    if (usedAt == null) return false;
    
    final usedTime = DateTime.parse(usedAt);
    final now = DateTime.now();
    final cacheAge = now.difference(usedTime);
    
    // Clean up expired nonces
    if (cacheAge > Duration(minutes: _nonceCacheDurationMinutes)) {
      await _nonceCache.delete(nonce);
      return false;
    }
    
    return true;
  }

  /// Mark a nonce as used
  Future<void> _markNonceUsed(String nonce) async {
    await _nonceCache.put(nonce, DateTime.now().toIso8601String());
  }

  /// Create HMAC-SHA256 signature
  String _createHMAC({
    required String nonce,
    required DateTime timestamp,
    required String locationId,
    required String secret,
  }) {
    final timestampStr = timestamp.toIso8601String();
    final message = '$nonce:$timestampStr:$locationId';
    final key = utf8.encode(secret);
    final bytes = utf8.encode(message);
    final hmacSha256 = Hmac(sha256, key);
    final digest = hmacSha256.convert(bytes);
    return digest.toString();
  }

  /// Generate a cryptographically secure nonce
  String _generateNonce() {
    final random = Random.secure();
    final values = List<int>.generate(32, (_) => random.nextInt(256));
    return base64Url.encode(values);
  }

  /// Clear expired nonces from cache
  Future<void> cleanupCache() async {
    if (!_initialized) await init();
    
    final now = DateTime.now();
    final keysToDelete = <String>[];
    
    for (final key in _nonceCache.keys) {
      final usedAt = _nonceCache.get(key as String);
      if (usedAt != null) {
        final usedTime = DateTime.parse(usedAt);
        if (now.difference(usedTime) > Duration(minutes: _nonceCacheDurationMinutes)) {
          keysToDelete.add(key);
        }
      }
    }
    
    await _nonceCache.deleteAll(keysToDelete);
  }

  /// Get cache statistics
  Map<String, int> getStats() {
    if (!_initialized) return {};
    
    return {
      'cachedNonces': _nonceCache.length,
    };
  }
}

/// Result of QR validation
class QRValidationResult {
  final bool isValid;
  final String? error;
  final Map<String, dynamic>? attendanceData;

  QRValidationResult({
    required this.isValid,
    this.error,
    this.attendanceData,
  });
}

/// Singleton instance
final qrAntiReplay = QRAntiReplay();
