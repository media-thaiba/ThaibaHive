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

  /// GET /api/circulars returns `{circulars: […]}` (D14* — the old parser
  /// only handled `data`/bare lists and always yielded `[]`).
  static List<CircularModel> parseList(dynamic data) {
    final list = data is Map ? (data['circulars'] ?? data['data']) : data;
    if (list is! List) return [];
    return list
        .whereType<Map>()
        .map((e) => CircularModel.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<List<CircularModel>> getCirculars({int page = 1}) async {
    final response =
        await _apiClient.get('/circulars', queryParameters: {'page': page});
    return parseList(response);
  }

  Future<CircularModel> createCircular(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/circulars', data: data);
    return CircularModel.fromJson(response as Map<String, dynamic>);
  }
}
