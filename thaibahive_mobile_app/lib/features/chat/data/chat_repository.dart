import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'chat_models.dart';

class ChatRepository {
  ChatRepository({required this.apiClient});

  final ApiClient apiClient;

  Future<List<ChatChannel>> fetchChannels() async {
    final response = await apiClient.get('/api/chat/channels');
    final data = response.data as Map<String, dynamic>;
    final list = data['channels'] as List<dynamic>? ?? [];
    return list.map((json) => ChatChannel.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<List<ChatMessage>> fetchMessages(String channelId, {String? before, int limit = 50}) async {
    final queryParams = <String, dynamic>{
      'limit': limit,
      if (before != null) 'before': before,
    };
    final response = await apiClient.get(
      '/api/chat/channels/$channelId/messages',
      queryParameters: queryParams,
    );
    final data = response.data as Map<String, dynamic>;
    final list = data['messages'] as List<dynamic>? ?? [];
    return list.map((json) => ChatMessage.fromJson(json as Map<String, dynamic>)).toList();
  }

  Future<ChatMessage> sendMessage({
    required String channelId,
    required String content,
    String type = 'text',
    String? clientMessageId,
    String? replyToId,
    String? attachmentUrl,
  }) async {
    final response = await apiClient.post(
      '/api/chat/channels/$channelId/messages',
      data: {
        'content': content,
        'type': type,
        if (clientMessageId != null) 'clientMessageId': clientMessageId,
        if (replyToId != null) 'replyToId': replyToId,
        if (attachmentUrl != null) 'attachmentUrl': attachmentUrl,
      },
    );
    final data = response.data as Map<String, dynamic>;
    return ChatMessage.fromJson(data['message'] as Map<String, dynamic>);
  }

  Future<void> markRead({required String messageId, List<String>? batchMessageIds}) async {
    await apiClient.post(
      '/api/chat/messages/$messageId/read',
      data: {
        if (batchMessageIds != null && batchMessageIds.isNotEmpty) 'messageIds': batchMessageIds,
      },
    );
  }

  Future<Map<String, String>> fetchPresence() async {
    try {
      final response = await apiClient.get('/api/chat/presence');
      final data = response.data as Map<String, dynamic>;
      final presence = data['presence'] as Map<String, dynamic>? ?? {};
      return presence.map((k, v) => MapEntry(k, v.toString()));
    } catch (_) {
      return {};
    }
  }
}

final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return ChatRepository(apiClient: apiClient);
});
