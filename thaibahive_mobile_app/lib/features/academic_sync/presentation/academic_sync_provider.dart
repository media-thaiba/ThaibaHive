import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../data/academic_sync_repository.dart';
import '../domain/academic_schedule_model.dart';

final academicSyncRepositoryProvider = Provider<AcademicSyncRepository>((ref) {
  return AcademicSyncRepository();
});

final weeklyTimetableProvider =
    FutureProvider.autoDispose<List<MobileTimetableSlot>>((ref) async {
  final repo = ref.watch(academicSyncRepositoryProvider);
  return repo.syncSchedule();
});

class AcademicSyncState {
  final bool isSyncing;
  final String? lastSyncTime;
  final String? errorMessage;
  final List<MobileTimetableSlot> schedule;

  const AcademicSyncState({
    this.isSyncing = false,
    this.lastSyncTime,
    this.errorMessage,
    this.schedule = const [],
  });

  AcademicSyncState copyWith({
    bool? isSyncing,
    String? lastSyncTime,
    String? errorMessage,
    List<MobileTimetableSlot>? schedule,
  }) {
    return AcademicSyncState(
      isSyncing: isSyncing ?? this.isSyncing,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      errorMessage: errorMessage,
      schedule: schedule ?? this.schedule,
    );
  }
}

class AcademicSyncNotifier extends StateNotifier<AcademicSyncState> {
  final AcademicSyncRepository _repository;

  AcademicSyncNotifier(this._repository) : super(const AcademicSyncState()) {
    loadSchedule();
  }

  Future<void> loadSchedule() async {
    state = state.copyWith(isSyncing: true, errorMessage: null);
    try {
      final slots = await _repository.syncSchedule();
      state = state.copyWith(
        isSyncing: false,
        schedule: slots,
        lastSyncTime: DateTime.now().toIso8601String(),
      );
    } catch (e) {
      state = state.copyWith(
        isSyncing: false,
        errorMessage: e.toString(),
      );
    }
  }
}

final academicSyncStateNotifierProvider =
    StateNotifierProvider<AcademicSyncNotifier, AcademicSyncState>((ref) {
  final repo = ref.watch(academicSyncRepositoryProvider);
  return AcademicSyncNotifier(repo);
});
