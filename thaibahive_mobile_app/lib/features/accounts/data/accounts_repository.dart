import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/financial_transaction_model.dart';

final accountsRepositoryProvider = Provider<AccountsRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return AccountsRepository(apiClient);
});

class AccountsRepository {
  final ApiClient _apiClient;

  AccountsRepository(this._apiClient);

  Future<List<FinancialTransactionModel>> getTransactions({int page = 1}) async {
    final response = await _apiClient.get('/accounts/transactions',
        queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) =>
              FinancialTransactionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) =>
              FinancialTransactionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<FinancialTransactionModel> createTransaction(
      Map<String, dynamic> data) async {
    final response =
        await _apiClient.post('/accounts/transactions', data: data);
    return FinancialTransactionModel.fromJson(
        response as Map<String, dynamic>);
  }
}
