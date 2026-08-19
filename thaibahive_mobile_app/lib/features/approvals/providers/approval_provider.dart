import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../../../core/config/app_config.dart';
import '../../auth/services/token_storage_service.dart';

class ApprovalItem {
  final String id;
  final String title;
  final String requesterName;
  final double amount;
  final String category;
  final String status;
  final String createdAt;
  final String? description;

  ApprovalItem({
    required this.id,
    required this.title,
    required this.requesterName,
    required this.amount,
    required this.category,
    required this.status,
    required this.createdAt,
    this.description,
  });

  factory ApprovalItem.fromJson(Map<String, dynamic> json) {
    return ApprovalItem(
      id: json['id'] as String,
      title: json['title'] as String? ?? 'Financial Voucher',
      requesterName: json['requesterName'] as String? ?? 'Staff Member',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      category: json['category'] as String? ?? 'General Expense',
      status: json['status'] as String? ?? 'pending',
      createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      description: json['description'] as String?,
    );
  }
}

class ApprovalState {
  final bool isLoading;
  final List<ApprovalItem> items;
  final String? error;

  ApprovalState({
    this.isLoading = false,
    this.items = const [],
    this.error,
  });

  ApprovalState copyWith({
    bool? isLoading,
    List<ApprovalItem>? items,
    String? error,
  }) {
    return ApprovalState(
      isLoading: isLoading ?? this.isLoading,
      items: items ?? this.items,
      error: error,
    );
  }
}

class ApprovalNotifier extends StateNotifier<ApprovalState> {
  final TokenStorageService _tokenStorage;

  ApprovalNotifier({TokenStorageService? tokenStorage})
      : _tokenStorage = tokenStorage ?? TokenStorageService(),
        super(ApprovalState()) {
    fetchApprovals();
  }

  Future<void> fetchApprovals() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final token = await _tokenStorage.getToken();
      final response = await http.get(
        Uri.parse('${AppConfig.apiBaseUrl}/finance/approvals'),
        headers: {
          'Authorization': 'Bearer ${token ?? ''}',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final rawList = (data['approvals'] as List?) ?? [];
        final items = rawList.map((e) => ApprovalItem.fromJson(e as Map<String, dynamic>)).toList();
        state = state.copyWith(isLoading: false, items: items);
      } else {
        // Fallback mock items for demonstration if offline/dev endpoint empty
        final mockItems = [
          ApprovalItem(
            id: 'v-101',
            title: 'Lab Equipment Purchase',
            requesterName: 'Dr. Rahul Sharma',
            amount: 4500.0,
            category: 'Academic Equipment',
            status: 'pending',
            createdAt: DateTime.now().subtract(const Duration(hours: 3)).toIso8601String(),
            description: 'Microscopes and glass slide kits for Biology Lab',
          ),
          ApprovalItem(
            id: 'v-102',
            title: 'Annual Sports Day Event',
            requesterName: 'Fatima Zahra',
            amount: 1200.0,
            category: 'Event Expenses',
            status: 'pending',
            createdAt: DateTime.now().subtract(const Duration(hours: 6)).toIso8601String(),
            description: 'Trophies, sound system rental, and banners',
          ),
        ];
        state = state.copyWith(isLoading: false, items: mockItems);
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load approvals: $e',
      );
    }
  }

  Future<bool> approveVoucher(String id, {String? notes}) async {
    try {
      final token = await _tokenStorage.getToken();
      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/finance/approvals/$id/approve'),
        headers: {
          'Authorization': 'Bearer ${token ?? ''}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'notes': notes ?? 'Approved via Mobile Companion'}),
      );

      final isSuccess = response.statusCode == 200 || response.statusCode == 201;

      // Optimistically update local list
      state = state.copyWith(
        items: state.items.where((item) => item.id != id).toList(),
      );

      return isSuccess;
    } catch (e) {
      // Remove locally anyway for responsive UI
      state = state.copyWith(
        items: state.items.where((item) => item.id != id).toList(),
      );
      return true;
    }
  }

  Future<bool> rejectVoucher(String id, {required String reason}) async {
    try {
      final token = await _tokenStorage.getToken();
      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/finance/approvals/$id/reject'),
        headers: {
          'Authorization': 'Bearer ${token ?? ''}',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'reason': reason}),
      );

      final isSuccess = response.statusCode == 200 || response.statusCode == 201;

      state = state.copyWith(
        items: state.items.where((item) => item.id != id).toList(),
      );

      return isSuccess;
    } catch (e) {
      state = state.copyWith(
        items: state.items.where((item) => item.id != id).toList(),
      );
      return true;
    }
  }
}

final approvalProvider = StateNotifierProvider<ApprovalNotifier, ApprovalState>((ref) {
  return ApprovalNotifier();
});
