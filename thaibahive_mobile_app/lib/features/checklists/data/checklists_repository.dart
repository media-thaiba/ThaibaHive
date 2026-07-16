import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/checklist_model.dart';

final checklistsRepositoryProvider = Provider<ChecklistsRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return ChecklistsRepository(apiClient);
});

class ChecklistsRepository {
  final ApiClient _apiClient;

  ChecklistsRepository(this._apiClient);

  Future<List<StaffChecklistModel>> getAssignments({int page = 1}) async {
    final response = await _apiClient.get('/checklists/assignments',
        queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => StaffChecklistModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => StaffChecklistModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<ChecklistTemplateModel>> getTemplates() async {
    final response = await _apiClient.get('/checklists/templates');
    final data = response;
    if (data is List) {
      return data
          .map((e) =>
              ChecklistTemplateModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) =>
              ChecklistTemplateModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<ChecklistTemplateModel> createTemplate(Map<String, dynamic> data) async {
    final response =
        await _apiClient.post('/checklists/templates', data: data);
    return ChecklistTemplateModel.fromJson(
        response as Map<String, dynamic>);
  }
}
