import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

class CompressionUtil {
  /// Compresses a JSON map to gzip bytes.
  /// Defaults to compression level 1 (Z_BEST_SPEED) for battery optimization.
  static Uint8List compress(Map<String, dynamic> payload, {int level = 1}) {
    try {
      final jsonString = jsonEncode(payload);
      final rawBytes = utf8.encode(jsonString);
      
      // Native zlib compression using dart:io
      final gzipCodec = GZipCodec(level: level);
      final compressed = gzipCodec.encode(rawBytes);
      return Uint8List.fromList(compressed);
    } catch (e) {
      // Graceful fallback to raw UTF-8 bytes to ensure sync doesn't fail
      try {
        final jsonString = jsonEncode(payload);
        return Uint8List.fromList(utf8.encode(jsonString));
      } catch (_) {
        return Uint8List(0);
      }
    }
  }

  /// Decompresses gzip bytes or raw UTF-8 bytes back into a JSON map.
  static Map<String, dynamic>? decompress(Uint8List compressedData) {
    try {
      if (compressedData.isEmpty) return null;

      // Detect gzip magic number (0x1f 0x8b)
      final isGzip = compressedData.length >= 2 &&
          compressedData[0] == 0x1f &&
          compressedData[1] == 0x8b;

      String jsonString;
      if (isGzip) {
        final decompressed = gzip.decode(compressedData);
        jsonString = utf8.decode(decompressed);
      } else {
        jsonString = utf8.decode(compressedData);
      }

      return jsonDecode(jsonString) as Map<String, dynamic>?;
    } catch (e) {
      return null;
    }
  }
}
