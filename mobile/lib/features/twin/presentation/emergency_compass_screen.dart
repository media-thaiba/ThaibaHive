// Flutter Emergency Evacuation AR / Compass Screen (TWIN-022)

import 'package:flutter/material.dart';
import '../application/twin_providers.dart';

class EmergencyCompassScreen extends StatelessWidget {
  const EmergencyCompassScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    const emergencyState = EmergencyCompassState(
      nearestExitName: 'North Stairwell Emergency Exit (Door 2B)',
      distanceMeters: 28.5,
      bearingDegrees: 45.0,
      isHazardActive: true,
      hazardMessage: 'Active Fire Alarm in Sector C. South stairwell is blocked. Follow North evacuation route.',
    );

    return Scaffold(
      backgroundColor: Colors.grey[900],
      appBar: AppBar(
        backgroundColor: Colors.red[900],
        foregroundColor: Colors.white,
        title: const Text('Emergency Evacuation Compass'),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Hazard Banner
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.red[950],
                  border: Border.all(color: Colors.red, width: 1.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.warning_rounded, color: Colors.amber, size: 28),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        emergencyState.hazardMessage ?? 'Emergency Protocol Active',
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),

              // Digital Compass Dial
              Column(
                children: [
                  Container(
                    width: 220,
                    height: 220,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.redAccent, width: 3),
                      color: Colors.black45,
                    ),
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.navigation, color: Colors.redAccent, size: 64),
                          const SizedBox(height: 8),
                          Text(
                            '${emergencyState.bearingDegrees.toInt()}° NE',
                            style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '${emergencyState.distanceMeters.toStringAsFixed(1)} m',
                            style: const TextStyle(color: Colors.greenAccent, fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),

              // Destination Exit Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.grey[850],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'NEAREST DESIGNATED SAFE EXIT:',
                      style: TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      emergencyState.nearestExitName,
                      style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '• Step-Free Accessible Route\n• Emergency lighting enabled along corridor',
                      style: TextStyle(color: Colors.greenAccent, fontSize: 12),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
