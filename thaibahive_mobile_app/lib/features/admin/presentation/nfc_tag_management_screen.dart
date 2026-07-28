import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:nfc_manager/nfc_manager.dart';

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

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _checkNfcAvailability();
    Future.microtask(() => ref.read(adminProvider.notifier).loadAll());
  }

  @override
  void dispose() {
    _tabController.dispose();
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

  // ─── TAB 3: REGISTER LOCATION ───
  Widget _buildLocationTab(ThemeData theme, AdminNfcState state) {
    final adminState = ref.watch(adminProvider);
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text('Assign NFC Tag to Checkpoint Location', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        TextField(
          decoration: const InputDecoration(
            labelText: 'Location ID / Checkpoint Name',
            hintText: 'Enter location UUID',
            prefixIcon: Icon(Icons.place_outlined),
          ),
          onChanged: (v) {
            setState(() {
              _selectedLocationId = v.trim();
              _selectedLocationName = 'Location: ${v.trim()}';
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
                  state.isScanning ? Icons.nfc_rounded : Icons.add_location_alt_outlined,
                  size: 56,
                  color: state.isScanning ? theme.primaryColor : Colors.purple,
                ),
                const SizedBox(height: 12),
                Text(
                  _selectedLocationId == null || _selectedLocationId!.isEmpty
                      ? 'Please enter or select a Location ID first'
                      : 'Ready to scan checkpoint tag',
                  style: theme.textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: (_selectedLocationId == null || _selectedLocationId!.isEmpty)
                      ? null
                      : () {
                          _startNfcScanning(onTagScanned: (tagId) {
                            _processAssignment('location', _selectedLocationId!, tagId, _selectedLocationName ?? '');
                          });
                        },
                  icon: Icon(state.isScanning ? Icons.stop_rounded : Icons.nfc_rounded),
                  label: Text(state.isScanning ? 'Cancel Scanning' : 'Scan Checkpoint Tag'),
                ),
              ],
            ),
          ),
        ),
      ],
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
