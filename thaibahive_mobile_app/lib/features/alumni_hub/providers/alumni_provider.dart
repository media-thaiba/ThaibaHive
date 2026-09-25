import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/alumni_models.dart';
import '../services/alumni_offline_vault.dart';

class AlumniState {
  final bool isLoading;
  final String? error;
  final List<MobileMentorMatch> mentorMatches;
  final List<MobileEventPass> eventPasses;
  final MobileAlumniProfile? digitalCredential;

  const AlumniState({
    this.isLoading = false,
    this.error,
    this.mentorMatches = const [],
    this.eventPasses = const [],
    this.digitalCredential,
  });

  AlumniState copyWith({
    bool? isLoading,
    String? error,
    List<MobileMentorMatch>? mentorMatches,
    List<MobileEventPass>? eventPasses,
    MobileAlumniProfile? digitalCredential,
  }) {
    return AlumniState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      mentorMatches: mentorMatches ?? this.mentorMatches,
      eventPasses: eventPasses ?? this.eventPasses,
      digitalCredential: digitalCredential ?? this.digitalCredential,
    );
  }
}

class AlumniNotifier extends StateNotifier<AlumniState> {
  final AlumniOfflineVault _vault;

  AlumniNotifier(this._vault) : super(const AlumniState()) {
    loadOfflineData();
  }

  Future<void> loadOfflineData() async {
    state = state.copyWith(isLoading: true);
    try {
      final passes = await _vault.getCachedEventPasses();
      final credential = await _vault.getCachedDigitalCredential();
      state = state.copyWith(
        isLoading: false,
        eventPasses: passes,
        digitalCredential: credential,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setMentorMatches(List<MobileMentorMatch> matches) {
    state = state.copyWith(mentorMatches: matches);
  }

  Future<void> addEventPass(MobileEventPass pass) async {
    final updated = [...state.eventPasses, pass];
    state = state.copyWith(eventPasses: updated);
    await _vault.cacheEventPasses(updated);
  }
}

final alumniOfflineVaultProvider = Provider<AlumniOfflineVault>((ref) {
  return AlumniOfflineVault();
});

final alumniProvider = StateNotifierProvider<AlumniNotifier, AlumniState>((ref) {
  final vault = ref.watch(alumniOfflineVaultProvider);
  return AlumniNotifier(vault);
});
