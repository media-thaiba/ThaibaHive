import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/institution_model.dart';
import 'package:thaibahive_mobile/models/department_model.dart';
import 'package:thaibahive_mobile/models/sub_department_model.dart';
import 'package:thaibahive_mobile/models/shift_model.dart';

final adminRepositoryProvider = Provider<AdminRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return AdminRepository(apiClient);
});

class AdminRepository {
  final ApiClient _apiClient;

  AdminRepository(this._apiClient);

  Future<List<InstitutionModel>> getInstitutions() async {
    final response = await _apiClient.get('/admin/institutions');
    final data = response;
    if (data is List) {
      return data
          .map((e) => InstitutionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => InstitutionModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<InstitutionModel> createInstitution(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/admin/institutions', data: data);
    return InstitutionModel.fromJson(response as Map<String, dynamic>);
  }

  Future<InstitutionModel> updateInstitution(
      String id, Map<String, dynamic> data) async {
    final response =
        await _apiClient.put('/admin/institutions/$id', data: data);
    return InstitutionModel.fromJson(response as Map<String, dynamic>);
  }

  Future<void> deleteInstitution(String id) async {
    await _apiClient.delete('/admin/institutions/$id');
  }

  Future<List<DepartmentModel>> getDepartments() async {
    final response = await _apiClient.get('/admin/departments');
    final data = response;
    if (data is List) {
      return data
          .map((e) => DepartmentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => DepartmentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<DepartmentModel> createDepartment(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/admin/departments', data: data);
    return DepartmentModel.fromJson(response as Map<String, dynamic>);
  }

  Future<DepartmentModel> updateDepartment(
      String id, Map<String, dynamic> data) async {
    final response =
        await _apiClient.put('/admin/departments/$id', data: data);
    return DepartmentModel.fromJson(response as Map<String, dynamic>);
  }

  Future<List<SubDepartmentModel>> getSubDepartments() async {
    final response = await _apiClient.get('/admin/sub-departments');
    final data = response;
    if (data is List) {
      return data
          .map((e) => SubDepartmentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => SubDepartmentModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<ShiftModel>> getShifts() async {
    final response = await _apiClient.get('/admin/shifts');
    final data = response;
    if (data is List) {
      return data
          .map((e) => ShiftModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => ShiftModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<ShiftModel> createShift(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/admin/shifts', data: data);
    return ShiftModel.fromJson(response as Map<String, dynamic>);
  }

  Future<ShiftModel> updateShift(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/admin/shifts/$id', data: data);
    return ShiftModel.fromJson(response as Map<String, dynamic>);
  }
}
