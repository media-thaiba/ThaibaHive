import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/institution_model.dart';
import 'package:thaibahive_mobile/models/department_model.dart';
import 'package:thaibahive_mobile/models/sub_department_model.dart';
import 'package:thaibahive_mobile/models/shift_model.dart';

import 'admin_repository.dart';

class AdminState {
  final List<InstitutionModel> institutions;
  final List<DepartmentModel> departments;
  final List<SubDepartmentModel> subDepartments;
  final List<ShiftModel> shifts;
  final bool isLoading;
  final String? error;

  const AdminState({
    this.institutions = const [],
    this.departments = const [],
    this.subDepartments = const [],
    this.shifts = const [],
    this.isLoading = false,
    this.error,
  });

  AdminState copyWith({
    List<InstitutionModel>? institutions,
    List<DepartmentModel>? departments,
    List<SubDepartmentModel>? subDepartments,
    List<ShiftModel>? shifts,
    bool? isLoading,
    String? error,
  }) =>
      AdminState(
        institutions: institutions ?? this.institutions,
        departments: departments ?? this.departments,
        subDepartments: subDepartments ?? this.subDepartments,
        shifts: shifts ?? this.shifts,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class AdminNotifier extends StateNotifier<AdminState> {
  final AdminRepository _repository;

  AdminNotifier(this._repository) : super(const AdminState());

  Future<void> loadAll() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final results = await Future.wait([
        _repository.getInstitutions(),
        _repository.getDepartments(),
        _repository.getSubDepartments(),
        _repository.getShifts(),
      ]);
      state = state.copyWith(
        institutions: results[0] as List<InstitutionModel>,
        departments: results[1] as List<DepartmentModel>,
        subDepartments: results[2] as List<SubDepartmentModel>,
        shifts: results[3] as List<ShiftModel>,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createInstitution(Map<String, dynamic> data) async {
    await _repository.createInstitution(data);
    await loadAll();
  }

  Future<void> updateInstitution(String id, Map<String, dynamic> data) async {
    await _repository.updateInstitution(id, data);
    await loadAll();
  }

  Future<void> deleteInstitution(String id) async {
    await _repository.deleteInstitution(id);
    await loadAll();
  }

  Future<void> createDepartment(Map<String, dynamic> data) async {
    await _repository.createDepartment(data);
    await loadAll();
  }

  Future<void> updateDepartment(String id, Map<String, dynamic> data) async {
    await _repository.updateDepartment(id, data);
    await loadAll();
  }

  Future<void> createShift(Map<String, dynamic> data) async {
    await _repository.createShift(data);
    await loadAll();
  }

  Future<void> updateShift(String id, Map<String, dynamic> data) async {
    await _repository.updateShift(id, data);
    await loadAll();
  }
}

final adminProvider = StateNotifierProvider<AdminNotifier, AdminState>((ref) {
  final repo = ref.read(adminRepositoryProvider);
  return AdminNotifier(repo);
});
