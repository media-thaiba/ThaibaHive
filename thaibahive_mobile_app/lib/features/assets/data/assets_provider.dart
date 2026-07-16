import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/asset_model.dart';

import 'assets_repository.dart';

class AssetsState {
  final List<AssetModel> assets;
  final AssetModel? selectedAsset;
  final List<AssetServiceRecord> serviceHistory;
  final bool isLoading;
  final String? error;
  final String? typeFilter;
  final String? statusFilter;

  const AssetsState({
    this.assets = const [],
    this.selectedAsset,
    this.serviceHistory = const [],
    this.isLoading = false,
    this.error,
    this.typeFilter,
    this.statusFilter,
  });

  AssetsState copyWith({
    List<AssetModel>? assets,
    AssetModel? selectedAsset,
    List<AssetServiceRecord>? serviceHistory,
    bool? isLoading,
    String? error,
    String? typeFilter,
    String? statusFilter,
  }) =>
      AssetsState(
        assets: assets ?? this.assets,
        selectedAsset: selectedAsset ?? this.selectedAsset,
        serviceHistory: serviceHistory ?? this.serviceHistory,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        typeFilter: typeFilter ?? this.typeFilter,
        statusFilter: statusFilter ?? this.statusFilter,
      );
}

class AssetsNotifier extends StateNotifier<AssetsState> {
  final AssetsRepository _repository;

  AssetsNotifier(this._repository) : super(const AssetsState());

  Future<void> loadAssets() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final assets = await _repository.getAssets();
      state = state.copyWith(assets: assets, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadAssetDetail(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final assets = await _repository.getAssets();
      final asset = assets.firstWhere((a) => a.id == id);
      final history = await _repository.getServiceHistory(id);
      state = state.copyWith(
        selectedAsset: asset,
        serviceHistory: history,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createAsset(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createAsset(data);
      await loadAssets();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateAsset(String id, Map<String, dynamic> data) async {
    try {
      final updated = await _repository.updateAsset(id, data);
      state = state.copyWith(selectedAsset: updated);
      await loadAssets();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  void setTypeFilter(String? type) {
    state = state.copyWith(typeFilter: type);
  }

  void setStatusFilter(String? status) {
    state = state.copyWith(statusFilter: status);
  }

  List<AssetModel> get filteredAssets {
    var result = state.assets;
    if (state.typeFilter != null) {
      result = result.where((a) => a.type == state.typeFilter).toList();
    }
    if (state.statusFilter != null) {
      result = result.where((a) => a.status == state.statusFilter).toList();
    }
    return result;
  }
}

final assetsProvider = StateNotifierProvider<AssetsNotifier, AssetsState>((ref) {
  final repo = ref.read(assetsRepositoryProvider);
  return AssetsNotifier(repo);
});
