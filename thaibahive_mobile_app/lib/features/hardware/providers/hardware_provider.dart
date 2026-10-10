import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/hardware_models.dart';
import '../services/hardware_service.dart';

final hardwareZonesProvider =
    FutureProvider.autoDispose<List<HardwareZoneModel>>((ref) async {
  final service = ref.watch(hardwareServiceProvider);
  return service.getZones();
});

final musterSummaryProvider =
    FutureProvider.autoDispose<MusterSummaryModel?>((ref) async {
  final service = ref.watch(hardwareServiceProvider);
  return service.getMusterSummary();
});

class PatrolState {
  final List<PatrolCheckpointScan> recentScans;
  final bool isScanning;
  final String? lastError;

  const PatrolState({
    this.recentScans = const [],
    this.isScanning = false,
    this.lastError,
  });

  PatrolState copyWith({
    List<PatrolCheckpointScan>? recentScans,
    bool? isScanning,
    String? lastError,
  }) {
    return PatrolState(
      recentScans: recentScans ?? this.recentScans,
      isScanning: isScanning ?? this.isScanning,
      lastError: lastError,
    );
  }
}

final patrolNotifierProvider =
    StateNotifierProvider<PatrolNotifier, PatrolState>((ref) {
  final service = ref.watch(hardwareServiceProvider);
  return PatrolNotifier(service);
});

class PatrolNotifier extends StateNotifier<PatrolState> {
  final HardwareService _service;

  PatrolNotifier(this._service) : super(const PatrolState());

  Future<bool> scanCheckpoint({
    required String checkpointId,
    required String zoneId,
    required String zoneName,
    required String deviceId,
    String method = 'nfc',
  }) async {
    state = state.copyWith(isScanning: true, lastError: null);

    final now = DateTime.now().toIso8601String();
    final success = await _service.recordPatrolCheckpoint(
      checkpointId: checkpointId,
      zoneId: zoneId,
      deviceId: deviceId,
      method: method,
    );

    final scan = PatrolCheckpointScan(
      checkpointId: checkpointId,
      zoneName: zoneName,
      scannedAt: now,
      method: method,
      synced: success,
    );

    state = state.copyWith(
      isScanning: false,
      recentScans: [scan, ...state.recentScans],
      lastError: success ? null : 'Failed to sync scan immediately (queued)',
    );

    return success;
  }
}
