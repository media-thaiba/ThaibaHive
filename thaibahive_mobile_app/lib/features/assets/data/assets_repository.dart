import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/asset_model.dart';

final assetsRepositoryProvider = Provider<AssetsRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return AssetsRepository(apiClient);
});

class AssetsRepository {
  final ApiClient _apiClient;

  AssetsRepository(this._apiClient);

  Future<List<AssetModel>> getAssets({int page = 1}) async {
    final response =
        await _apiClient.get('/assets', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => AssetModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => AssetModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<AssetModel> createAsset(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/assets', data: data);
    return AssetModel.fromJson(response as Map<String, dynamic>);
  }

  Future<AssetModel> updateAsset(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/assets/$id', data: data);
    return AssetModel.fromJson(response as Map<String, dynamic>);
  }

  Future<List<AssetServiceRecord>> getServiceHistory(String assetId) async {
    final response =
        await _apiClient.get('/assets/$assetId/service-history');
    final data = response;
    if (data is List) {
      return data
          .map((e) => AssetServiceRecord.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => AssetServiceRecord.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<void> addServiceRecord(String assetId, Map<String, dynamic> data) async {
    await _apiClient.post('/assets/$assetId/service-history', data: data);
  }
}
