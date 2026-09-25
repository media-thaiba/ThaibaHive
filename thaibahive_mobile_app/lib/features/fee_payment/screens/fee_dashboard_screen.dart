import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/fee_providers.dart';
import '../widgets/fee_installment_card.dart';

class FeeDashboardScreen extends ConsumerWidget {
  const FeeDashboardScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(feeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student Fee & Payments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(feeProvider.notifier).loadFeeDashboard(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: () => ref.read(feeProvider.notifier).loadFeeDashboard(),
              child: ListView(
                children: [
                  if (state.allocation != null) ...[
                    Container(
                      margin: const EdgeInsets.all(16),
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Colors.blue.shade900, Colors.blue.shade700],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Outstanding Balance Due',
                            style: TextStyle(color: Colors.white70, fontSize: 13),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '₹${state.allocation!.balanceAmount.toStringAsFixed(0)}',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Billed: ₹${state.allocation!.baseAmount.toStringAsFixed(0)}',
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                              Text(
                                'Scholarship: ₹${state.allocation!.concessionAmount.toStringAsFixed(0)}',
                                style: const TextStyle(color: Colors.greenAccent, fontSize: 12),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Text(
                        'Installment Schedule',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    ...state.allocation!.installments.map((inst) => FeeInstallmentCard(
                          installment: inst,
                          onPayTap: () {
                            context.push(
                              '/fees/checkout',
                              extra: {
                                'installmentId': inst.id,
                                'amount': inst.balanceAmount,
                                'title': inst.title,
                              },
                            );
                          },
                        )),
                    const SizedBox(height: 16),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: Text(
                        'Payment Receipts',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ),
                    ...state.receipts.map(
                      (rcpt) => ListTile(
                        leading: const Icon(Icons.receipt_long, color: Colors.blue),
                        title: Text(rcpt.receiptNumber, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Paid via ${rcpt.paymentMethod.toUpperCase()} on ${rcpt.issuedAt}'),
                        trailing: Text(
                          '₹${rcpt.amount.toStringAsFixed(0)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green),
                        ),
                        onTap: () {
                          context.push('/fees/receipt', extra: rcpt);
                        },
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
