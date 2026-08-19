import 'package:flutter_riverpod/flutter_riverpod.dart';

class FleetRouteItem {
  final String id;
  final String name;
  final String startLocation;
  final String endLocation;
  final String vehicleReg;
  final bool isTripActive;

  FleetRouteItem({
    required this.id,
    required this.name,
    required this.startLocation,
    required this.endLocation,
    required this.vehicleReg,
    this.isTripActive = false,
  });
}

final driverRouteProvider = StateNotifierProvider<DriverRouteNotifier, List<FleetRouteItem>>((ref) {
  return DriverRouteNotifier();
});

class DriverRouteNotifier extends StateNotifier<List<FleetRouteItem>> {
  DriverRouteNotifier()
      : super([
          FleetRouteItem(
            id: 'r_001',
            name: 'Route 1 - North Campus Shuttle',
            startLocation: 'Main Gate',
            endLocation: 'Science Building',
            vehicleReg: 'KA-01-AB-1234',
          ),
          FleetRouteItem(
            id: 'r_002',
            name: 'Route 2 - Hostel Express',
            startLocation: 'Hostel Complex',
            endLocation: 'Central Library',
            vehicleReg: 'KA-01-AB-5678',
          ),
        ]);

  void toggleTripStatus(String id) {
    state = [
      for (final item in state)
        if (item.id == id)
          FleetRouteItem(
            id: item.id,
            name: item.name,
            startLocation: item.startLocation,
            endLocation: item.endLocation,
            vehicleReg: item.vehicleReg,
            isTripActive: !item.isTripActive,
          )
        else
          item
    ];
  }
}
