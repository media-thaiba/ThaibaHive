import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/accounts_provider.dart';

class AccountsScreen extends ConsumerStatefulWidget {
  const AccountsScreen({super.key});

  @override
  ConsumerState<AccountsScreen> createState() => _AccountsScreenState();
}

class _AccountsScreenState extends ConsumerState<AccountsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(accountsProvider.notifier).loadTransactions());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(accountsProvider);
    final notifier = ref.read(accountsProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Accounts',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
      body: state.isLoading
          ? const ListShimmer()
          : state.error != null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.loadTransactions(),
                )
              : state.transactions.isEmpty
                  ? const EmptyStateWidget(
                      message: 'No transactions',
                      icon: Icons.account_balance_wallet_rounded)
                  : RefreshIndicator(
                      onRefresh: () => notifier.loadTransactions(),
                      child: ListView.builder(
                        itemCount: state.transactions.length + 1,
                        itemBuilder: (_, i) {
                          if (i == 0) {
                            final income = state.transactions
                                .where((t) => t.type == 'income')
                                .fold<double>(
                                    0, (s, t) => s + t.amount);
                            final expense = state.transactions
                                .where((t) => t.type == 'expense')
                                .fold<double>(
                                    0, (s, t) => s + t.amount);
                            return Card(
                              margin: const EdgeInsets.all(16),
                              child: Padding(
                                padding: const EdgeInsets.all(20),
                                child: Column(
                                  children: [
                                    Text('Balance',
                                        style: theme.textTheme
                                            .titleMedium),
                                    const SizedBox(height: 8),
                                    Text(
                                        '\$${(income - expense).toStringAsFixed(2)}',
                                        style: theme
                                            .textTheme.headlineMedium
                                            ?.copyWith(
                                                fontWeight:
                                                    FontWeight.w700,
                                                color: income -
                                                            expense >=
                                                        0
                                                    ? Colors.green
                                                    : Colors.red)),
                                    const SizedBox(height: 16),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment
                                              .spaceAround,
                                      children: [
                                        _summaryItem(
                                            'Income',
                                            '\$${income.toStringAsFixed(2)}',
                                            Colors.green,
                                            theme),
                                        _summaryItem(
                                            'Expense',
                                            '\$${expense.toStringAsFixed(2)}',
                                            Colors.red,
                                            theme),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }
                          final t =
                              state.transactions[i - 1];
                          final isIncome =
                              t.type == 'income';
                          return Card(
                            margin: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 4),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: (isIncome
                                        ? Colors.green
                                        : Colors.red)
                                    .withValues(alpha: 0.2),
                                child: Icon(
                                  isIncome
                                      ? Icons.arrow_upward_rounded
                                      : Icons.arrow_downward_rounded,
                                  color: isIncome
                                      ? Colors.green
                                      : Colors.red,
                                ),
                              ),
                              title: Text(t.category,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600)),
                              subtitle: Column(
                                crossAxisAlignment:
                                    CrossAxisAlignment.start,
                                children: [
                                  if (t.description != null)
                                    Text(t.description!,
                                        maxLines: 1,
                                        overflow:
                                            TextOverflow.ellipsis),
                                  Text(
                                      DateFormat('dd MMM yyyy')
                                          .format(t.transactionDate)),
                                ],
                              ),
                              trailing: Text(
                                '${isIncome ? '+' : '-'}\$${t.amount.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  color: isIncome
                                      ? Colors.green
                                      : Colors.red,
                                  fontSize: 16,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
    );
  }

  Widget _summaryItem(
      String label, String value, Color color, ThemeData theme) {
    return Column(
      children: [
        Text(label,
            style: TextStyle(color: Colors.grey[600], fontSize: 13)),
        const SizedBox(height: 4),
        Text(value,
            style: TextStyle(
                fontWeight: FontWeight.w600,
                color: color,
                fontSize: 18)),
      ],
    );
  }

  void _showCreateDialog(BuildContext context) {
    final descCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    final refCtrl = TextEditingController();
    String type = 'expense';
    String category = 'supplies';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(ctx).viewInsets.bottom,
          left: 16,
          right: 16,
          top: 16,
        ),
        child: SizedBox(
          height: MediaQuery.of(ctx).size.height * 0.6,
          child: ListView(
            children: [
              Text('New Transaction',
                  style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: type,
                decoration:
                    const InputDecoration(labelText: 'Type'),
                items: ['income', 'expense']
                    .map((t) => DropdownMenuItem(
                        value: t,
                        child: Text(t[0].toUpperCase() +
                            t.substring(1))))
                    .toList(),
                onChanged: (v) => type = v!,
              ),
              TextField(
                  controller: amountCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                      labelText: 'Amount',
                      prefixText: '\$ ')),
              DropdownButtonFormField<String>(
                value: category,
                decoration:
                    const InputDecoration(labelText: 'Category'),
                items: ['supplies', 'utilities', 'salary', 'revenue',
                        'rent', 'maintenance', 'other']
                    .map((c) => DropdownMenuItem(
                        value: c,
                        child: Text(c[0].toUpperCase() +
                            c.substring(1))))
                    .toList(),
                onChanged: (v) => category = v!,
              ),
              TextField(
                  controller: descCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Description (optional)')),
              TextField(
                  controller: refCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Reference (optional)')),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  final amount = double.tryParse(amountCtrl.text);
                  if (amount == null || amount <= 0) return;
                  await ref
                      .read(accountsProvider.notifier)
                      .createTransaction({
                        'type': type,
                        'category': category,
                        'amount': amount,
                        'description': descCtrl.text,
                        'reference_number': refCtrl.text,
                        'transaction_date':
                            DateTime.now().toIso8601String(),
                      });
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: const Text('Add Transaction'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
