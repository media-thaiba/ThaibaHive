import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/recognition_model.dart';

final recognitionRepositoryProvider =
    Provider<RecognitionRepository>((ref) {
  return RecognitionRepository(ref.watch(apiClientProvider));
});

class RecognitionRepository {
  final ApiClient _api;

  RecognitionRepository(this._api);

  Future<List<RecognitionModel>> getRecognitions({
    String? type,
    int page = 1,
  }) async {
    final params = <String, dynamic>{'page': page};
    if (type != null && type.isNotEmpty && type != 'all') {
      params['type'] = type;
    }
    final data = await _api.get(
      '/recognition',
      queryParameters: params,
      fromJson: (json) {
        final list = (json is Map ? (json['recognitions'] ?? json['data'] ?? json) : json)
            as List<dynamic>? ?? [];
        return list
            .map((e) =>
                RecognitionModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<RecognitionModel> createRecognition(Map<String, dynamic> data) async {
    return _api.post(
      '/recognition',
      data: data,
      fromJson: (json) =>
          RecognitionModel.fromJson(json as Map<String, dynamic>),
    );
  }
}
