import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/purchase_request_model.dart';

import 'purchases_repository.dart';

class PurchasesState {
  final List<PurchaseRequestModel> purchases;
  final bool isLoading;
  final String? error;
  final String? statusFilter;

  const PurchasesState({
    this.purchases = const [],
    this.isLoading = false,
    this.error,
    this.statusFilter,
  });

  PurchasesState copyWith({
    List<PurchaseRequestModel>? purchases,
    bool? isLoading,
    String? error,
    String? statusFilter,
  }) =>
      PurchasesState(
        purchases: purchases ?? this.purchases,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        statusFilter: statusFilter ?? this.statusFilter,
      );
}

class PurchasesNotifier extends StateNotifier<PurchasesState> {
  final PurchasesRepository _repository;

  PurchasesNotifier(this._repository) : super(const PurchasesState());

  Future<void> loadPurchases() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final purchases =
          await _repository.getPurchases(status: state.statusFilter);
      state = state.copyWith(purchases: purchases, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createPurchase(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createPurchase(data);
      await loadPurchases();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updatePurchase(String id, Map<String, dynamic> data) async {
    try {
      await _repository.updatePurchase(id, data);
      await loadPurchases();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  void setStatusFilter(String? status) {
    state = state.copyWith(statusFilter: status);
  }
}

final purchasesProvider =
    StateNotifierProvider<PurchasesNotifier, PurchasesState>((ref) {
  final repo = ref.read(purchasesRepositoryProvider);
  return PurchasesNotifier(repo);
});
