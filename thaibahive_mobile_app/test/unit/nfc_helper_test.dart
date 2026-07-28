import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:nfc_manager/nfc_manager.dart';
import 'package:thaibahive_mobile/core/utils/nfc_helper.dart';

void main() {
  group('NfcHelper Tests', () {
    test('extractTagId extracts uppercase Hex hardware UID correctly', () {
      final tagData = {
        'nfca': {
          'identifier': [0x53, 0x86, 0x7B, 0x69, 0xA2, 0x00, 0x01],
        }
      };
      final tag = NfcTag(handle: 'test_handle', data: tagData);
      final tagId = NfcHelper.extractTagId(tag);

      expect(tagId, equals('53867B69A20001'));
    });

    test('extractTagId returns null when tag is unreadable (no NDEF and no valid UID)', () {
      final tagData = <String, dynamic>{};
      final tag = NfcTag(handle: 'empty_handle', data: tagData);
      final tagId = NfcHelper.extractTagId(tag);

      expect(tagId, isNull);
    });

    test('parseNdefRecord parses NDEF Text record (TNF 0x01 T)', () {
      // NDEF Text payload: status byte (0x02 = UTF-8, lang len 2) + 'en' + 'TAG_CHECKPOINT_01'
      final statusByte = 0x02;
      final langBytes = utf8.encode('en');
      final textBytes = utf8.encode('TAG_CHECKPOINT_01');
      final payload = Uint8List.fromList([statusByte, ...langBytes, ...textBytes]);

      final record = NdefRecord(
        typeNameFormat: NdefTypeNameFormat.nfcWellknown,
        type: Uint8List.fromList(utf8.encode('T')),
        identifier: Uint8List(0),
        payload: payload,
      );

      final result = NfcHelper.parseNdefRecord(record);
      expect(result, equals('TAG_CHECKPOINT_01'));
    });

    test('parseNdefRecord parses NDEF URI record (TNF 0x01 U)', () {
      // NDEF URI payload: NFC Forum prefix byte 0x04 ('https://') + 'thaiba-hive.vercel.app'
      final prefixByte = 0x04;
      final uriContent = utf8.encode('thaiba-hive.vercel.app');
      final payload = Uint8List.fromList([prefixByte, ...uriContent]);

      final record = NdefRecord(
        typeNameFormat: NdefTypeNameFormat.nfcWellknown,
        type: Uint8List.fromList(utf8.encode('U')),
        identifier: Uint8List(0),
        payload: payload,
      );

      final result = NfcHelper.parseNdefRecord(record);
      expect(result, equals('https://thaiba-hive.vercel.app'));
    });

    test('extractTagId prioritizes NDEF text payload over hardware UID when both are present', () {
      final statusByte = 0x02;
      final langBytes = utf8.encode('en');
      final textBytes = utf8.encode('WRITTEN_NDEF_ID_999');
      final payload = Uint8List.fromList([statusByte, ...langBytes, ...textBytes]);

      final tagData = {
        'ndef': {
          'isWritable': true,
          'maxSize': 1024,
          'cachedMessage': {
            'records': [
              {
                'typeNameFormat': 1,
                'type': Uint8List.fromList(utf8.encode('T')),
                'identifier': Uint8List(0),
                'payload': payload,
              }
            ]
          }
        },
        'nfca': {
          'identifier': [0x53, 0x86, 0x7B, 0x69, 0xA2, 0x00, 0x01],
        }
      };

      final tag = NfcTag(handle: 'test_handle', data: tagData);
      final tagId = NfcHelper.extractTagId(tag);

      expect(tagId, equals('WRITTEN_NDEF_ID_999'));
    });
  });
}
