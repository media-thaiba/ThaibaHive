import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/expense_claim_model.dart';

final expensesRepositoryProvider = Provider<ExpensesRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return ExpensesRepository(apiClient);
});

class ExpensesRepository {
  final ApiClient _apiClient;

  ExpensesRepository(this._apiClient);

  Future<List<ExpenseClaimModel>> getClaims({String? status, int page = 1}) async {
    final params = <String, dynamic>{'page': page};
    if (status != null) params['status'] = status;
    final response = await _apiClient.get('/expense-claims', queryParameters: params);
    final data = response;
    if (data is List) {
      return data
          .map((e) => ExpenseClaimModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => ExpenseClaimModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<ExpenseClaimModel> createClaim(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/expense-claims', data: data);
    return ExpenseClaimModel.fromJson(response as Map<String, dynamic>);
  }

  Future<ExpenseClaimModel> updateClaim(
      String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/expense-claims/$id', data: data);
    return ExpenseClaimModel.fromJson(response as Map<String, dynamic>);
  }

  Future<void> deleteClaim(String id) async {
    await _apiClient.delete('/expense-claims/$id');
  }
}
