import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class FormDraftService {
  final FlutterSecureStorage _storage;

  FormDraftService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveDraft(String formKey, Map<String, dynamic> data) async {
    try {
      await _storage.write(key: 'form_draft_$formKey', value: jsonEncode(data));
    } catch (_) {}
  }

  Future<Map<String, dynamic>?> getDraft(String formKey) async {
    try {
      final raw = await _storage.read(key: 'form_draft_$formKey');
      if (raw == null || raw.isEmpty) return null;
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  Future<void> clearDraft(String formKey) async {
    try {
      await _storage.delete(key: 'form_draft_$formKey');
    } catch (_) {}
  }
}

final formDraftServiceProvider = Provider<FormDraftService>((ref) {
  return FormDraftService();
});
