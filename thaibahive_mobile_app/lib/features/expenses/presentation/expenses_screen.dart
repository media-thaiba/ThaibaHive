import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../core/services/file_upload_service.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/failed_sync_banner.dart';
import '../../../shared/widgets/file_picker_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/offline_banner.dart';
import '../data/expenses_cache_provider.dart';

class ExpensesScreen extends ConsumerStatefulWidget {
  const ExpensesScreen({super.key});

  @override
  ConsumerState<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends ConsumerState<ExpensesScreen> {
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(cachedExpensesProvider.notifier).fetchExpenses());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(cachedExpensesProvider);
    final notifier = ref.read(cachedExpensesProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Expense Claims',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
      body: Column(
        children: [
          const OfflineBanner(),
          const FailedSyncBanner(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            child: DropdownButtonFormField<String?>(
              value: _statusFilter,
              decoration: const InputDecoration(
                  labelText: 'Status', isDense: true),
              items: [
                const DropdownMenuItem(value: null, child: Text('All')),
                const DropdownMenuItem(value: 'pending', child: Text('Pending')),
                const DropdownMenuItem(
                    value: 'approved', child: Text('Approved')),
                const DropdownMenuItem(
                    value: 'rejected', child: Text('Rejected')),
                const DropdownMenuItem(
                    value: 'paid', child: Text('Paid')),
              ],
              onChanged: (v) {
                setState(() => _statusFilter = v);
                notifier.fetchExpenses(status: v);
              },
            ),
          ),
          Expanded(
            child: state.when(
              data: (data) {
                final claims = data.claims;
                final isOffline = data.isOffline;
                return RefreshIndicator(
                  onRefresh: () => notifier.fetchExpenses(status: _statusFilter),
                  child: claims.isEmpty
                      ? const EmptyStateWidget(
                          message: 'No expense claims',
                          icon: Icons.receipt_long_rounded)
                      : ListView.builder(
                          itemCount: claims.length,
                          itemBuilder: (_, i) {
                            final c = claims[i];
                            return Card(
                              margin: const EdgeInsets.symmetric(
                                  horizontal: 16, vertical: 4),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: _statusColor(c.status,
                                          theme)
                                      .withValues(alpha: 0.2),
                                  child: Icon(Icons.receipt_rounded,
                                      color:
                                          _statusColor(c.status, theme),
                                      size: 22),
                                ),
                                title: Text(c.title,
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w600)),
                                subtitle: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.start,
                                  children: [
                                    Text(c.category),
                                    Text(
                                        DateFormat('dd MMM yyyy')
                                            .format(c.createdAt)),
                                  ],
                                ),
                                trailing: Column(
                                  mainAxisAlignment:
                                      MainAxisAlignment.center,
                                  crossAxisAlignment:
                                      CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                        '\$${c.amount.toStringAsFixed(2)}',
                                        style:
                                            theme.textTheme.titleMedium
                                                ?.copyWith(
                                                    fontWeight:
                                                        FontWeight.w600,
                                                    color: theme
                                                        .colorScheme
                                                        .primary)),
                                    Container(
                                      padding:
                                          const EdgeInsets.symmetric(
                                              horizontal: 6,
                                              vertical: 2),
                                      decoration: BoxDecoration(
                                        color: _statusColor(
                                                c.status, theme)
                                            .withValues(alpha: 0.15),
                                        borderRadius:
                                            BorderRadius.circular(6),
                                      ),
                                      child: Text(c.status,
                                          style: TextStyle(
                                            color: _statusColor(
                                                c.status, theme),
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                          )),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                );
              },
              loading: () => const ListShimmer(),
              error: (e, _) => AppErrorWidget(
                message: e.toString(),
                onRetry: () => notifier.fetchExpenses(status: _statusFilter),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _statusColor(String status, ThemeData theme) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'paid':
        return Colors.blue;
      default:
        return theme.colorScheme.primary;
    }
  }

  void _showCreateDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    String category = 'travel';
    List<UploadedFile> attachments = [];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 16,
            right: 16,
            top: 16,
          ),
          child: SizedBox(
            height: MediaQuery.of(ctx).size.height * 0.65,
            child: ListView(
              children: [
                Text('New Expense Claim',
                    style: Theme.of(ctx).textTheme.titleLarge),
                const SizedBox(height: 16),
                TextField(
                    controller: titleCtrl,
                    decoration:
                        const InputDecoration(labelText: 'Title')),
                const SizedBox(height: 12),
                TextField(
                    controller: amountCtrl,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                        labelText: 'Amount',
                        prefixText: '\$ ')),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: category,
                  decoration:
                      const InputDecoration(labelText: 'Category'),
                  items: ['travel', 'food', 'supplies', 'utilities',
                          'maintenance', 'other']
                      .map((c) => DropdownMenuItem(
                          value: c,
                          child: Text(c[0].toUpperCase() + c.substring(1))))
                      .toList(),
                  onChanged: (v) => category = v!,
                ),
                const SizedBox(height: 12),
                TextField(
                    controller: descCtrl,
                    decoration: const InputDecoration(
                        labelText: 'Description (optional)'),
                    maxLines: 3),
                const SizedBox(height: 16),
                FilePickerWidget(
                  selectedFiles: attachments,
                  onFilesChanged: (files) => setDialogState(() => attachments = files),
                  maxFiles: 3,
                  allowMultiple: false,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: () async {
                    final amount = double.tryParse(amountCtrl.text);
                    if (titleCtrl.text.isEmpty || amount == null) return;
                    await ref
                        .read(cachedExpensesProvider.notifier)
                        .createExpense({
                          'title': titleCtrl.text,
                          'amount': amount,
                          'category': category,
                          'description': descCtrl.text,
                          if (attachments.isNotEmpty)
                            'receiptUrl': attachments.first.url,
                        }, context: context);
                    if (ctx.mounted) Navigator.of(ctx).pop();
                  },
                  child: const Text('Submit Claim'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
