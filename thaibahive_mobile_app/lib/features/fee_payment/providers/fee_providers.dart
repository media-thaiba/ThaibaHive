import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/fee_models.dart';

class FeeState {
  final bool isLoading;
  final String? errorMessage;
  final MobileFeeAllocation? allocation;
  final List<MobileFeeReceipt> receipts;

  const FeeState({
    this.isLoading = false,
    this.errorMessage,
    this.allocation,
    this.receipts = const [],
  });

  FeeState copyWith({
    bool? isLoading,
    String? errorMessage,
    MobileFeeAllocation? allocation,
    List<MobileFeeReceipt>? receipts,
  }) {
    return FeeState(
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      allocation: allocation ?? this.allocation,
      receipts: receipts ?? this.receipts,
    );
  }
}

class FeeNotifier extends StateNotifier<FeeState> {
  FeeNotifier() : super(const FeeState(isLoading: true)) {
    loadFeeDashboard();
  }

  Future<void> loadFeeDashboard() async {
    state = state.copyWith(isLoading: true, errorMessage: null);

    try {
      // Simulate remote fetch with fallback robust defaults
      await Future.delayed(const Duration(milliseconds: 200));

      final sampleAllocation = MobileFeeAllocation(
        id: 'alloc_mobile_demo',
        studentId: 'TG-STD-2026-042',
        academicYear: '2026-2027',
        baseAmount: 120000,
        concessionAmount: 20000,
        netPayableAmount: 100000,
        paidAmount: 50000,
        balanceAmount: 50000,
        status: 'partial',
        installments: const [
          MobileFeeInstallment(
            id: 'inst_1',
            installmentNumber: 1,
            title: 'Term 1 Fee',
            dueDate: '2026-08-15',
            gracePeriodDays: 7,
            amount: 50000,
            paidAmount: 50000,
            balanceAmount: 0,
            status: 'paid',
          ),
          MobileFeeInstallment(
            id: 'inst_2',
            installmentNumber: 2,
            title: 'Term 2 Fee',
            dueDate: '2027-01-15',
            gracePeriodDays: 7,
            amount: 50000,
            paidAmount: 0,
            balanceAmount: 50000,
            status: 'pending',
          ),
        ],
      );

      final sampleReceipts = [
        const MobileFeeReceipt(
          receiptNumber: 'RCPT-2026-0842',
          paymentId: 'pay_998877',
          studentId: 'TG-STD-2026-042',
          amount: 50000,
          paymentMethod: 'upi',
          receiptHash: 'c6d9a1f2b3e4...sha256',
          issuedAt: '2026-08-10',
        ),
      ];

      state = state.copyWith(
        isLoading: false,
        allocation: sampleAllocation,
        receipts: sampleReceipts,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to load fee dashboard: $e',
      );
    }
  }

  Future<bool> executeUpiPayment(double amount, String? installmentId) async {
    state = state.copyWith(isLoading: true);
    await Future.delayed(const Duration(milliseconds: 400));
    state = state.copyWith(isLoading: false);
    return true;
  }
}

final feeProvider = StateNotifierProvider<FeeNotifier, FeeState>((ref) {
  return FeeNotifier();
});
