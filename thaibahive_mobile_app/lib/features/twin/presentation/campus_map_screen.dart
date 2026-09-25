// Flutter Mobile 3D Campus Map Screen (TWIN-022)

import 'package:flutter/material.dart';
import '../application/twin_providers.dart';
import 'widgets/space_comfort_card.dart';
import 'emergency_compass_screen.dart';

class CampusMapScreen extends StatefulWidget {
  const CampusMapScreen({Key? key}) : super(key: key);

  @override
  State<CampusMapScreen> createState() => _CampusMapScreenState();
}

class _CampusMapScreenState extends State<CampusMapScreen> {
  int _selectedFloor = 1;
  String _searchQuery = '';

  final List<SpaceComfortItem> _allSpaces = [
    SpaceComfortItem(
      spaceId: 'SPC-SEC-101',
      code: 'SEC-101',
      name: 'Robotics & AI Studio',
      facility: 'Science Complex',
      floorLevel: 1,
      capacity: 35,
      currentOccupancy: 12,
      comfortScore: 96.0,
      tempC: 22.1,
      co2Ppm: 460,
      noiseDb: 38.0,
      isAvailable: true,
    ),
    SpaceComfortItem(
      spaceId: 'SPC-SEC-102',
      code: 'SEC-102',
      name: 'Biotech Collaboration Pod',
      facility: 'Science Complex',
      floorLevel: 1,
      capacity: 15,
      currentOccupancy: 4,
      comfortScore: 92.0,
      tempC: 22.8,
      co2Ppm: 510,
      noiseDb: 42.0,
      isAvailable: true,
    ),
    SpaceComfortItem(
      spaceId: 'SPC-SEC-202',
      code: 'SEC-202',
      name: 'Collaborative Seminar Lounge',
      facility: 'Science Complex',
      floorLevel: 2,
      capacity: 40,
      currentOccupancy: 28,
      comfortScore: 86.0,
      tempC: 23.4,
      co2Ppm: 680,
      noiseDb: 52.0,
      isAvailable: true,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _allSpaces.where((s) {
      final matchesFloor = s.floorLevel == _selectedFloor;
      final matchesSearch = s.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          s.code.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesFloor && matchesSearch;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Campus Digital Twin Map'),
        actions: [
          IconButton(
            icon: const Icon(Icons.warning_amber_rounded, color: Colors.amber),
            tooltip: 'Emergency Compass',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (context) => const EmergencyCompassScreen(),
                ),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Search & Filter Header
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search study spaces, labs...',
                prefixIcon: const Icon(Icons.search, size: 20),
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
          ),

          // Floor Selector Pills
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [1, 2, 3].map((f) {
                final isSelected = _selectedFloor == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('Floor $f'),
                    selected: isSelected,
                    onSelected: (val) => setState(() => _selectedFloor = f),
                  ),
                );
              }).toList(),
            ),
          ),

          const SizedBox(height: 8),

          // Space List
          Expanded(
            child: filtered.isEmpty
              ? const Center(child: Text('No spaces found on this floor'))
              : ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    final space = filtered[index];
                    return SpaceComfortCard(
                      space: space,
                      onNavigate: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('Starting indoor wayfinding to ${space.name}...'),
                            duration: const Duration(seconds: 2),
                          ),
                        );
                      },
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }
}
