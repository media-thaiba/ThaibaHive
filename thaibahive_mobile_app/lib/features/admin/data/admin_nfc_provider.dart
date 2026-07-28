import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

final adminNfcProvider = StateNotifierProvider<AdminNfcNotifier, AdminNfcState>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return AdminNfcNotifier(apiClient);
});

class AdminNfcState {
  final bool isScanning;
  final bool isLoading;
  final Map<String, dynamic>? lookupResult;
  final String? error;
  final String? successMessage;

  const AdminNfcState({
    this.isScanning = false,
    this.isLoading = false,
    this.lookupResult,
    this.error,
    this.successMessage,
  });

  AdminNfcState copyWith({
    bool? isScanning,
    bool? isLoading,
    Map<String, dynamic>? lookupResult,
    String? error,
    String? successMessage,
    bool clearLookup = false,
  }) {
    return AdminNfcState(
      isScanning: isScanning ?? this.isScanning,
      isLoading: isLoading ?? this.isLoading,
      lookupResult: clearLookup ? null : (lookupResult ?? this.lookupResult),
      error: error,
      successMessage: successMessage,
    );
  }
}

class AdminNfcNotifier extends StateNotifier<AdminNfcState> {
  final ApiClient _apiClient;
  final _uuid = const Uuid();

  AdminNfcNotifier(this._apiClient) : super(const AdminNfcState());

  void setScanning(bool scanning) {
    state = state.copyWith(isScanning: scanning, error: null);
  }

  void clearState() {
    state = const AdminNfcState();
  }

  Future<Map<String, dynamic>?> lookupTag(String tagId) async {
    state = state.copyWith(isLoading: true, error: null, successMessage: null);
    try {
      final response = await _apiClient.get(
        '/admin/nfc/lookup',
        queryParameters: {'tagId': tagId},
      );

      final data = response is Map<String, dynamic> ? response : <String, dynamic>{};
      state = state.copyWith(isLoading: false, lookupResult: data);
      return data;
    } catch (e) {
      debugPrint('[AdminNFC] Lookup error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
      return null;
    }
  }

  Future<bool> assignTag({
    required String type,
    required String targetId,
    required String nfcTagId,
    bool forceReassign = false,
    String? expectedCurrentOwnerId,
  }) async {
    state = state.copyWith(isLoading: true, error: null, successMessage: null);
    try {
      final requestId = _uuid.v4();
      final body = {
        'type': type,
        'targetId': targetId,
        'nfcTagId': nfcTagId,
        'forceReassign': forceReassign,
        if (expectedCurrentOwnerId != null)
          'expectedCurrentOwnerId': expectedCurrentOwnerId,
        'clientRequestId': requestId,
      };

      final response = await _apiClient.post('/admin/nfc/assign', data: body);
      final data = response is Map<String, dynamic> ? response : <String, dynamic>{};

      if (data['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'NFC Tag successfully assigned',
          clearLookup: true,
        );
        return true;
      }

      state = state.copyWith(isLoading: false, error: 'Assignment failed');
      return false;
    } catch (e) {
      debugPrint('[AdminNFC] Assign error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> unbindTag({
    required String type,
    required String targetId,
  }) async {
    state = state.copyWith(isLoading: true, error: null, successMessage: null);
    try {
      final body = {
        'type': type,
        'targetId': targetId,
      };

      final response = await _apiClient.post('/admin/nfc/unbind', data: body);
      final data = response is Map<String, dynamic> ? response : <String, dynamic>{};

      if (data['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'NFC Tag successfully unbound',
          clearLookup: true,
        );
        return true;
      }

      state = state.copyWith(isLoading: false, error: 'Unbind failed');
      return false;
    } catch (e) {
      debugPrint('[AdminNFC] Unbind error: $e');
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }
}
