import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../../core/config/app_config.dart';
import '../../auth/services/token_storage_service.dart';
import '../models/smart_campus_models.dart';

class SmartCampusState {
  final SmartCampusSummary? summary;
  final List<MobileSharedResource> resources;
  final bool isLoading;
  final String? error;

  SmartCampusState({
    this.summary,
    this.resources = const [],
    this.isLoading = false,
    this.error,
  });

  SmartCampusState copyWith({
    SmartCampusSummary? summary,
    List<MobileSharedResource>? resources,
    bool? isLoading,
    String? error,
  }) {
    return SmartCampusState(
      summary: summary ?? this.summary,
      resources: resources ?? this.resources,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class SmartCampusNotifier extends StateNotifier<SmartCampusState> {
  final TokenStorageService _tokenStorage;

  SmartCampusNotifier({TokenStorageService? tokenStorage})
      : _tokenStorage = tokenStorage ?? TokenStorageService(),
        super(SmartCampusState()) {
    fetchOperationsSummary();
  }

  Future<void> fetchOperationsSummary() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final token = await _tokenStorage.getToken();
      final headers = {
        'Content-Type': 'application/json',
        if (token != null) 'Authorization': 'Bearer $token',
      };

      // Mock fallback or backend API call
      final summary = SmartCampusSummary(
        energySavedKwh: 345.5,
        activeDispatches: 3,
        biometricPunches: 142,
        cloudCostSavingsDollars: 650.0,
        renewableEnergyRatioPercent: 48.0,
      );

      final resources = [
        MobileSharedResource(
          resourceId: 'res_vr_sim',
          campusId: 'campus_main',
          name: 'VR Surgical Simulation Center',
          category: 'SPECIALIZED_EQUIPMENT',
          capacityUnits: 20,
          hourlyCostRateDollars: 60.0,
        ),
        MobileSharedResource(
          resourceId: 'res_hpc_node',
          campusId: 'campus_north',
          name: 'High Performance GPU Research Cluster',
          category: 'COMPUTE_CLUSTER',
          capacityUnits: 64,
          hourlyCostRateDollars: 45.0,
        ),
      ];

      state = state.copyWith(
        summary: summary,
        resources: resources,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }
}

final smartCampusProvider =
    StateNotifierProvider<SmartCampusNotifier, SmartCampusState>((ref) {
  return SmartCampusNotifier();
});
