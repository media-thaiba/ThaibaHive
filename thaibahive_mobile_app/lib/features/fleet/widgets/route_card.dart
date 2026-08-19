import 'package:flutter/material.dart';
import '../providers/driver_route_provider.dart';

class RouteCard extends StatelessWidget {
  final FleetRouteItem route;
  final VoidCallback onToggleTrip;

  const RouteCard({
    super.key,
    required this.route,
    required this.onToggleTrip,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.between,
              children: [
                Text(
                  route.name,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: route.isTripActive ? Colors.green.shade100 : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    route.isTripActive ? 'IN PROGRESS' : 'SCHEDULED',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: route.isTripActive ? Colors.green.shade900 : Colors.grey.shade800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.my_location, size: 16, color: Colors.blue),
                const SizedBox(width: 6),
                Text(route.startLocation, style: const TextStyle(fontSize: 13)),
                const SizedBox(width: 12),
                const Icon(Icons.arrow_forward, size: 14, color: Colors.grey),
                const SizedBox(width: 12),
                const Icon(Icons.location_on, size: 16, color: Colors.red),
                const SizedBox(width: 6),
                Text(route.endLocation, style: const TextStyle(fontSize: 13)),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Vehicle: ${route.vehicleReg}',
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: onToggleTrip,
                icon: Icon(route.isTripActive ? Icons.stop : Icons.play_arrow),
                label: Text(route.isTripActive ? 'End Trip' : 'Start Trip'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: route.isTripActive ? Colors.red : Colors.indigo,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
