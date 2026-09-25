// Offline Vault for Alumni Digital Credentials & Event QR Passes (ALUM-017)

import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/alumni_models.dart';

class AlumniOfflineVault {
  final FlutterSecureStorage _storage;
  static const String _keyEventPasses = 'alumni_offline_event_passes';
  static const String _keyCredential = 'alumni_offline_credential';

  AlumniOfflineVault({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<void> cacheEventPasses(List<MobileEventPass> passes) async {
    final raw = jsonEncode(passes.map((p) => p.toJson()).toList());
    await _storage.write(key: _keyEventPasses, value: raw);
  }

  Future<List<MobileEventPass>> getCachedEventPasses() async {
    final raw = await _storage.read(key: _keyEventPasses);
    if (raw == null) return [];
    try {
      final List<dynamic> list = jsonDecode(raw);
      return list.map((item) => MobileEventPass.fromJson(item)).toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> cacheDigitalCredential(MobileAlumniProfile profile) async {
    final raw = jsonEncode(profile.toJson());
    await _storage.write(key: _keyCredential, value: raw);
  }

  Future<MobileAlumniProfile?> getCachedDigitalCredential() async {
    final raw = await _storage.read(key: _keyCredential);
    if (raw == null) return null;
    try {
      return MobileAlumniProfile.fromJson(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }
}
