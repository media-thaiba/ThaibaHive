import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/department_model.dart';
import '../../../models/staff_model.dart';
import 'staff_repository.dart';

final staffSearchProvider = StateProvider<String>((ref) => '');
final staffDepartmentFilterProvider = StateProvider<String>((ref) => '');

final staffListProvider =
    AsyncNotifierProvider<StaffListNotifier, List<StaffModel>>(
  StaffListNotifier.new,
);

class StaffListNotifier extends AsyncNotifier<List<StaffModel>> {
  @override
  Future<List<StaffModel>> build() async {
    final search = ref.watch(staffSearchProvider);
    final department = ref.watch(staffDepartmentFilterProvider);
    final repo = ref.watch(staffRepositoryProvider);
    return repo.getStaff(
      search: search.isNotEmpty ? search : null,
      department: department.isNotEmpty ? department : null,
    );
  }

  Future<void> refresh() async {
    final repo = ref.watch(staffRepositoryProvider);
    final search = ref.read(staffSearchProvider);
    final department = ref.read(staffDepartmentFilterProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getStaff(
          search: search.isNotEmpty ? search : null,
          department: department.isNotEmpty ? department : null,
        ));
  }
}

final staffDepartmentsProvider = FutureProvider<List<DepartmentModel>>((ref) async {
  final repo = ref.watch(staffRepositoryProvider);
  return repo.getDepartments();
});

final staffProfileProvider =
    FutureProvider.family<StaffModel, String>((ref, id) async {
  final repo = ref.watch(staffRepositoryProvider);
  return repo.getStaffById(id);
});
