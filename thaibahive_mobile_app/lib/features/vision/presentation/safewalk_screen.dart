import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/vision_providers.dart';

class SafeWalkScreen extends ConsumerStatefulWidget {
  const SafeWalkScreen({super.key});

  @override
  ConsumerState<SafeWalkScreen> createState() => _SafeWalkScreenState();
}

class _SafeWalkScreenState extends ConsumerState<SafeWalkScreen> {
  final _pickupController = TextEditingController(text: 'Science Library');
  final _destController = TextEditingController(text: 'West Residence Hall');

  @override
  void dispose() {
    _pickupController.dispose();
    _destController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final escort = ref.watch(safeWalkProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Student SafeWalk Escort'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (escort.isRequested) ...[
              Card(
                color: Colors.teal.shade800,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Escort En Route',
                        style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Guard ${escort.assignedGuardCallSign} arriving at ${escort.pickupLocation} in ${escort.etaMinutes} mins.',
                        style: const TextStyle(color: Colors.white70),
                      ),
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: () {
                          ref.read(safeWalkProvider.notifier).completeEscort();
                        },
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.teal.shade900),
                        child: const Text('Confirm Safe Arrival'),
                      ),
                    ],
                  ),
                ),
              ),
            ] else ...[
              const Text(
                'Request a 24/7 Security Escort',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'A uniformed campus safety officer will walk with you to your destination.',
                style: TextStyle(color: Colors.black54),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: _pickupController,
                decoration: const InputDecoration(
                  labelText: 'Pickup Location',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.my_location),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _destController,
                decoration: const InputDecoration(
                  labelText: 'Destination',
                  border: OutlineInputBorder(),
                  prefixIcon: Icon(Icons.pin_drop),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () {
                    ref.read(safeWalkProvider.notifier).requestEscort(
                          _pickupController.text,
                          _destController.text,
                        );
                  },
                  icon: const Icon(Icons.directions_walk),
                  label: const Text('Request SafeWalk Now'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
