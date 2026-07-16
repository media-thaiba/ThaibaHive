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

  Future<List<HelpDeskTicketModel>> getTickets({int page = 1}) async {
    final response =
        await _apiClient.get('/help-desk/tickets', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => HelpDeskTicketModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => HelpDeskTicketModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<HelpDeskTicketModel> getTicket(String id) async {
    final response = await _apiClient.get('/help-desk/tickets/$id');
    return HelpDeskTicketModel.fromJson(response as Map<String, dynamic>);
  }

  Future<HelpDeskTicketModel> createTicket(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/help-desk/tickets', data: data);
    return HelpDeskTicketModel.fromJson(response as Map<String, dynamic>);
  }

  Future<HelpDeskTicketModel> updateTicket(
      String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/help-desk/tickets/$id', data: data);
    return HelpDeskTicketModel.fromJson(response as Map<String, dynamic>);
  }

  Future<void> addComment(String ticketId, String comment) async {
    await _apiClient.post('/help-desk/tickets/$ticketId/comments', data: {
      'comment': comment,
    });
  }
}
