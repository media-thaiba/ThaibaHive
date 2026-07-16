import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';
import 'attendance_repository.dart';

class AttendanceState {
  final bool isLoading;
  final String? error;
  final AttendanceStatsModel? stats;
  final List<AttendanceLogModel> logs;
  final AttendanceLogModel? lastAction;

  const AttendanceState({
    this.isLoading = false,
    this.error,
    this.stats,
    this.logs = const [],
    this.lastAction,
  });

  AttendanceState copyWith({
    bool? isLoading,
    String? error,
    AttendanceStatsModel? stats,
    List<AttendanceLogModel>? logs,
    AttendanceLogModel? lastAction,
  }) {
    return AttendanceState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      stats: stats ?? this.stats,
      logs: logs ?? this.logs,
      lastAction: lastAction ?? this.lastAction,
    );
  }
}

class AttendanceNotifier extends StateNotifier<AttendanceState> {
  final AttendanceRepository _repository;

  AttendanceNotifier(this._repository) : super(const AttendanceState()) {
    refresh();
  }

  Future<void> refresh() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repository.getStats(),
        _repository.getMyAttendance(limit: 10),
      ]);
      state = AttendanceState(
        stats: results[0] as AttendanceStatsModel,
        logs: results[1] as List<AttendanceLogModel>,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load attendance data: $e',
      );
    }
  }

  Future<void> checkIn({
    String method = 'manual',
    String? nfcTagId,
    String? qrCode,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final result = await _repository.checkIn(
        method: method,
        nfcTagId: nfcTagId,
        qrCode: qrCode,
        latitude: latitude,
        longitude: longitude,
      );
      await refresh();
      state = state.copyWith(lastAction: result);
    } catch (e) {
      state = state.copyWith(error: 'Check-in failed: $e');
    }
  }

  Future<void> checkOut() async {
    try {
      final result = await _repository.checkOut();
      await refresh();
      state = state.copyWith(lastAction: result);
    } catch (e) {
      state = state.copyWith(error: 'Check-out failed: $e');
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final attendanceProvider =
    StateNotifierProvider<AttendanceNotifier, AttendanceState>((ref) {
  return AttendanceNotifier(ref.watch(attendanceRepositoryProvider));
});
