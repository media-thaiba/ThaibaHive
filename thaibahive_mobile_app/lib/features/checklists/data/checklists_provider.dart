import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/checklist_model.dart';

import 'checklists_repository.dart';

class ChecklistsState {
  final List<StaffChecklistModel> assignments;
  final List<ChecklistTemplateModel> templates;
  final bool isLoading;
  final String? error;

  const ChecklistsState({
    this.assignments = const [],
    this.templates = const [],
    this.isLoading = false,
    this.error,
  });

  ChecklistsState copyWith({
    List<StaffChecklistModel>? assignments,
    List<ChecklistTemplateModel>? templates,
    bool? isLoading,
    String? error,
  }) =>
      ChecklistsState(
        assignments: assignments ?? this.assignments,
        templates: templates ?? this.templates,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class ChecklistsNotifier extends StateNotifier<ChecklistsState> {
  final ChecklistsRepository _repository;

  ChecklistsNotifier(this._repository) : super(const ChecklistsState());

  Future<void> loadAssignments() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repository.getAssignments(),
        _repository.getTemplates(),
      ]);
      state = state.copyWith(
        assignments: results[0] as List<StaffChecklistModel>,
        templates: results[1] as List<ChecklistTemplateModel>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createTemplate(Map<String, dynamic> data) async {
    try {
      await _repository.createTemplate(data);
      await loadAssignments();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }
}

final checklistsProvider =
    StateNotifierProvider<ChecklistsNotifier, ChecklistsState>((ref) {
  final repo = ref.read(checklistsRepositoryProvider);
  return ChecklistsNotifier(repo);
});
