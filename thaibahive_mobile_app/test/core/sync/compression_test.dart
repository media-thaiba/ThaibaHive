import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/sync/compression_util.dart';

void main() {
  group('CompressionUtil Tests', () {
    test('Should compress and decompress structured JSON data', () {
      final payload = {
        'deviceId': 'test-device-123',
        'mutations': [
          {
            'id': 'mut-1',
            'mutationType': 'CREATE',
            'entityType': 'attendance',
            'payload': {'staffId': 'staff-1', 'status': 'present'},
            'clientTimestamp': '2026-08-04T12:00:00Z',
          },
          {
            'id': 'mut-2',
            'mutationType': 'UPDATE',
            'entityType': 'profile',
            'payload': {'name': 'John Doe'},
            'clientTimestamp': '2026-08-04T12:05:00Z',
          }
        ],
      };

      final compressed = CompressionUtil.compress(payload);
      expect(compressed, isNotEmpty);
      expect(compressed[0] == 0x1f && compressed[1] == 0x8b, isTrue); // Gzip headers

      final decompressed = CompressionUtil.decompress(compressed);
      expect(decompressed, isNotNull);
      expect(decompressed!['deviceId'], equals('test-device-123'));
      expect(decompressed['mutations'].length, equals(2));
      expect(decompressed['mutations'][0]['id'], equals('mut-1'));
    });

    test('Should gracefully handle fallback when input is not gzip compressed', () {
      const rawString = '{"message":"hello world"}';
      final bytes = Uint8List.fromList(rawString.codeUnits);
      
      final decompressed = CompressionUtil.decompress(bytes);
      expect(decompressed, isNotNull);
      expect(decompressed!['message'], equals('hello world'));
    });

    test('Should return null for invalid or empty payloads', () {
      expect(CompressionUtil.decompress(Uint8List(0)), isNull);
    });
  });
}
