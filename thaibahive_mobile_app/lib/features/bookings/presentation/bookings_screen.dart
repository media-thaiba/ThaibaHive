import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/bookings_provider.dart';

class BookingsScreen extends ConsumerStatefulWidget {
  const BookingsScreen({super.key});

  @override
  ConsumerState<BookingsScreen> createState() => _BookingsScreenState();
}

class _BookingsScreenState extends ConsumerState<BookingsScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(bookingsProvider.notifier).loadInitial());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(bookingsProvider);
    final notifier = ref.read(bookingsProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Bookings',
      showBack: false,
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/bookings/create'),
        child: const Icon(Icons.add_rounded),
      ),
      body: Column(
        children: [
          if (state.resources.isNotEmpty)
            Container(
              height: 48,
              margin: const EdgeInsets.only(top: 8),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 12),
                children: [
                  _buildResourceChip(null, 'All', state.selectedResourceId == null, theme),
                  ...state.resources.map((r) => _buildResourceChip(
                        r.id,
                        r.name,
                        state.selectedResourceId == r.id,
                        theme,
                      )),
                ],
              ),
            ),
          const SizedBox(height: 4),
          Expanded(
            child: state.isLoading
                ? const ListShimmer()
                : state.error != null
                    ? AppErrorWidget(
                        message: state.error!,
                        onRetry: () => notifier.loadInitial(),
                      )
                    : state.bookings.isEmpty
                        ? const EmptyStateWidget(
                            message: 'No bookings yet',
                            icon: Icons.calendar_today_rounded)
                        : RefreshIndicator(
                            onRefresh: () => notifier.refresh(),
                            child: ListView.builder(
                              padding: const EdgeInsets.only(bottom: 80),
                              itemCount: notifier.filteredBookings.length,
                              itemBuilder: (_, i) {
                                final b = notifier.filteredBookings[i];
                                return Card(
                                  margin: const EdgeInsets.symmetric(
                                      horizontal: 16, vertical: 4),
                                  child: ListTile(
                                    title: Text(b.title,
                                        style: const TextStyle(
                                            fontWeight: FontWeight.w600)),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        if (b.resourceName != null)
                                          Text('${b.resourceName}'),
                                        Text(
                                          '${b.startTime.toDisplayDateTime()} - ${b.endTime.toDisplayTime()}'),
                                      ],
                                    ),
                                    trailing: _statusChip(b.status, theme),
                                    isThreeLine: true,
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }

  Widget _buildResourceChip(
      String? id, String label, bool selected, ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: FilterChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) =>
            ref.read(bookingsProvider.notifier).setResourceFilter(id),
        selectedColor: theme.colorScheme.primary.withValues(alpha: 0.2),
        checkmarkColor: theme.colorScheme.primary,
      ),
    );
  }

  Widget _statusChip(String status, ThemeData theme) {
    Color color;
    switch (status) {
      case 'approved':
        color = Colors.green;
      case 'pending':
        color = Colors.orange;
      case 'rejected':
        color = Colors.red;
      default:
        color = Colors.grey;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Text(status,
          style: TextStyle(
              color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}
