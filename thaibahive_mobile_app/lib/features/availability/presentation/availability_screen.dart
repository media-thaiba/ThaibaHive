import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/availability_provider.dart';

class AvailabilityScreen extends ConsumerStatefulWidget {
  const AvailabilityScreen({super.key});

  @override
  ConsumerState<AvailabilityScreen> createState() =>
      _AvailabilityScreenState();
}

class _AvailabilityScreenState extends ConsumerState<AvailabilityScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(
        () => ref.read(availabilityProvider.notifier).loadAvailability());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(availabilityProvider);
    final notifier = ref.read(availabilityProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Availability',
      showBack: false,
      body: state.isLoading
          ? const PageShimmer()
          : state.error != null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.loadAvailability(),
                )
              : ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    Text('Set Your Status',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _statusButton(
                            'Available',
                            'available',
                            Colors.green,
                            Icons.check_circle_rounded,
                            notifier,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _statusButton(
                            'Busy',
                            'busy',
                            Colors.red,
                            Icons.block_rounded,
                            notifier,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: _statusButton(
                            'Away',
                            'away',
                            Colors.orange,
                            Icons.timer_rounded,
                            notifier,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: _statusButton(
                            'Offline',
                            'offline',
                            Colors.grey,
                            Icons.cloud_off_rounded,
                            notifier,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 32),
                    Text('Team Availability',
                        style: theme.textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 8),
                    ...state.teamAvailability.map((member) {
                      final statusColor =
                          _teamStatusColor(member.status);
                      final name = member.staff?.fullName ?? member.staffId;
                      final designation = member.staff?.designation;
                      return Card(
                        margin:
                            const EdgeInsets.symmetric(vertical: 4),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor:
                                statusColor.withValues(alpha: 0.2),
                            child: Icon(Icons.person_rounded,
                                color: statusColor, size: 22),
                          ),
                          title: Text(name,
                              style: const TextStyle(
                                  fontWeight: FontWeight.w600)),
                          subtitle: designation != null
                              ? Text(designation)
                              : null,
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusColor
                                  .withValues(alpha: 0.15),
                              borderRadius:
                                  BorderRadius.circular(8),
                            ),
                            child: Text(member.status,
                                style: TextStyle(
                                  color: statusColor,
                                  fontSize: 12,
                                  fontWeight: FontWeight.w600,
                                )),
                          ),
                        ),
                      );
                    }),
                  ],
                ),
    );
  }

  Widget _statusButton(
    String label,
    String value,
    Color color,
    IconData icon,
    AvailabilityNotifier notifier,
  ) {
    return InkWell(
      onTap: () => notifier.updateMyAvailability(value),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 24),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: color.withValues(alpha: 0.4),
            width: 2,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, size: 40, color: color),
            const SizedBox(height: 8),
            Text(label,
                style: TextStyle(
                  fontWeight: FontWeight.w600,
                  color: color,
                  fontSize: 16,
                )),
          ],
        ),
      ),
    );
  }

  Color _teamStatusColor(String status) {
    switch (status) {
      case 'available':
        return Colors.green;
      case 'busy':
        return Colors.red;
      case 'away':
        return Colors.orange;
      case 'offline':
        return Colors.grey;
      default:
        return Colors.grey;
    }
  }
}
