import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/driver_route_provider.dart';
import '../widgets/route_card.dart';

class DriverDashboardScreen extends ConsumerWidget {
  const DriverDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final routes = ref.watch(driverRouteProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fleet Driver Navigation'),
        backgroundColor: Colors.indigo,
        foregroundColor: Colors.white,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // Pull to refresh simulation
          await Future.delayed(const Duration(milliseconds: 500));
        },
        child: routes.isEmpty
            ? const Center(
                child: Text('No assigned fleet routes for today.'),
              )
            : ListView.builder(
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: routes.length,
                itemBuilder: (context, index) {
                  final route = routes[index];
                  return RouteCard(
                    route: route,
                    onToggleTrip: () {
                      ref.read(driverRouteProvider.notifier).toggleTripStatus(route.id);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            route.isTripActive
                                ? 'Trip ended for ${route.name}'
                                : 'Trip started for ${route.name}',
                          ),
                          duration: const Duration(seconds: 2),
                        ),
                      );
                    },
                  );
                },
              ),
      ),
    );
  }
}
