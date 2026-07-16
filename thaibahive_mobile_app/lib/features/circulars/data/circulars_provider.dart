import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/circular_model.dart';

import 'circulars_repository.dart';

class CircularsState {
  final List<CircularModel> circulars;
  final bool isLoading;
  final String? error;

  const CircularsState({
    this.circulars = const [],
    this.isLoading = false,
    this.error,
  });

  CircularsState copyWith({
    List<CircularModel>? circulars,
    bool? isLoading,
    String? error,
  }) =>
      CircularsState(
        circulars: circulars ?? this.circulars,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class CircularsNotifier extends StateNotifier<CircularsState> {
  final CircularsRepository _repository;

  CircularsNotifier(this._repository) : super(const CircularsState());

  Future<void> loadCirculars() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final circulars = await _repository.getCirculars();
      state = state.copyWith(circulars: circulars, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createCircular(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createCircular(data);
      await loadCirculars();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }
}

final circularsProvider =
    StateNotifierProvider<CircularsNotifier, CircularsState>((ref) {
  final repo = ref.read(circularsRepositoryProvider);
  return CircularsNotifier(repo);
});
