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
  final List<Map<String, dynamic>> locations;
  final String? error;
  final String? successMessage;

  const AdminNfcState({
    this.isScanning = false,
    this.isLoading = false,
    this.lookupResult,
    this.locations = const [],
    this.error,
    this.successMessage,
  });

  AdminNfcState copyWith({
    bool? isScanning,
    bool? isLoading,
    Map<String, dynamic>? lookupResult,
    List<Map<String, dynamic>>? locations,
    String? error,
    String? successMessage,
    bool clearLookup = false,
  }) {
    return AdminNfcState(
      isScanning: isScanning ?? this.isScanning,
      isLoading: isLoading ?? this.isLoading,
      lookupResult: clearLookup ? null : (lookupResult ?? this.lookupResult),
      locations: locations ?? this.locations,
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
        if (type == 'location') {
          await fetchLocations();
        }
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

  Future<List<Map<String, dynamic>>> fetchLocations() async {
    try {
      final response = await _apiClient.get('/admin/attendance-locations');
      if (response is Map && response['locations'] is List) {
        final list = (response['locations'] as List).cast<Map<String, dynamic>>();
        state = state.copyWith(locations: list);
        return list;
      }
    } catch (e) {
      debugPrint('[AdminNFC] fetchLocations error: $e');
    }
    return [];
  }

  Future<bool> createLocationTag({
    required String name,
    required String nfcTagId,
    double? latitude,
    double? longitude,
    double? radius,
    String? institutionId,
  }) async {
    state = state.copyWith(isLoading: true, error: null, successMessage: null);
    try {
      final body = {
        'name': name,
        'nfcTagId': nfcTagId,
        if (latitude != null) 'latitude': latitude,
        if (longitude != null) 'longitude': longitude,
        if (radius != null) 'radius': radius,
        if (institutionId != null) 'institutionId': institutionId,
      };
      final response = await _apiClient.post('/admin/attendance-locations', data: body);
      if (response != null && (response['location'] != null || response['id'] != null)) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Location Checkpoint "$name" registered successfully!',
          clearLookup: true,
        );
        await fetchLocations();
        return true;
      }
      state = state.copyWith(isLoading: false, error: 'Registration failed');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }

  Future<bool> updateLocationTag({
    required String locationId,
    String? name,
    String? nfcTagId,
    double? latitude,
    double? longitude,
    double? radius,
  }) async {
    state = state.copyWith(isLoading: true, error: null, successMessage: null);
    try {
      final body = <String, dynamic>{};
      if (name != null) body['name'] = name;
      if (nfcTagId != null) body['nfcTagId'] = nfcTagId;
      if (latitude != null) body['latitude'] = latitude;
      if (longitude != null) body['longitude'] = longitude;
      if (radius != null) body['radius'] = radius;

      final response = await _apiClient.patch('/admin/attendance-locations/$locationId', data: body);
      if (response != null) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Geofence location updated successfully!',
        );
        await fetchLocations();
        return true;
      }
      state = state.copyWith(isLoading: false, error: 'Update failed');
      return false;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      return false;
    }
  }
}
