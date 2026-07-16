import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/help_desk_model.dart';

final helpDeskRepositoryProvider = Provider<HelpDeskRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return HelpDeskRepository(apiClient);
});

class HelpDeskRepository {
  final ApiClient _apiClient;

  HelpDeskRepository(this._apiClient);

  // API is at /help-desk (no /tickets segment)
  Future<List<HelpDeskTicketModel>> getTickets({int page = 1}) async {
    final response =
        await _apiClient.get('/help-desk', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => HelpDeskTicketModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map) {
      // API returns { tickets: [...] }
      final list = data['tickets'] ?? data['data'];
      if (list is List) {
        return list
            .map((e) =>
                HelpDeskTicketModel.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    }
    return [];
  }

  Future<HelpDeskTicketModel> getTicket(String id) async {
    final response = await _apiClient.get('/help-desk/$id');
    // API returns { ticket: {...}, comments: [...] }
    final map = response as Map<String, dynamic>;
    return HelpDeskTicketModel.fromJson(
      (map['ticket'] ?? map) as Map<String, dynamic>,
    );
  }

  Future<HelpDeskTicketModel> createTicket(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/help-desk', data: data);
    final map = response as Map<String, dynamic>;
    return HelpDeskTicketModel.fromJson(
      (map['ticket'] ?? map) as Map<String, dynamic>,
    );
  }

  Future<HelpDeskTicketModel> updateTicket(
      String id, Map<String, dynamic> data) async {
    final response = await _apiClient.patch('/help-desk/$id', data: data);
    final map = response as Map<String, dynamic>;
    return HelpDeskTicketModel.fromJson(
      (map['ticket'] ?? map) as Map<String, dynamic>,
    );
  }

  Future<void> addComment(String ticketId, String comment) async {
    await _apiClient.post('/help-desk/$ticketId/comments', data: {
      'content': comment,
    });
  }
}
