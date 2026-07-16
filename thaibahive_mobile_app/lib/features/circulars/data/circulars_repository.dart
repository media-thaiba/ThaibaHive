import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/circular_model.dart';

final circularsRepositoryProvider = Provider<CircularsRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return CircularsRepository(apiClient);
});

class CircularsRepository {
  final ApiClient _apiClient;

  CircularsRepository(this._apiClient);

  Future<List<CircularModel>> getCirculars({int page = 1}) async {
    final response =
        await _apiClient.get('/circulars', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => CircularModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => CircularModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<CircularModel> createCircular(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/circulars', data: data);
    return CircularModel.fromJson(response as Map<String, dynamic>);
  }
}
