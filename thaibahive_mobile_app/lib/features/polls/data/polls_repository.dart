import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/poll_model.dart';

final pollsRepositoryProvider = Provider<PollsRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return PollsRepository(apiClient);
});

class PollsRepository {
  final ApiClient _apiClient;

  PollsRepository(this._apiClient);

  Future<List<PollModel>> getPolls({int page = 1}) async {
    final response =
        await _apiClient.get('/polls', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => PollModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => PollModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<PollModel> createPoll(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/polls', data: data);
    return PollModel.fromJson(response as Map<String, dynamic>);
  }

  Future<void> respondToPoll(String pollId, String optionId) async {
    // API route is /polls/[id]/vote (not /respond)
    await _apiClient.post('/polls/$pollId/vote', data: {
      'option_id': optionId,
    });
  }

  Future<Map<String, dynamic>> getPollResults(String pollId) async {
    final response = await _apiClient.get('/polls/$pollId/results');
    return response as Map<String, dynamic>;
  }

  Future<void> deletePoll(String id) async {
    await _apiClient.delete('/polls/$id');
  }
}
