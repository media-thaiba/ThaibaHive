import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/expense_claim_model.dart';

import 'expenses_repository.dart';

class ExpensesState {
  final List<ExpenseClaimModel> claims;
  final bool isLoading;
  final String? error;
  final String? statusFilter;

  const ExpensesState({
    this.claims = const [],
    this.isLoading = false,
    this.error,
    this.statusFilter,
  });

  ExpensesState copyWith({
    List<ExpenseClaimModel>? claims,
    bool? isLoading,
    String? error,
    String? statusFilter,
  }) =>
      ExpensesState(
        claims: claims ?? this.claims,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        statusFilter: statusFilter ?? this.statusFilter,
      );
}

class ExpensesNotifier extends StateNotifier<ExpensesState> {
  final ExpensesRepository _repository;

  ExpensesNotifier(this._repository) : super(const ExpensesState());

  Future<void> loadClaims() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final claims = await _repository.getClaims(status: state.statusFilter);
      state = state.copyWith(claims: claims, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createClaim(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createClaim(data);
      await loadClaims();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateClaim(String id, Map<String, dynamic> data) async {
    try {
      await _repository.updateClaim(id, data);
      await loadClaims();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> deleteClaim(String id) async {
    try {
      await _repository.deleteClaim(id);
      await loadClaims();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void setStatusFilter(String? status) {
    state = state.copyWith(statusFilter: status);
  }
}

final expensesProvider =
    StateNotifierProvider<ExpensesNotifier, ExpensesState>((ref) {
  final repo = ref.read(expensesRepositoryProvider);
  return ExpensesNotifier(repo);
});
