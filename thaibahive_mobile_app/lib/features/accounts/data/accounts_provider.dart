import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/financial_transaction_model.dart';

import 'accounts_repository.dart';

class AccountsState {
  final List<FinancialTransactionModel> transactions;
  final bool isLoading;
  final String? error;

  const AccountsState({
    this.transactions = const [],
    this.isLoading = false,
    this.error,
  });

  AccountsState copyWith({
    List<FinancialTransactionModel>? transactions,
    bool? isLoading,
    String? error,
  }) =>
      AccountsState(
        transactions: transactions ?? this.transactions,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AccountsNotifier extends StateNotifier<AccountsState> {
  final AccountsRepository _repository;

  AccountsNotifier(this._repository) : super(const AccountsState());

  Future<void> loadTransactions() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final transactions = await _repository.getTransactions();
      state = state.copyWith(transactions: transactions, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createTransaction(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createTransaction(data);
      await loadTransactions();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }
}

final accountsProvider =
    StateNotifierProvider<AccountsNotifier, AccountsState>((ref) {
  final repo = ref.read(accountsRepositoryProvider);
  return AccountsNotifier(repo);
});
