import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/grievance_model.dart';

import 'grievances_repository.dart';

class GrievancesState {
  final List<GrievanceModel> grievances;
  final bool isLoading;
  final String? error;

  const GrievancesState({
    this.grievances = const [],
    this.isLoading = false,
    this.error,
  });

  GrievancesState copyWith({
    List<GrievanceModel>? grievances,
    bool? isLoading,
    String? error,
  }) =>
      GrievancesState(
        grievances: grievances ?? this.grievances,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class GrievancesNotifier extends StateNotifier<GrievancesState> {
  final GrievancesRepository _repository;

  GrievancesNotifier(this._repository) : super(const GrievancesState());

  Future<void> loadGrievances() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final grievances = await _repository.getGrievances();
      state = state.copyWith(grievances: grievances, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> submitGrievance(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.submitGrievance(data);
      await loadGrievances();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateGrievance(String id, Map<String, dynamic> data) async {
    try {
      await _repository.updateGrievance(id, data);
      await loadGrievances();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final grievancesProvider =
    StateNotifierProvider<GrievancesNotifier, GrievancesState>((ref) {
  final repo = ref.read(grievancesRepositoryProvider);
  return GrievancesNotifier(repo);
});
