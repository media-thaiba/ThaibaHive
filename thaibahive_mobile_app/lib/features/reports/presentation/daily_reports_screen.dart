import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../models/daily_report_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/reports_provider.dart';

class DailyReportsScreen extends ConsumerWidget {
  const DailyReportsScreen({super.key});

  Color _statusColor(String status) {
    switch (status) {
      case 'submitted':
        return Colors.blue;
      case 'reviewed':
        return Colors.green;
      case 'draft':
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final reportsAsync = ref.watch(reportsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Daily Reports')),
      body: reportsAsync.when(
        data: (reports) {
          if (reports.isEmpty) {
            return EmptyStateWidget(
              icon: Icons.description_rounded,
              title: 'No Reports',
              message: 'You haven\'t created any daily reports yet.',
              actionLabel: 'Create Report',
              onAction: () => context.push('/reports/create'),
            );
          }
          final grouped = <String, List<DailyReportModel>>{};
          for (final r in reports) {
            grouped.putIfAbsent(r.reportDate, () => []).add(r);
          }
          final sortedDates = grouped.keys.toList()
            ..sort((a, b) => b.compareTo(a));
          return RefreshIndicator(
            onRefresh: () =>
                ref.read(reportsListProvider.notifier).refresh(),
            child: ListView.builder(
              padding: const EdgeInsets.only(top: 8, bottom: 80),
              itemCount: sortedDates.length,
              itemBuilder: (_, i) {
                final date = sortedDates[i];
                final dateReports = grouped[date]!;
                return _DateGroup(
                  date: date,
                  reports: dateReports,
                  onTap: (r) => _showDetail(context, r),
                );
              },
            ),
          );
        },
        loading: () => const PageShimmer(),
        error: (e, _) => AppErrorWidget(
          message: e.toString(),
          onRetry: () =>
              ref.read(reportsListProvider.notifier).refresh(),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/reports/create'),
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  void _showDetail(BuildContext context, DailyReportModel report) {
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (_, scrollController) => Padding(
          padding: const EdgeInsets.all(20),
          child: ListView(
            controller: scrollController,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _statusColor(report.status)
                          .withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      report.status.toUpperCase(),
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: _statusColor(report.status),
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatDate(report.reportDate),
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(report.summary,
                  style: theme.textTheme.bodyLarge),
              const SizedBox(height: 16),
              Text('Tasks (${report.tasks.length})',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w600)),
              const Divider(),
              ...report.tasks.map((t) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle_outline_rounded,
                            size: 18),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(t.description),
                        ),
                        Text('${t.hoursSpent.toInt()}h',
                            style: theme.textTheme.bodySmall?.copyWith(
                                fontWeight: FontWeight.w500)),
                      ],
                    ),
                  )),
            ],
          ),
        ),
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
}

class _DateGroup extends StatelessWidget {
  final String date;
  final List<DailyReportModel> reports;
  final void Function(DailyReportModel) onTap;
  const _DateGroup({
    required this.date,
    required this.reports,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Text(
            _formatHeader(date),
            style: theme.textTheme.labelMedium?.copyWith(
              fontWeight: FontWeight.w600,
              color: theme.colorScheme.primary,
            ),
          ),
        ),
        ...reports.map((r) => _ReportCard(
              report: r,
              onTap: () => onTap(r),
            )),
      ],
    );
  }

  String _formatHeader(String date) {
    try {
      final d = DateTime.parse(date);
      final now = DateTime.now();
      if (d.year == now.year && d.month == now.month && d.day == now.day) {
        return 'Today';
      }
      final yesterday = now.subtract(const Duration(days: 1));
      if (d.year == yesterday.year &&
          d.month == yesterday.month &&
          d.day == yesterday.day) {
        return 'Yesterday';
      }
      return DateFormat('EEEE, dd MMM yyyy').format(d);
    } catch (_) {
      return date;
    }
  }
}

class _ReportCard extends StatelessWidget {
  final DailyReportModel report;
  final VoidCallback onTap;
  const _ReportCard({required this.report, required this.onTap});

  Color _statusColor(String status) {
    switch (status) {
      case 'submitted':
        return Colors.blue;
      case 'reviewed':
        return Colors.green;
      case 'draft':
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _statusColor(report.status);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.description_rounded,
                    color: color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      report.summary,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w500),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.checklist_rounded,
                            size: 14,
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.6)),
                        const SizedBox(width: 4),
                        Text(
                          '${report.tasks.length} task${report.tasks.length != 1 ? 's' : ''}',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.6),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Icon(Icons.access_time_rounded,
                            size: 14,
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.6)),
                        const SizedBox(width: 4),
                        Text(
                          '${report.tasks.fold<double>(0, (sum, t) => sum + t.hoursSpent).toInt()}h',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.6),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  report.status.toUpperCase(),
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
