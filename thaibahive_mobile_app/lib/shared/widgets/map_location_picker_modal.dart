import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../../core/services/location_service.dart';

class MapLocationResult {
  final double latitude;
  final double longitude;
  final double radius;

  MapLocationResult({
    required this.latitude,
    required this.longitude,
    required this.radius,
  });
}

class MapLocationPickerModal extends StatefulWidget {
  final double initialLatitude;
  final double initialLongitude;
  final double initialRadius;
  final String title;

  const MapLocationPickerModal({
    super.key,
    required this.initialLatitude,
    required this.initialLongitude,
    this.initialRadius = 50.0,
    this.title = 'Adjust & Confirm Checkpoint Location',
  });

  static Future<MapLocationResult?> show(
    BuildContext context, {
    double? initialLatitude,
    double? initialLongitude,
    double? initialRadius,
    String? title,
  }) async {
    return showModalBottomSheet<MapLocationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => MapLocationPickerModal(
        initialLatitude: initialLatitude ?? 11.258753,
        initialLongitude: initialLongitude ?? 75.780412,
        initialRadius: initialRadius ?? 50.0,
        title: title ?? 'Adjust & Confirm Checkpoint Location',
      ),
    );
  }

  @override
  State<MapLocationPickerModal> createState() => _MapLocationPickerModalState();
}

class _MapLocationPickerModalState extends State<MapLocationPickerModal> {
  WebViewController? _controller;
  late double _currentLat;
  late double _currentLon;
  late double _currentRadius;
  bool _isFetchingGps = false;
  bool _isMapLoaded = false;

  @override
  void initState() {
    super.initState();
    _currentLat = widget.initialLatitude;
    _currentLon = widget.initialLongitude;
    _currentRadius = widget.initialRadius;
    _initMapController();
  }

  void _initMapController() {
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'LocationPicker',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = jsonDecode(message.message) as Map<String, dynamic>;
            final lat = (data['lat'] as num).toDouble();
            final lon = (data['lon'] as num).toDouble();
            setState(() {
              _currentLat = lat;
              _currentLon = lon;
            });
          } catch (_) {}
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (_) {
            if (mounted) setState(() => _isMapLoaded = true);
          },
        ),
      );

    controller.loadHtmlString(_buildLeafletHtml(_currentLat, _currentLon, _currentRadius));
    _controller = controller;
  }

  String _buildLeafletHtml(double lat, double lon, double radius) {
    return '''
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: #f8fafc; }
    .leaflet-control-attribution { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var lat = $lat;
    var lon = $lon;
    var radius = $radius;

    var map = L.map('map', { zoomControl: false }).setView([lat, lon], 16);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    var markerIcon = L.divIcon({
      className: 'custom-pin',
      html: '<div style="background-color:#16a34a;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    var marker = L.marker([lat, lon], { draggable: true, icon: markerIcon }).addTo(map);
    var circle = L.circle([lat, lon], {
      color: '#16a34a',
      fillColor: '#22c55e',
      fillOpacity: 0.25,
      weight: 2,
      radius: radius
    }).addTo(map);

    function updatePosition(newLat, newLon) {
      lat = parseFloat(newLat.toFixed(6));
      lon = parseFloat(newLon.toFixed(6));
      marker.setLatLng([lat, lon]);
      circle.setLatLng([lat, lon]);
      if (window.LocationPicker) {
        window.LocationPicker.postMessage(JSON.stringify({ lat: lat, lon: lon }));
      }
    }

    function setCircleRadius(newRadius) {
      radius = newRadius;
      circle.setRadius(radius);
    }

    function centerMap(newLat, newLon) {
      updatePosition(newLat, newLon);
      map.setView([newLat, newLon], 17);
    }

    marker.on('dragend', function(e) {
      var pos = marker.getLatLng();
      updatePosition(pos.lat, pos.lng);
    });

    map.on('click', function(e) {
      updatePosition(e.latlng.lat, e.latlng.lng);
    });
  </script>
</body>
</html>
''';
  }

  void _updateRadius(double radius) {
    setState(() {
      _currentRadius = radius;
    });
    _controller?.runJavaScript('setCircleRadius($radius);');
  }

  Future<void> _fetchCurrentGps() async {
    setState(() => _isFetchingGps = true);
    final pos = await locationService.getCurrentLocation();
    if (mounted) {
      setState(() => _isFetchingGps = false);
      if (pos != null) {
        setState(() {
          _currentLat = pos.latitude;
          _currentLon = pos.longitude;
        });
        _controller?.runJavaScript('centerMap(${pos.latitude}, ${pos.longitude});');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      height: MediaQuery.of(context).size.height * 0.88,
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF181a1d) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // ── Header Bar ──
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 16, 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF16a34a).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.map_rounded, color: Color(0xFF16a34a)),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.title,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'Drag pin or tap map to adjust checkpoint location',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // ── Live Info Bar ──
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: isDark ? const Color(0xFF22262b) : const Color(0xFFf8fafc),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Lat: ${_currentLat.toStringAsFixed(6)} | Lon: ${_currentLon.toStringAsFixed(6)}',
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isDark ? Colors.white70 : Colors.grey.shade800,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Geofence Radius: ${_currentRadius.toInt()} meters',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF16a34a),
                        ),
                      ),
                    ],
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: _isFetchingGps ? null : _fetchCurrentGps,
                  style: OutlinedButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    foregroundColor: const Color(0xFF16a34a),
                  ),
                  icon: _isFetchingGps
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.my_location_rounded, size: 16),
                  label: Text(_isFetchingGps ? 'Locating...' : 'My Location'),
                ),
              ],
            ),
          ),

          // ── Interactive Map View ──
          Expanded(
            child: Stack(
              children: [
                if (_controller != null) WebViewWidget(controller: _controller!),
                if (!_isMapLoaded)
                  Container(
                    color: isDark ? const Color(0xFF181a1d) : Colors.white,
                    child: const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: Color(0xFF16a34a)),
                          SizedBox(height: 12),
                          Text('Loading Interactive Map...'),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // ── Geofence Radius Selector & Confirm Bar ──
          Container(
            padding: EdgeInsets.fromLTRB(
              16,
              12,
              16,
              MediaQuery.of(context).padding.bottom + 12,
            ),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1e2227) : Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.08),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Adjust Geofence Radius',
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    Text(
                      '${_currentRadius.toInt()} meters',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF16a34a),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [25.0, 50.0, 100.0, 200.0, 500.0].map((r) {
                      final isSelected = _currentRadius == r;
                      return Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text('${r.toInt()}m'),
                          selected: isSelected,
                          selectedColor: const Color(0xFF16a34a).withValues(alpha: 0.2),
                          labelStyle: TextStyle(
                            color: isSelected ? const Color(0xFF16a34a) : null,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                          ),
                          onSelected: (_) => _updateRadius(r),
                        ),
                      );
                    }).toList(),
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.pop(
                        context,
                        MapLocationResult(
                          latitude: _currentLat,
                          longitude: _currentLon,
                          radius: _currentRadius,
                        ),
                      );
                    },
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFF16a34a),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    icon: const Icon(Icons.check_circle_rounded),
                    label: const Text(
                      'Confirm & Set Location',
                      style: TextStyle(
                        fontSize: 16,
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
