import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/visitor_model.dart';

final visitorsRepositoryProvider = Provider<VisitorsRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return VisitorsRepository(apiClient);
});

class VisitorsRepository {
  final ApiClient _apiClient;

  VisitorsRepository(this._apiClient);

  Future<List<VisitorModel>> getVisitors({int page = 1}) async {
    final response =
        await _apiClient.get('/visitors', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => VisitorModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => VisitorModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<VisitorModel> createVisitor(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/visitors', data: data);
    return VisitorModel.fromJson(response as Map<String, dynamic>);
  }

  Future<VisitorModel> updateVisitor(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/visitors/$id', data: data);
    return VisitorModel.fromJson(response as Map<String, dynamic>);
  }
}
