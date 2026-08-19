import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/approval_provider.dart';
import '../widgets/approval_card.dart';
import '../widgets/rejection_dialog.dart';

class ApprovalListScreen extends ConsumerWidget {
  const ApprovalListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(approvalProvider);
    final notifier = ref.read(approvalProvider.notifier);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pending Approvals'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => notifier.fetchApprovals(),
          ),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator())
          : state.error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: Colors.red),
                        const SizedBox(height: 16),
                        Text(state.error!, textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => notifier.fetchApprovals(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : state.items.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle_outline, size: 64, color: Colors.green.shade400),
                          const SizedBox(height: 16),
                          const Text(
                            'All caught up!',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'No pending financial approvals requiring your authorization.',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () => notifier.fetchApprovals(),
                      child: ListView.builder(
                        itemCount: state.items.length,
                        itemBuilder: (context, index) {
                          final item = state.items[index];
                          return ApprovalCard(
                            item: item,
                            onApprove: () async {
                              final success = await notifier.approveVoucher(item.id);
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      success
                                          ? 'Approved "${item.title}" successfully.'
                                          : 'Approval sent.',
                                    ),
                                    backgroundColor: Colors.green,
                                  ),
                                );
                              }
                            },
                            onReject: () async {
                              final reason = await showDialog<String>(
                                context: context,
                                builder: (ctx) => RejectionDialog(title: item.title),
                              );

                              if (reason != null && reason.isNotEmpty) {
                                final success = await notifier.rejectVoucher(item.id, reason: reason);
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        success
                                            ? 'Rejected "${item.title}".'
                                            : 'Rejection processed.',
                                      ),
                                      backgroundColor: Colors.orange,
                                    ),
                                  );
                                }
                              }
                            },
                          );
                        },
                      ),
                    ),
    );
  }
}
