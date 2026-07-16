import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/availability_model.dart';

import 'availability_repository.dart';

class AvailabilityState {
  final List<StaffAvailabilityModel> teamAvailability;
  final bool isLoading;
  final String? error;

  const AvailabilityState({
    this.teamAvailability = const [],
    this.isLoading = false,
    this.error,
  });

  AvailabilityState copyWith({
    List<StaffAvailabilityModel>? teamAvailability,
    bool? isLoading,
    String? error,
  }) =>
      AvailabilityState(
        teamAvailability: teamAvailability ?? this.teamAvailability,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AvailabilityNotifier extends StateNotifier<AvailabilityState> {
  final AvailabilityRepository _repository;

  AvailabilityNotifier(this._repository) : super(const AvailabilityState());

  Future<void> loadAvailability() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await _repository.getAvailability();
      state = state.copyWith(teamAvailability: data, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> updateMyAvailability(String status, {String? note}) async {
    try {
      await _repository.updateAvailability({
        'status': status,
        'note': note,
      });
      await loadAvailability();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final availabilityProvider =
    StateNotifierProvider<AvailabilityNotifier, AvailabilityState>((ref) {
  final repo = ref.read(availabilityRepositoryProvider);
  return AvailabilityNotifier(repo);
});
