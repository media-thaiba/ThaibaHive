import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/services/offline_cache_service.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/models/expense_claim_model.dart';

class CachedExpensesState {
  final List<ExpenseClaimModel> claims;
  final bool isOffline;
  final String? error;
  final String? statusFilter;

  const CachedExpensesState({
    this.claims = const [],
    this.isOffline = false,
    this.error,
    this.statusFilter,
  });

  CachedExpensesState copyWith({
    List<ExpenseClaimModel>? claims,
    bool? isOffline,
    String? error,
    String? statusFilter,
  }) => CachedExpensesState(
    claims: claims ?? this.claims,
    isOffline: isOffline ?? this.isOffline,
    error: error,
    statusFilter: statusFilter ?? this.statusFilter,
  );
}

class ExpensesCacheNotifier extends StateNotifier<AsyncValue<CachedExpensesState>> {
  static const String cacheKey = 'expenses_cache';
  final ApiClient _apiClient = ApiClient();
  bool _isCreating = false;

  ExpensesCacheNotifier() : super(const AsyncValue.loading()) {
    fetchExpenses();
  }

  Future<void> fetchExpenses({String? status}) async {
    // 1. Instant return from local Hive cache if available (Stale-While-Revalidate)
    final cachedData = await offlineCacheService.getCache(cacheKey, maxAge: const Duration(hours: 6));
    if (cachedData != null && cachedData is List) {
      final claims = (cachedData as List)
          .map((e) => ExpenseClaimModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(CachedExpensesState(
        claims: claims,
        isOffline: false,
        statusFilter: status,
      ));
    }

    // 2. Fetch fresh network data in background
    try {
      final params = <String, dynamic>{};
      if (status != null && status.isNotEmpty) params['status'] = status;
      
      final response = await _apiClient.dio.get('/expense-claims', queryParameters: params);
      if (response.statusCode == 200) {
        final data = response.data;
        final List<dynamic> freshList = data is List ? data : (data['data'] as List? ?? data['claims'] as List? ?? []);
        final claims = freshList
            .map((e) => ExpenseClaimModel.fromJson(e as Map<String, dynamic>))
            .toList();
        await offlineCacheService.saveCache(cacheKey, freshList);

        state = AsyncValue.data(CachedExpensesState(
          claims: claims,
          isOffline: false,
          statusFilter: status,
        ));
      }
    } catch (e) {
      // 3. Network failed: Fallback to Hive cache if present
      final fallbackData = await offlineCacheService.getCache(cacheKey);
      if (fallbackData != null && fallbackData is List) {
        final claims = (fallbackData as List)
            .map((e) => ExpenseClaimModel.fromJson(e as Map<String, dynamic>))
            .toList();
        state = AsyncValue.data(CachedExpensesState(
          claims: claims,
          isOffline: true,
          statusFilter: status,
        ));
      } else {
        state = AsyncValue.error(e, StackTrace.current);
      }
    }
  }

  Future<void> createExpense(Map<String, dynamic> data, {required BuildContext context}) async {
    if (_isCreating) return;
    _isCreating = true;

    try {
      // Try network first
      final response = await _apiClient.dio.post('/expense-claims', data: data);
      if (response.statusCode == 200 || response.statusCode == 201) {
        final newClaim = ExpenseClaimModel.fromJson(response.data as Map<String, dynamic>);
        
        // Optimistic update: add to cache immediately
        final currentState = state;
        if (currentState.hasValue) {
          final updatedClaims = [newClaim, ...currentState.value!.claims];
          await offlineCacheService.saveCache(cacheKey, updatedClaims.map((e) => e.toJson()).toList());
          
          state = AsyncValue.data(currentState.value!.copyWith(
            claims: updatedClaims,
            isOffline: false,
          ));
        }
        
        await fetchExpenses(status: state.valueOrNull?.statusFilter);
        
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Expense claim submitted successfully')),
          );
        }
      } else {
        throw Exception('Failed to create expense claim');
      }
    } catch (e) {
      // Network failed - queue for offline sync
      await offlineQueue.enqueue(
        type: 'expense_create',
        payload: data,
      );
      
      // Optimistic update: add to local cache
      final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
      final optimisticClaim = ExpenseClaimModel(
        id: tempId,
        title: data['title'] as String,
        category: data['category'] as String,
        amount: (data['amount'] as num).toDouble(),
        description: data['description'] as String?,
        status: 'pending',
        receiptUrl: data['receiptUrl'] as String?,
        userId: '', // Will be filled by server
        userName: null,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );
      
      final currentState = state;
      if (currentState.hasValue) {
        final updatedClaims = [optimisticClaim, ...currentState.value!.claims];
        await offlineCacheService.saveCache(cacheKey, updatedClaims.map((e) => e.toJson()).toList());
        
        state = AsyncValue.data(currentState.value!.copyWith(
          claims: updatedClaims,
          isOffline: true,
        ));
      }
      
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Saved offline — queued for sync'),
            behavior: SnackBarBehavior.floating,
            duration: Duration(seconds: 3),
          ),
        );
      }
    } finally {
      _isCreating = false;
    }
  }
}

final cachedExpensesProvider =
    StateNotifierProvider<ExpensesCacheNotifier, AsyncValue<CachedExpensesState>>((ref) {
  return ExpensesCacheNotifier();
});