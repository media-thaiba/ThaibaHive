import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' as latlong;
import 'package:thaibahive_mobile/core/services/location_service.dart';

class MapLocationResult {
  final double latitude;
  final double longitude;
  final double radius;

  const MapLocationResult({
    required this.latitude,
    required this.longitude,
    required this.radius,
  });
}

class MapLocationPickerModal extends StatefulWidget {
  final double initialLatitude;
  final double initialLongitude;
  final double initialRadius;
  final String? title;

  const MapLocationPickerModal({
    super.key,
    this.initialLatitude = 0.0,
    this.initialLongitude = 0.0,
    this.initialRadius = 50.0,
    this.title,
  });

  static Future<MapLocationResult?> show(
    BuildContext context, {
    double initialLatitude = 0.0,
    double initialLongitude = 0.0,
    double initialRadius = 50.0,
    String? title,
  }) {
    return showModalBottomSheet<MapLocationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MapLocationPickerModal(
        initialLatitude: initialLatitude,
        initialLongitude: initialLongitude,
        initialRadius: initialRadius,
        title: title,
      ),
    );
  }

  @override
  State<MapLocationPickerModal> createState() => _MapLocationPickerModalState();
}

class _MapLocationPickerModalState extends State<MapLocationPickerModal> {
  late final MapController _mapController;
  late latlong.LatLng _mapCenter;
  late double _selectedRadius;
  bool _showSatellite = true; // Default to satellite view for high clarity
  bool _isLocating = false;

  final List<double> _presetRadii = [25, 50, 100, 200, 500];

  @override
  void initState() {
    super.initState();
    _mapController = MapController();
    _selectedRadius = widget.initialRadius;

    final hasValidCoords = widget.initialLatitude != 0.0 && widget.initialLongitude != 0.0;
    _mapCenter = latlong.LatLng(
      hasValidCoords ? widget.initialLatitude : 25.313183,
      hasValidCoords ? widget.initialLongitude : 88.606451,
    );

    if (!hasValidCoords) {
      _fetchInitialUserLocation();
    }
  }

  Future<void> _fetchInitialUserLocation() async {
    setState(() => _isLocating = true);
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 5),
      );
      if (pos != null && mounted) {
        final newCenter = latlong.LatLng(pos.latitude, pos.longitude);
        setState(() {
          _mapCenter = newCenter;
        });
        _mapController.move(newCenter, 17.0);
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  Future<void> _centerUserLocation() async {
    setState(() => _isLocating = true);
    try {
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 6),
      );
      final newCenter = latlong.LatLng(pos.latitude, pos.longitude);
      setState(() {
        _mapCenter = newCenter;
      });
      _mapController.move(newCenter, 17.0);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Could not fetch current GPS location: $e'),
            backgroundColor: Colors.red.shade700,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLocating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.90,
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag Handle
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 5,
            decoration: BoxDecoration(
              color: Colors.grey.shade300,
              borderRadius: BorderRadius.circular(10),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF16A34A).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.map, color: Color(0xFF16A34A), size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title ?? 'Adjust & Confirm Location',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      Text(
                        'Pinch to zoom or drag map to place checkpoint pin',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),

          // Coordinates & Status Bar
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFFF8FAFC),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    'Lat: ${_mapCenter.latitude.toStringAsFixed(6)}  |  Lon: ${_mapCenter.longitude.toStringAsFixed(6)}',
                    style: TextStyle(
                      fontSize: 12,
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600,
                      color: Colors.grey.shade800,
                    ),
                  ),
                ),
                Text(
                  'Radius: ${_selectedRadius.round()}m',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
          ),

          // Native FlutterMap View (Pinch to Zoom, Drag, Satellite Toggle)
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _mapCenter,
                    initialZoom: 16.5,
                    maxZoom: 19.0,
                    minZoom: 4.0,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all, // Pinch to zoom, drag, double tap zoom enabled!
                    ),
                    onPositionChanged: (position, hasGesture) {
                      if (position.center != null) {
                        setState(() {
                          _mapCenter = position.center!;
                        });
                      }
                    },
                  ),
                  children: [
                    // Tile Layer (Satellite ArcGIS vs OpenStreetMap)
                    TileLayer(
                      urlTemplate: _showSatellite
                          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
                          : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.thaibahive.app',
                    ),

                    // Geofence Circle Overlay
                    CircleLayer(
                      circles: [
                        CircleMarker(
                          point: _mapCenter,
                          radius: _selectedRadius,
                          useRadiusInMeter: true,
                          color: const Color(0xFF16A34A).withOpacity(0.20),
                          borderColor: const Color(0xFF16A34A),
                          borderStrokeWidth: 2.0,
                        ),
                      ],
                    ),
                  ],
                ),

                // Center Pin Marker
                IgnorePointer(
                  child: Center(
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 36),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.location_on_rounded,
                            color: const Color(0xFF16A34A),
                            size: 46,
                            shadows: [
                              Shadow(
                                color: Colors.black.withOpacity(0.4),
                                blurRadius: 8,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          Container(
                            width: 10,
                            height: 10,
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.3),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Top Instruction Badge
                Positioned(
                  top: 12,
                  left: 16,
                  right: 16,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.75),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.touch_app, color: Colors.white, size: 14),
                          SizedBox(width: 6),
                          Text(
                            'Drag map or pinch to position pin',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Floating Action Buttons (Satellite Toggle & Locate Me)
                Positioned(
                  bottom: 16,
                  right: 16,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Satellite / Map Toggle Button
                      FloatingActionButton.small(
                        heroTag: 'map_type_toggle',
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1E293B),
                        elevation: 3,
                        onPressed: () {
                          setState(() {
                            _showSatellite = !_showSatellite;
                          });
                        },
                        child: Icon(
                          _showSatellite ? Icons.map_outlined : Icons.public,
                          size: 20,
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Locate Me Button
                      FloatingActionButton.small(
                        heroTag: 'map_locate_me',
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        elevation: 3,
                        onPressed: _isLocating ? null : _centerUserLocation,
                        child: _isLocating
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(Icons.my_location, size: 20),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Geofence Radius Selection Bar
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Geofence Radius',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF334155),
                      ),
                    ),
                    Text(
                      '${_selectedRadius.round()} meters',
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF16A34A),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),

                // Radius Chips
                Row(
                  children: _presetRadii.map((radius) {
                    final isSelected = _selectedRadius == radius;
                    return Expanded(
                      child: Container(
                        margin: const EdgeInsets.symmetric(horizontal: 2),
                        child: ChoiceChip(
                          label: Text('${radius.round()}m'),
                          labelStyle: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                            color: isSelected ? Colors.white : const Color(0xFF475569),
                          ),
                          selected: isSelected,
                          selectedColor: const Color(0xFF16A34A),
                          backgroundColor: const Color(0xFFF1F5F9),
                          showCheckmark: false,
                          padding: EdgeInsets.zero,
                          onSelected: (_) {
                            setState(() {
                              _selectedRadius = radius;
                            });
                          },
                        ),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 12),

                // Confirm Location Button
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton.icon(
                    onPressed: () {
                      Navigator.pop(
                        context,
                        MapLocationResult(
                          latitude: _mapCenter.latitude,
                          longitude: _mapCenter.longitude,
                          radius: _selectedRadius,
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF16A34A),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                    icon: const Icon(Icons.check_circle_outline, size: 20),
                    label: const Text(
                      'Confirm & Set Location',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
