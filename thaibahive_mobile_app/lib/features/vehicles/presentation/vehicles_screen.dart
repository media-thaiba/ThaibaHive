import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/vehicles_provider.dart';

class VehiclesScreen extends ConsumerStatefulWidget {
  const VehiclesScreen({super.key});

  @override
  ConsumerState<VehiclesScreen> createState() => _VehiclesScreenState();
}

class _VehiclesScreenState extends ConsumerState<VehiclesScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        ref.read(vehiclesProvider.notifier).setTab(_tabController.index);
      }
    });
    Future.microtask(() => ref.read(vehiclesProvider.notifier).loadVehicles());
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(vehiclesProvider);
    final notifier = ref.read(vehiclesProvider.notifier);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'Vehicles',
      showBack: false,
      bottom: TabBar(
        controller: _tabController,
        tabs: const [
          Tab(text: 'Vehicles'),
          Tab(text: 'Bookings'),
          Tab(text: 'Logs'),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          if (_tabController.index == 1) {
            _showCreateBookingDialog(context);
          } else if (_tabController.index == 2) {
            _showCreateLogDialog(context);
          }
        },
        child: const Icon(Icons.add_rounded),
      ),
      body: state.isLoading
          ? const PageShimmer()
          : state.error != null
              ? AppErrorWidget(
                  message: state.error!,
                  onRetry: () => notifier.loadVehicles(),
                )
              : TabBarView(
                  controller: _tabController,
                  children: [
                    _vehiclesTab(state, notifier, theme),
                    _bookingsTab(state, notifier, theme),
                    _logsTab(state, theme),
                  ],
                ),
    );
  }

  Widget _vehiclesTab(
      VehiclesState state, VehiclesNotifier notifier, ThemeData theme) {
    if (state.vehicles.isEmpty) {
      return const EmptyStateWidget(
          message: 'No vehicles', icon: Icons.directions_car_rounded);
    }
    return RefreshIndicator(
      onRefresh: () => notifier.loadVehicles(),
      child: ListView.builder(
        itemCount: state.vehicles.length,
        itemBuilder: (_, i) {
          final v = state.vehicles[i];
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor:
                    _vehicleStatusColor(v.status).withValues(alpha: 0.2),
                child: Icon(Icons.directions_car_rounded,
                    color: _vehicleStatusColor(v.status)),
              ),
              title: Text('${v.name} (${v.registrationNumber})',
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                  '${v.type} · ${v.capacity} seats · ${v.model ?? '-'}'),
              trailing: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _vehicleStatusColor(v.status)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(v.status,
                    style: TextStyle(
                      color: _vehicleStatusColor(v.status),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    )),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _bookingsTab(
      VehiclesState state, VehiclesNotifier notifier, ThemeData theme) {
    if (state.bookings.isEmpty) {
      return const EmptyStateWidget(
          message: 'No vehicle bookings', icon: Icons.calendar_today_rounded);
    }
    return RefreshIndicator(
      onRefresh: () => notifier.loadVehicles(),
      child: ListView.builder(
        itemCount: state.bookings.length,
        itemBuilder: (_, i) {
          final b = state.bookings[i];
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: _bookingStatusColor(b.status, theme)
                    .withValues(alpha: 0.2),
                child: Icon(Icons.calendar_today_rounded,
                    color: _bookingStatusColor(b.status, theme), size: 20),
              ),
              title: Text(b.purpose,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (b.vehicleName != null) Text(b.vehicleName!),
                  Text(
                      '${b.startTime.toDisplayDateTime()} - ${b.endTime.toDisplayTime()}'),
                ],
              ),
              trailing: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: _bookingStatusColor(b.status, theme)
                      .withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(b.status,
                    style: TextStyle(
                      color: _bookingStatusColor(b.status, theme),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    )),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _logsTab(VehiclesState state, ThemeData theme) {
    if (state.logs.isEmpty) {
      return const EmptyStateWidget(
          message: 'No vehicle logs', icon: Icons.history_rounded);
    }
    return RefreshIndicator(
      onRefresh: () => ref.read(vehiclesProvider.notifier).loadVehicles(),
      child: ListView.builder(
        itemCount: state.logs.length,
        itemBuilder: (_, i) {
          final l = state.logs[i];
          return Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: Colors.blue.withValues(alpha: 0.2),
                child: const Icon(Icons.history_rounded,
                    color: Colors.blue, size: 20),
              ),
              title: Text(l.logType,
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(l.description),
                  if (l.vehicleName != null) Text(l.vehicleName!),
                  Text(l.createdAt.toDisplayDateTime(),
                      style: theme.textTheme.bodySmall),
                ],
              ),
              trailing: l.cost != null
                  ? Text('\$${l.cost!.toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.w600))
                  : null,
            ),
          );
        },
      ),
    );
  }

  Color _vehicleStatusColor(String status) {
    switch (status) {
      case 'available':
        return Colors.green;
      case 'in_use':
        return Colors.blue;
      case 'maintenance':
        return Colors.orange;
      case 'out_of_service':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _bookingStatusColor(String status, ThemeData theme) {
    switch (status) {
      case 'pending':
        return Colors.orange;
      case 'approved':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'completed':
        return Colors.blue;
      default:
        return theme.colorScheme.primary;
    }
  }

  void _showCreateBookingDialog(BuildContext context) {
    final purposeCtrl = TextEditingController();
    final destinationCtrl = TextEditingController();
    DateTime startTime = DateTime.now().add(const Duration(hours: 1));
    DateTime endTime = DateTime.now().add(const Duration(hours: 3));

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
          height: MediaQuery.of(ctx).size.height * 0.55,
          child: ListView(
            children: [
              Text('Book Vehicle',
                  style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                  controller: purposeCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Purpose')),
              TextField(
                  controller: destinationCtrl,
                  decoration: const InputDecoration(
                      labelText: 'Destination')),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  if (purposeCtrl.text.isEmpty) return;
                  final state = ref.read(vehiclesProvider);
                  if (state.vehicles.isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(
                            content: Text('No vehicles available')));
                    return;
                  }
                  await ref
                      .read(vehiclesProvider.notifier)
                      .createBooking({
                        'vehicle_id': state.vehicles.first.id,
                        'purpose': purposeCtrl.text,
                        'destination': destinationCtrl.text,
                        'start_time': startTime.toIso8601String(),
                        'end_time': endTime.toIso8601String(),
                      });
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: const Text('Submit Booking'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCreateLogDialog(BuildContext context) {
    final descCtrl = TextEditingController();
    final costCtrl = TextEditingController();
    String logType = 'fuel';

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
          height: MediaQuery.of(ctx).size.height * 0.5,
          child: ListView(
            children: [
              Text('Add Vehicle Log',
                  style: Theme.of(ctx).textTheme.titleLarge),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                value: logType,
                decoration:
                    const InputDecoration(labelText: 'Log Type'),
                items: ['fuel', 'maintenance', 'repair', 'cleaning',
                        'insurance', 'other']
                    .map((t) => DropdownMenuItem(
                        value: t,
                        child: Text(t[0].toUpperCase() +
                            t.substring(1))))
                    .toList(),
                onChanged: (v) => logType = v!,
              ),
              TextField(
                  controller: descCtrl,
                  decoration:
                      const InputDecoration(labelText: 'Description'),
                  maxLines: 3),
              TextField(
                  controller: costCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                      labelText: 'Cost (optional)',
                      prefixText: '\$ ')),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  if (descCtrl.text.isEmpty) return;
                  final state = ref.read(vehiclesProvider);
                  if (state.vehicles.isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                        const SnackBar(
                            content: Text('No vehicles available')));
                    return;
                  }
                  await ref
                      .read(vehiclesProvider.notifier)
                      .createLog({
                        'vehicle_id': state.vehicles.first.id,
                        'log_type': logType,
                        'description': descCtrl.text,
                        'cost': double.tryParse(costCtrl.text),
                      });
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: const Text('Add Log'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
