import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/help_desk_provider.dart';

class HelpDeskTicketDetailScreen extends ConsumerStatefulWidget {
  final String ticketId;

  const HelpDeskTicketDetailScreen({super.key, required this.ticketId});

  @override
  ConsumerState<HelpDeskTicketDetailScreen> createState() =>
      _HelpDeskTicketDetailScreenState();
}

class _HelpDeskTicketDetailScreenState
    extends ConsumerState<HelpDeskTicketDetailScreen> {
  final _commentCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(helpDeskProvider.notifier).loadTicketDetail(widget.ticketId));
  }

  @override
  void dispose() {
    _commentCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(helpDeskProvider);
    final ticket = state.selectedTicket;
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Ticket Detail',
      body: state.isLoading
          ? const PageShimmer()
          : ticket == null
              ? const Center(child: Text('Ticket not found'))
              : Column(
                  children: [
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.all(16),
                        children: [
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(ticket.title,
                                            style: theme.textTheme.titleMedium
                                                ?.copyWith(
                                                    fontWeight:
                                                        FontWeight.w600)),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: _statusColor(
                                                  ticket.status, theme)
                                              .withValues(alpha: 0.15),
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Text(ticket.status,
                                            style: TextStyle(
                                              color: _statusColor(
                                                  ticket.status, theme),
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                            )),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  _infoRow(
                                      Icons.category_rounded,
                                      'Category',
                                      ticket.category),
                                  _infoRow(Icons.flag_rounded, 'Priority',
                                      ticket.priority),
                                  if (ticket.assignee != null)
                                    _infoRow(Icons.person_rounded,
                                        'Assigned to', ticket.assignee!.fullName),
                                  _infoRow(Icons.person_outline_rounded,
                                      'Submitted by', ticket.submitter?.fullName ?? ticket.submittedById),
                                  _infoRow(Icons.calendar_today_rounded,
                                      'Created', ticket.createdAt.toDisplayDate()),
                                  _infoRow(Icons.chat_bubble_outline_rounded,
                                      'Comments', '${ticket.commentCount ?? 0}'),
                                  const SizedBox(height: 12),
                                  Text('Description',
                                      style: theme.textTheme.titleSmall),
                                  const SizedBox(height: 4),
                                  Text(ticket.description),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Text('Comments',
                              style: theme.textTheme.titleMedium
                                  ?.copyWith(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Text('Comment system coming soon',
                                  style: TextStyle(color: Colors.grey[600])),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surface,
                        boxShadow: [
                          BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 8,
                              offset: const Offset(0, -2)),
                        ],
                      ),
                      child: SafeArea(
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _commentCtrl,
                                decoration: const InputDecoration(
                                    hintText: 'Add a comment...',
                                    isDense: true),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              icon: const Icon(Icons.send_rounded),
                              color: theme.colorScheme.primary,
                              onPressed: () async {
                                if (_commentCtrl.text.isEmpty) return;
                                await ref
                                    .read(helpDeskProvider.notifier)
                                    .addComment(
                                        widget.ticketId, _commentCtrl.text);
                                _commentCtrl.clear();
                              },
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Color _statusColor(String status, ThemeData theme) {
    switch (status) {
      case 'open':
        return Colors.blue;
      case 'in_progress':
        return Colors.orange;
      case 'resolved':
        return Colors.green;
      case 'closed':
        return Colors.grey;
      default:
        return theme.colorScheme.primary;
    }
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(color: Colors.grey)),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }
}
