import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/purchase_request_model.dart';

final purchasesRepositoryProvider = Provider<PurchasesRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return PurchasesRepository(apiClient);
});

class PurchasesRepository {
  final ApiClient _apiClient;

  PurchasesRepository(this._apiClient);

  Future<List<PurchaseRequestModel>> getPurchases(
      {String? status, int page = 1}) async {
    final params = <String, dynamic>{'page': page};
    if (status != null) params['status'] = status;
    final response =
        await _apiClient.get('/purchases', queryParameters: params);
    final data = response;
    if (data is List) {
      return data
          .map((e) => PurchaseRequestModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => PurchaseRequestModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<PurchaseRequestModel> createPurchase(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/purchases', data: data);
    return PurchaseRequestModel.fromJson(
        response as Map<String, dynamic>);
  }

  Future<PurchaseRequestModel> updatePurchase(
      String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/purchases/$id', data: data);
    return PurchaseRequestModel.fromJson(
        response as Map<String, dynamic>);
  }
}
