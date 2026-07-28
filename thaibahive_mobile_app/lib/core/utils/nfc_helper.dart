import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:nfc_manager/nfc_manager.dart';

/// Unified helper for safely extracting tag IDs and parsing NDEF records
class NfcHelper {
  /// Extracts a unique string identifier from an NFC tag.
  /// 1. Tries NDEF message payload (handling Text TNF 0x01 'T' and URI TNF 0x01 'U' records).
  /// 2. If NDEF is absent or empty, falls back to Hardware UID hex string from tag technologies.
  /// 3. Returns `null` if the tag is unreadable or empty (never returns an empty string or placeholder).
  static String? extractTagId(NfcTag tag) {
    try {
      // 1. Try NDEF message payload
      final ndef = Ndef.from(tag);
      if (ndef != null && ndef.cachedMessage != null && ndef.cachedMessage!.records.isNotEmpty) {
        final record = ndef.cachedMessage!.records.first;
        final payloadStr = parseNdefRecord(record);
        if (payloadStr != null && payloadStr.trim().isNotEmpty) {
          return payloadStr.trim();
        }
      }

      // 2. Hardware UID Extraction from tag data
      final data = tag.data;
      List<dynamic>? identifierBytes;

      final techKeys = ['nfca', 'isodep', 'mifare', 'mifareultralight', 'ndef', 'nfcb', 'nfcf', 'nfcv'];
      for (final key in techKeys) {
        if (data.containsKey(key) && data[key] is Map) {
          final techMap = data[key] as Map;
          if (techMap.containsKey('identifier') && techMap['identifier'] is List) {
            identifierBytes = techMap['identifier'] as List;
            break;
          }
        }
      }

      if (identifierBytes != null && identifierBytes.isNotEmpty) {
        final hexString = identifierBytes
            .whereType<int>()
            .map((e) => e.toRadixString(16).padLeft(2, '0'))
            .join('')
            .toUpperCase();

        if (hexString.isNotEmpty) {
          return hexString;
        }
      }

      return null;
    } catch (e) {
      debugPrint('[NfcHelper] Failed to extract tag ID: $e');
      return null;
    }
  }

  /// Parses an NDEF Record safely according to TNF and RTD.
  static String? parseNdefRecord(NdefRecord record) {
    try {
      final payload = record.payload;
      if (payload.isEmpty) return null;

      // Check TNF = Well Known (0x01)
      if (record.typeNameFormat == NdefTypeNameFormat.nfcWellknown) {
        // Text record ('T')
        if (listEquals(record.type, utf8.encode('T'))) {
          if (payload.isEmpty) return null;
          final statusByte = payload[0];
          final isUtf16 = (statusByte & 0x80) != 0;
          final langCodeLength = statusByte & 0x3F;
          if (payload.length <= 1 + langCodeLength) return null;

          final textBytes = payload.sublist(1 + langCodeLength);
          if (isUtf16) {
            return String.fromCharCodes(textBytes);
          } else {
            return utf8.decode(textBytes);
          }
        }

        // URI record ('U')
        if (listEquals(record.type, utf8.encode('U'))) {
          if (payload.isEmpty) return null;
          final prefixByte = payload[0];
          final uriPrefixes = [
            '', 'http://www.', 'https://www.', 'http://', 'https://',
            'tel:', 'mailto:', 'ftp://anonymous:anonymous@', 'ftp://ftp.',
            'ftps://', 'sftp://', 'smb://', 'nfs://', 'ftp://', 'dav://',
            'news:', 'telnet://', 'imap:', 'rtsp://', 'urn:', 'pop:',
            'sip:', 'sips:', 'tftp:', 'btspp://', 'btl2cap://', 'btgoep://',
            'tcpobex://', 'irdaobex://', 'file://', 'urn:epc:id:', 'urn:epc:tag:',
            'urn:epc:pat:', 'urn:epc:raw:', 'urn:epc:', 'urn:nfc:'
          ];
          final prefix = (prefixByte >= 0 && prefixByte < uriPrefixes.length)
              ? uriPrefixes[prefixByte]
              : '';
          final uriContent = utf8.decode(payload.sublist(1));
          return '$prefix$uriContent';
        }
      }

      // Fallback: UTF-8 decode payload directly if valid
      try {
        return utf8.decode(payload);
      } catch (_) {
        return null;
      }
    } catch (e) {
      debugPrint('[NfcHelper] Error parsing NDEF record: $e');
      return null;
    }
  }
}
