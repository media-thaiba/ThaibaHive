import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/grievance_model.dart';

final grievancesRepositoryProvider = Provider<GrievancesRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return GrievancesRepository(apiClient);
});

class GrievancesRepository {
  final ApiClient _apiClient;

  GrievancesRepository(this._apiClient);

  Future<List<GrievanceModel>> getGrievances({int page = 1}) async {
    final response =
        await _apiClient.get('/grievances', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => GrievanceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => GrievanceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<GrievanceModel> submitGrievance(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/grievances', data: data);
    return GrievanceModel.fromJson(response as Map<String, dynamic>);
  }

  Future<GrievanceModel> updateGrievance(
      String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/grievances/$id', data: data);
    return GrievanceModel.fromJson(response as Map<String, dynamic>);
  }
}
