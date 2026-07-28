import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nfc_manager/nfc_manager.dart';

import '../../../core/services/location_service.dart';
import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/admin_nfc_provider.dart';
import '../data/admin_provider.dart';

class NfcTagManagementScreen extends ConsumerStatefulWidget {
  const NfcTagManagementScreen({super.key});

  @override
  ConsumerState<NfcTagManagementScreen> createState() =>
      _NfcTagManagementScreenState();
}

class _NfcTagManagementScreenState
    extends ConsumerState<NfcTagManagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isNfcAvailable = true;
  String? _scannedTagId;
  
  // Form selections
  String? _selectedStaffId;
  String? _selectedStaffName;
  String? _selectedLocationId;
  String? _selectedLocationName;
  String? _selectedInstitutionId;

  // Location checkpoint controllers
  late TextEditingController _locationNameController;
  late TextEditingController _latController;
  late TextEditingController _lonController;
  late TextEditingController _radiusController;
  String? _scannedLocationTagId;
  bool _isFetchingGps = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _locationNameController = TextEditingController();
    _latController = TextEditingController();
    _lonController = TextEditingController();
    _radiusController = TextEditingController(text: '50');
    _checkNfcAvailability();
    Future.microtask(() {
      ref.read(adminProvider.notifier).loadAll();
      ref.read(adminNfcProvider.notifier).fetchLocations();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _locationNameController.dispose();
    _latController.dispose();
    _lonController.dispose();
    _radiusController.dispose();
    _stopNfcSession();
    super.dispose();
  }

  Future<void> _checkNfcAvailability() async {
    try {
      final isAvailable = await NfcManager.instance.isAvailable();
      if (mounted) {
        setState(() {
          _isNfcAvailable = isAvailable;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isNfcAvailable = false;
        });
      }
    }
  }

  Future<void> _startNfcScanning({required Function(String tagId) onTagScanned}) async {
    final notifier = ref.read(adminNfcProvider.notifier);
    notifier.setScanning(true);

    try {
      await NfcManager.instance.stopSession().catchError((_) {});
      await NfcManager.instance.startSession(
        onDiscovered: (NfcTag tag) async {
          final tagId = _extractTagId(tag);
          await NfcManager.instance.stopSession();
          notifier.setScanning(false);
          if (mounted && tagId != null) {
            onTagScanned(tagId);
          }
        },
        onError: (error) async {
          notifier.setScanning(false);
          debugPrint('[NFC Admin] Session error: $error');
        },
      );
    } catch (e) {
      notifier.setScanning(false);
      debugPrint('[NFC Admin] Start session failed: $e');
    }
  }

  Future<void> _stopNfcSession() async {
    try {
      await NfcManager.instance.stopSession();
    } catch (_) {}
    ref.read(adminNfcProvider.notifier).setScanning(false);
  }

  String? _extractTagId(NfcTag tag) {
    try {
      final ndef = Ndef.from(tag);
      if (ndef != null && ndef.cachedMessage != null && ndef.cachedMessage!.records.isNotEmpty) {
        final payload = String.fromCharCodes(ndef.cachedMessage!.records.first.payload);
        if (payload.trim().isNotEmpty) return payload.trim();
      }

      // Fallback to raw handle or identifier
      final data = tag.data;
      if (data.containsKey('isodep')) {
        final identifier = (data['isodep'] as Map)['identifier'];
        if (identifier != null) return (identifier as List).map((e) => e.toRadixString(16).padLeft(2, '0')).join('').toUpperCase();
      }
      if (data.containsKey('nfca')) {
        final identifier = (data['nfca'] as Map)['identifier'];
        if (identifier != null) return (identifier as List).map((e) => e.toRadixString(16).padLeft(2, '0')).join('').toUpperCase();
      }
      if (data.containsKey('mifare')) {
        final identifier = (data['mifare'] as Map)['identifier'];
        if (identifier != null) return (identifier as List).map((e) => e.toRadixString(16).padLeft(2, '0')).join('').toUpperCase();
      }
      return tag.handle;
    } catch (e) {
      return tag.handle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(adminNfcProvider);
    final theme = Theme.of(context);

    return AppScaffold(
      title: 'NFC Tag Management',
      showBack: true,
      bottom: TabBar(
        controller: _tabController,
        tabs: const [
          Tab(icon: Icon(Icons.search_rounded), text: 'Identify'),
          Tab(icon: Icon(Icons.badge_rounded), text: 'Staff Card'),
          Tab(icon: Icon(Icons.place_rounded), text: 'Location'),
        ],
      ),
      body: Column(
        children: [
          if (!_isNfcAvailable)
            Container(
              color: Colors.amber.shade100,
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.amber),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'NFC hardware is disabled or unavailable on this device.',
                      style: TextStyle(color: Colors.amber.shade900, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          if (state.error != null)
            Container(
              color: Colors.red.shade100,
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.error_outline_rounded, color: Colors.red),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.error!,
                      style: TextStyle(color: Colors.red.shade900, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          if (state.successMessage != null)
            Container(
              color: Colors.green.shade100,
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  const Icon(Icons.check_circle_outline_rounded, color: Colors.green),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      state.successMessage!,
                      style: TextStyle(color: Colors.green.shade900, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildIdentifyTab(theme, state),
                _buildStaffTab(theme, state),
                _buildLocationTab(theme, state),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── TAB 1: IDENTIFY TAG ───
  Widget _buildIdentifyTab(ThemeData theme, AdminNfcState state) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Icon(
                  state.isScanning ? Icons.nfc_rounded : Icons.contactless_outlined,
                  size: 64,
                  color: state.isScanning ? theme.primaryColor : Colors.grey,
                ),
                const SizedBox(height: 16),
                Text(
                  state.isScanning ? 'Hold NFC tag against back of phone' : 'Tap to scan and identify any NFC tag',
                  textAlign: TextAlign.center,
                  style: theme.textTheme.titleMedium,
                ),
                const SizedBox(height: 20),
                FilledButton.icon(
                  onPressed: state.isScanning
                      ? _stopNfcSession
                      : () {
                          _startNfcScanning(onTagScanned: (tagId) async {
                            setState(() => _scannedTagId = tagId);
                            await ref.read(adminNfcProvider.notifier).lookupTag(tagId);
                          });
                        },
                  icon: Icon(state.isScanning ? Icons.stop_rounded : Icons.nfc_rounded),
                  label: Text(state.isScanning ? 'Cancel Scanning' : 'Tap to Scan'),
                ),
              ],
            ),
          ),
        ),
        if (_scannedTagId != null) ...[
          const SizedBox(height: 16),
          Text('Scanned Tag ID: $_scannedTagId',
              style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
        ],
        if (state.isLoading) const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator())),
        if (state.lookupResult != null) _buildLookupCard(theme, state.lookupResult!),
      ],
    );
  }

  Widget _buildLookupCard(ThemeData theme, Map<String, dynamic> result) {
    final isBound = result['isBound'] == true;
    final isSameTenant = result['isSameTenant'] == true;
    final owner = result['owner'] as Map<String, dynamic>?;

    if (!isBound) {
      return Card(
        margin: const EdgeInsets.only(top: 16),
        color: Colors.green.shade50,
        child: const ListTile(
          leading: Icon(Icons.check_circle_rounded, color: Colors.green),
          title: Text('Unassigned Tag', style: TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text('This NFC tag is clear and ready to be assigned.'),
        ),
      );
    }

    if (!isSameTenant) {
      return Card(
        margin: const EdgeInsets.only(top: 16),
        color: Colors.orange.shade50,
        child: const ListTile(
          leading: Icon(Icons.shield_outlined, color: Colors.orange),
          title: Text('External Organization Tag', style: TextStyle(fontWeight: FontWeight.bold)),
          subtitle: Text('This NFC tag is registered to another organization. Cross-tenant modification is restricted.'),
        ),
      );
    }

    return Card(
      margin: const EdgeInsets.only(top: 16),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: owner?['type'] == 'staff' ? Colors.blue.shade100 : Colors.purple.shade100,
          child: Icon(
            owner?['type'] == 'staff' ? Icons.person_rounded : Icons.place_rounded,
            color: owner?['type'] == 'staff' ? Colors.blue : Colors.purple,
          ),
        ),
        title: Text(owner?['name'] ?? 'Assigned Owner', style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text('${owner?['type'] == 'staff' ? 'Staff Card' : 'Location Checkpoint'}${owner?['employeeId'] != null ? ' · ID: ${owner!['employeeId']}' : ''}'),
        trailing: IconButton(
          icon: const Icon(Icons.link_off_rounded, color: Colors.red),
          onPressed: () => _confirmUnbind(owner?['type'] ?? 'staff', owner?['id'] ?? '', owner?['name'] ?? ''),
        ),
      ),
    );
  }

  // ─── TAB 2: REGISTER STAFF CARD ───
  Widget _buildStaffTab(ThemeData theme, AdminNfcState state) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Assign NFC Card to Staff Member', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(
            labelText: 'Search / Select Staff Member ID',
            hintText: 'Enter staff UUID or select below',
            prefixIcon: Icon(Icons.search_rounded),
          ),
          onChanged: (v) {
            setState(() {
              _selectedStaffId = v.trim();
              _selectedStaffName = 'Staff ID: ${v.trim()}';
            });
          },
        ),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                Icon(
                  state.isScanning ? Icons.nfc_rounded : Icons.badge_outlined,
                  size: 56,
                  color: state.isScanning ? theme.primaryColor : Colors.blue,
                ),
                const SizedBox(height: 12),
                Text(
                  _selectedStaffId == null || _selectedStaffId!.isEmpty
                      ? 'Please select or enter a Staff Member ID first'
                      : 'Ready to scan card for selected staff',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: (_selectedStaffId == null || _selectedStaffId!.isEmpty)
                      ? null
                      : () {
                          _startNfcScanning(onTagScanned: (tagId) {
                            _processAssignment('staff', _selectedStaffId!, tagId, _selectedStaffName ?? '');
                          });
                        },
                  icon: Icon(state.isScanning ? Icons.stop_rounded : Icons.nfc_rounded),
                  label: Text(state.isScanning ? 'Cancel Scanning' : 'Scan Staff Card'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ─── TAB 3: REGISTER LOCATION & GEOFENCE RADIUS ───
  Widget _buildLocationTab(ThemeData theme, AdminNfcState state) {
    final adminState = ref.watch(adminProvider);

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // ── Card 1: Register New Checkpoint NFC Tag ──
        Card(
          elevation: 2,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.purple.shade50,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.add_location_alt_rounded, color: Colors.purple),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Register NFC Checkpoint', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                          Text('Set Tag Name, Geofence Radius & GPS Location', style: theme.textTheme.bodySmall?.copyWith(color: Colors.grey.shade600)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Tag / Checkpoint Name
                TextField(
                  controller: _locationNameController,
                  decoration: const InputDecoration(
                    labelText: 'Checkpoint / Tag Name *',
                    hintText: 'e.g. Main Gate NFC Checkpoint',
                    prefixIcon: Icon(Icons.label_outline_rounded),
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),

                // Institution Dropdown
                if (adminState.institutions.isNotEmpty) ...[
                  DropdownButtonFormField<String>(
                    value: _selectedInstitutionId,
                    decoration: const InputDecoration(
                      labelText: 'Institution (Optional)',
                      prefixIcon: Icon(Icons.account_balance_outlined),
                      border: OutlineInputBorder(),
                    ),
                    items: adminState.institutions.map((inst) {
                      return DropdownMenuItem(value: inst.id, child: Text(inst.name));
                    }).toList(),
                    onChanged: (val) => setState(() => _selectedInstitutionId = val),
                  ),
                  const SizedBox(height: 12),
                ],

                // NFC Scanning Section
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _scannedLocationTagId != null ? Colors.purple.shade50 : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _scannedLocationTagId != null ? Colors.purple.shade300 : Colors.grey.shade300,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        state.isScanning ? Icons.nfc_rounded : Icons.contactless_outlined,
                        color: state.isScanning ? theme.primaryColor : (_scannedLocationTagId != null ? Colors.purple : Colors.grey),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          _scannedLocationTagId != null
                              ? 'Scanned Tag ID: $_scannedLocationTagId'
                              : (state.isScanning ? 'Hold NFC tag against back of phone...' : 'No NFC tag scanned yet'),
                          style: TextStyle(
                            fontWeight: _scannedLocationTagId != null ? FontWeight.bold : FontWeight.normal,
                            color: _scannedLocationTagId != null ? Colors.purple.shade900 : Colors.grey.shade800,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: state.isScanning
                            ? _stopNfcSession
                            : () {
                                _startNfcScanning(onTagScanned: (tagId) {
                                  setState(() => _scannedLocationTagId = tagId);
                                });
                              },
                        icon: Icon(state.isScanning ? Icons.stop_rounded : Icons.nfc_rounded, size: 18),
                        label: Text(state.isScanning ? 'Cancel' : 'Scan Tag'),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Geofence Radius Options
                Text('Geofence Radius (meters)', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  children: ['25', '50', '100', '200', '500'].map((r) {
                    final isSelected = _radiusController.text == r;
                    return ChoiceChip(
                      label: Text('${r}m'),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) setState(() => _radiusController.text = r);
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _radiusController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Custom Radius (meters)',
                    suffixText: 'meters',
                    prefixIcon: Icon(Icons.radar_rounded),
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 16),

                // GPS Location Section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Geolocation Coordinates', style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.bold)),
                    OutlinedButton.icon(
                      onPressed: _isFetchingGps ? null : _fetchGpsLocation,
                      icon: _isFetchingGps
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.my_location_rounded, size: 18),
                      label: Text(_isFetchingGps ? 'Fetching GPS...' : 'Use Current GPS'),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _latController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(
                          labelText: 'Latitude',
                          hintText: 'e.g. 11.258753',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _lonController,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                        decoration: const InputDecoration(
                          labelText: 'Longitude',
                          hintText: 'e.g. 75.780412',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: (state.isLoading || _locationNameController.text.trim().isEmpty || _scannedLocationTagId == null)
                        ? null
                        : _submitCreateLocationTag,
                    icon: const Icon(Icons.save_rounded),
                    label: const Text('Register Checkpoint Tag'),
                  ),
                ),
              ],
            ),
          ),
        ),

        const SizedBox(height: 24),

        // ── Section 2: Registered Locations & Geofence Radius Editor ──
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Registered Checkpoints (${state.locations.length})',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: () => ref.read(adminNfcProvider.notifier).fetchLocations(),
            ),
          ],
        ),
        const SizedBox(height: 8),

        if (state.locations.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Text('No location checkpoints registered yet.', style: TextStyle(color: Colors.grey.shade600)),
              ),
            ),
          )
        else
          ...state.locations.map((loc) => _buildLocationCard(theme, loc)),
      ],
    );
  }

  Future<void> _fetchGpsLocation() async {
    setState(() => _isFetchingGps = true);
    final pos = await locationService.getCurrentLocation();
    if (mounted) {
      setState(() {
        _isFetchingGps = false;
        if (pos != null) {
          _latController.text = pos.latitude.toStringAsFixed(6);
          _lonController.text = pos.longitude.toStringAsFixed(6);
        }
      });
    }
  }

  Future<void> _submitCreateLocationTag() async {
    final name = _locationNameController.text.trim();
    final tagId = _scannedLocationTagId;
    if (name.isEmpty || tagId == null) return;

    final lat = double.tryParse(_latController.text);
    final lon = double.tryParse(_lonController.text);
    final radius = double.tryParse(_radiusController.text) ?? 50.0;

    final success = await ref.read(adminNfcProvider.notifier).createLocationTag(
      name: name,
      nfcTagId: tagId,
      latitude: lat,
      longitude: lon,
      radius: radius,
      institutionId: _selectedInstitutionId,
    );

    if (success && mounted) {
      setState(() {
        _locationNameController.clear();
        _latController.clear();
        _lonController.clear();
        _radiusController.text = '50';
        _scannedLocationTagId = null;
      });
    }
  }

  Widget _buildLocationCard(ThemeData theme, Map<String, dynamic> loc) {
    final name = loc['name'] as String? ?? 'Unnamed Checkpoint';
    final nfcTagId = loc['nfcTagId'] as String?;
    final lat = loc['latitude'];
    final lon = loc['longitude'];
    final radius = loc['radius'] ?? 50;
    final locId = loc['id'] as String;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.purple.shade100,
                  child: const Icon(Icons.place_rounded, color: Colors.purple),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      if (nfcTagId != null && nfcTagId.isNotEmpty)
                        Text('NFC Tag: $nfcTagId', style: const TextStyle(color: Colors.purple, fontWeight: FontWeight.bold, fontSize: 12))
                      else
                        const Text('No NFC Tag Bound', style: TextStyle(color: Colors.orange, fontSize: 12)),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.edit_location_alt_rounded, color: Colors.blue),
                  tooltip: 'Edit Radius & Location',
                  onPressed: () => _showEditLocationDialog(loc),
                ),
                IconButton(
                  icon: const Icon(Icons.delete_outline_rounded, color: Colors.red),
                  tooltip: 'Unbind / Delete',
                  onPressed: () => _confirmUnbind('location', locId, name),
                ),
              ],
            ),
            const Divider(),
            Row(
              children: [
                Chip(
                  avatar: const Icon(Icons.radar_rounded, size: 16),
                  label: Text('Radius: ${radius}m'),
                  backgroundColor: Colors.purple.shade50,
                  side: BorderSide.none,
                ),
                const SizedBox(width: 8),
                if (lat != null && lon != null)
                  Expanded(
                    child: Text(
                      'GPS: $lat, $lon',
                      style: TextStyle(color: Colors.grey.shade700, fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  )
                else
                  Text('No GPS Coordinates Set', style: TextStyle(color: Colors.grey.shade500, fontSize: 12)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _showEditLocationDialog(Map<String, dynamic> loc) {
    final locId = loc['id'] as String;
    final editNameController = TextEditingController(text: loc['name'] as String? ?? '');
    final editRadiusController = TextEditingController(text: (loc['radius'] ?? 50).toString());
    final editLatController = TextEditingController(text: loc['latitude']?.toString() ?? '');
    final editLonController = TextEditingController(text: loc['longitude']?.toString() ?? '');
    bool isFetching = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Edit Geofence & Checkpoint', style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                      IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(ctx)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: editNameController,
                    decoration: const InputDecoration(
                      labelText: 'Checkpoint Tag Name',
                      prefixIcon: Icon(Icons.label_outlined),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Geofence Radius (meters)', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey.shade800)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 8,
                    children: ['25', '50', '100', '200', '500'].map((r) {
                      final isSelected = editRadiusController.text == r;
                      return ChoiceChip(
                        label: Text('${r}m'),
                        selected: isSelected,
                        onSelected: (selected) {
                          if (selected) setModalState(() => editRadiusController.text = r);
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: editRadiusController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(
                      labelText: 'Geofence Radius (meters)',
                      suffixText: 'meters',
                      prefixIcon: Icon(Icons.radar_rounded),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('GPS Coordinates', style: TextStyle(fontWeight: FontWeight.bold)),
                      OutlinedButton.icon(
                        onPressed: isFetching
                            ? null
                            : () async {
                                setModalState(() => isFetching = true);
                                final pos = await locationService.getCurrentLocation();
                                if (pos != null) {
                                  editLatController.text = pos.latitude.toStringAsFixed(6);
                                  editLonController.text = pos.longitude.toStringAsFixed(6);
                                }
                                setModalState(() => isFetching = false);
                              },
                        icon: isFetching
                            ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.my_location_rounded, size: 16),
                        label: Text(isFetching ? 'Fetching...' : 'Update GPS'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: editLatController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          decoration: const InputDecoration(labelText: 'Latitude', border: OutlineInputBorder()),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: editLonController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
                          decoration: const InputDecoration(labelText: 'Longitude', border: OutlineInputBorder()),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () async {
                        final radiusVal = double.tryParse(editRadiusController.text);
                        final latVal = double.tryParse(editLatController.text);
                        final lonVal = double.tryParse(editLonController.text);

                        Navigator.pop(ctx);
                        await ref.read(adminNfcProvider.notifier).updateLocationTag(
                          locationId: locId,
                          name: editNameController.text.trim(),
                          radius: radiusVal,
                          latitude: latVal,
                          longitude: lonVal,
                        );
                      },
                      icon: const Icon(Icons.save_rounded),
                      label: const Text('Save Geofence Changes'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _processAssignment(String type, String targetId, String tagId, String targetName) async {
    final notifier = ref.read(adminNfcProvider.notifier);
    
    // First lookup tag to check collisions
    final lookup = await notifier.lookupTag(tagId);
    if (!mounted) return;

    if (lookup != null && lookup['isBound'] == true) {
      if (lookup['isSameTenant'] == false) {
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Restricted Tag'),
            content: const Text('This physical NFC tag is registered to another organization. Cross-tenant assignment is prohibited.'),
            actions: [TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('OK'))],
          ),
        );
        return;
      }

      final owner = lookup['owner'] as Map<String, dynamic>?;
      final currentOwnerId = owner?['id'] as String?;
      final currentOwnerName = owner?['name'] as String? ?? 'Another owner';

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Confirm Tag Reassignment'),
          content: Text('This NFC tag is currently assigned to "$currentOwnerName". Reassign it to "$targetName"?'),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
            FilledButton(
              onPressed: () async {
                Navigator.of(ctx).pop();
                await notifier.assignTag(
                  type: type,
                  targetId: targetId,
                  nfcTagId: tagId,
                  forceReassign: true,
                  expectedCurrentOwnerId: currentOwnerId,
                );
              },
              child: const Text('Reassign'),
            ),
          ],
        ),
      );
      return;
    }

    // Direct assignment
    await notifier.assignTag(
      type: type,
      targetId: targetId,
      nfcTagId: tagId,
      forceReassign: false,
    );
  }

  void _confirmUnbind(String type, String targetId, String name) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Unbind NFC Tag'),
        content: Text('Are you sure you want to unbind the NFC tag from "$name"?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () async {
              Navigator.of(ctx).pop();
              await ref.read(adminNfcProvider.notifier).unbindTag(type: type, targetId: targetId);
            },
            child: const Text('Unbind'),
          ),
        ],
      ),
    );
  }
}
