import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/visitor_model.dart';

import 'visitors_repository.dart';

class VisitorsState {
  final List<VisitorModel> visitors;
  final bool isLoading;
  final String? error;
  final String? filter;

  const VisitorsState({
    this.visitors = const [],
    this.isLoading = false,
    this.error,
    this.filter,
  });

  VisitorsState copyWith({
    List<VisitorModel>? visitors,
    bool? isLoading,
    String? error,
    String? filter,
  }) =>
      VisitorsState(
        visitors: visitors ?? this.visitors,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        filter: filter ?? this.filter,
      );
}

class VisitorsNotifier extends StateNotifier<VisitorsState> {
  final VisitorsRepository _repository;

  VisitorsNotifier(this._repository) : super(const VisitorsState());

  Future<void> loadVisitors() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final visitors = await _repository.getVisitors();
      state = state.copyWith(visitors: visitors, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setFilter(String? filter) {
    state = state.copyWith(filter: filter);
  }

  List<VisitorModel> get filteredVisitors {
    var result = state.visitors;
    if (state.filter == 'active') {
      result = result.where((v) => v.status == 'checked_in').toList();
    } else if (state.filter == 'history') {
      result = result.where((v) => v.status == 'checked_out').toList();
    }
    return result;
  }

  Future<void> createVisitor(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createVisitor(data);
      await loadVisitors();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> checkOutVisitor(String id) async {
    try {
      await _repository.updateVisitor(id, {'status': 'checked_out', 'checked_out_at': DateTime.now().toIso8601String()});
      await loadVisitors();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final visitorsProvider =
    StateNotifierProvider<VisitorsNotifier, VisitorsState>((ref) {
  final repo = ref.read(visitorsRepositoryProvider);
  return VisitorsNotifier(repo);
});
