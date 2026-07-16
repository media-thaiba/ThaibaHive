import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/department_model.dart';
import '../../../models/staff_model.dart';

final staffRepositoryProvider = Provider<StaffRepository>((ref) {
  return StaffRepository(ref.watch(apiClientProvider));
});

class StaffRepository {
  final ApiClient _api;

  StaffRepository(this._api);

  Future<List<StaffModel>> getStaff({
    String? department,
    String? institution,
    String? search,
    int page = 1,
  }) async {
    final params = <String, dynamic>{'page': page};
    if (department != null && department.isNotEmpty) {
      params['department'] = department;
    }
    if (institution != null && institution.isNotEmpty) {
      params['institution'] = institution;
    }
    if (search != null && search.isNotEmpty) {
      params['search'] = search;
    }
    final data = await _api.get(
      '/staff',
      queryParameters: params,
      fromJson: (json) {
        final list = json['data'] as List<dynamic>;
        return list
            .map((e) => StaffModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<StaffModel> getStaffById(String id) async {
    return _api.get(
      '/staff/$id',
      fromJson: (json) => StaffModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<StaffModel> updateStaff(String id, Map<String, dynamic> data) async {
    return _api.put(
      '/staff/$id',
      data: data,
      fromJson: (json) => StaffModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<List<DepartmentModel>> getDepartments() async {
    return _api.get(
      '/departments',
      fromJson: (json) {
        final list = json['data'] as List<dynamic>;
        return list
            .map((e) => DepartmentModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
  }
}
