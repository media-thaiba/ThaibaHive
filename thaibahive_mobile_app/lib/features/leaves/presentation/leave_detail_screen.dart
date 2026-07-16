import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/leave_request_model.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/leaves_repository.dart';

class LeaveDetailScreen extends ConsumerStatefulWidget {
  final String id;
  const LeaveDetailScreen({super.key, required this.id});

  @override
  ConsumerState<LeaveDetailScreen> createState() => _LeaveDetailScreenState();
}

class _LeaveDetailScreenState extends ConsumerState<LeaveDetailScreen> {
  late Future<LeaveRequestModel> _leaveFuture;
  final _notesController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _leaveFuture = _loadLeave();
  }

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<LeaveRequestModel> _loadLeave() async {
    final repo = ref.read(leavesRepositoryProvider);
    return repo.getLeaveById(widget.id);
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'pending':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  Future<void> _updateStatus(String status) async {
    final repo = ref.read(leavesRepositoryProvider);
    try {
      await repo.updateLeave(widget.id, {
        'status': status,
        'review_notes': _notesController.text.trim(),
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Leave $status successfully')),
        );
        setState(() => _leaveFuture = _loadLeave());
        ref.invalidate(leavesRepositoryProvider);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }

  void _showApproveRejectDialog(String action) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('${action[0].toUpperCase()}${action.substring(1)} Leave'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Are you sure you want to $action this leave request?'),
            const SizedBox(height: 12),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                labelText: 'Review Notes (optional)',
                hintText: 'Add any comments...',
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              _updateStatus(action);
            },
            child: Text(action == 'approved' ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Leave Details')),
      body: FutureBuilder<LeaveRequestModel>(
        future: _leaveFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const PageShimmer();
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final leave = snapshot.data!;
          final statusColor = _statusColor(leave.status);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(Icons.beach_access_rounded,
                                  color: statusColor),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    leave.leaveType?.name ?? 'Leave',
                                    style: theme.textTheme.titleMedium
                                        ?.copyWith(fontWeight: FontWeight.w600),
                                  ),
                                  if (leave.staff != null)
                                    Text(
                                      leave.staff!.fullName,
                                      style: theme.textTheme.bodySmall,
                                    ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                leave.status.toUpperCase(),
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                  color: statusColor,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        _InfoRow(
                            icon: Icons.calendar_month_rounded,
                            label: 'Start Date',
                            value: _formatDate(leave.startDate)),
                        const SizedBox(height: 8),
                        _InfoRow(
                            icon: Icons.calendar_month_rounded,
                            label: 'End Date',
                            value: _formatDate(leave.endDate)),
                        const SizedBox(height: 8),
                        _InfoRow(
                            icon: Icons.event_available_rounded,
                            label: 'Days',
                            value: '${leave.days.toInt()} day${leave.days > 1 ? 's' : ''}'),
                        if (leave.reason.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text('Reason',
                              style: theme.textTheme.labelMedium
                                  ?.copyWith(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 4),
                          Text(leave.reason,
                              style: theme.textTheme.bodyMedium),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Status Timeline',
                            style: theme.textTheme.titleSmall
                                ?.copyWith(fontWeight: FontWeight.w600)),
                        const SizedBox(height: 12),
                        _TimelineItem(
                          icon: Icons.send_rounded,
                          title: 'Applied',
                          subtitle: _formatDateTime(leave.appliedAt),
                          isLast: leave.status == 'pending',
                        ),
                        if (leave.status != 'pending') ...[
                          _TimelineItem(
                            icon: leave.status == 'approved'
                                ? Icons.check_circle_rounded
                                : Icons.cancel_rounded,
                            title: leave.status == 'approved'
                                ? 'Approved'
                                : 'Rejected',
                            subtitle: leave.reviewedAt != null
                                ? _formatDateTime(leave.reviewedAt!)
                                : '',
                            isLast: true,
                            color: statusColor,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
                if (leave.reviewNotes != null &&
                    leave.reviewNotes!.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Review Notes',
                              style: theme.textTheme.titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w600)),
                          const SizedBox(height: 8),
                          Text(leave.reviewNotes!,
                              style: theme.textTheme.bodyMedium),
                        ],
                      ),
                    ),
                  ),
                ],
                if (leave.status == 'pending') ...[
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _showApproveRejectDialog('rejected'),
                          icon: const Icon(Icons.close_rounded),
                          label: const Text('Reject'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: const BorderSide(color: Colors.red),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton.icon(
                          onPressed: () =>
                              _showApproveRejectDialog('approved'),
                          icon: const Icon(Icons.check_rounded),
                          label: const Text('Approve'),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  String _formatDate(String date) {
    try {
      return DateFormat('dd MMM yyyy').format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }

  String _formatDateTime(String date) {
    try {
      return DateFormat('dd MMM yyyy, hh:mm a')
          .format(DateTime.parse(date));
    } catch (_) {
      return date;
    }
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      children: [
        Icon(icon, size: 18, color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
        const SizedBox(width: 8),
        Text('$label: ',
            style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6))),
        Text(value,
            style: theme.textTheme.bodyMedium
                ?.copyWith(fontWeight: FontWeight.w500)),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final bool isLast;
  final Color? color;
  const _TimelineItem({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.isLast = false,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final c = color ?? theme.colorScheme.primary;
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: BoxDecoration(
                  color: c.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, size: 14, color: c),
              ),
              if (!isLast)
                Container(
                  width: 2,
                  height: 20,
                  color: theme.dividerTheme.color,
                ),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title,
                    style: theme.textTheme.bodyMedium
                        ?.copyWith(fontWeight: FontWeight.w500)),
                if (subtitle.isNotEmpty)
                  Text(subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
