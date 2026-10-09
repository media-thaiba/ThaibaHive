import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/features/chat/data/chat_models.dart';
import 'package:thaibahive_mobile/features/chat/data/chat_repository.dart';
import 'package:thaibahive_mobile/features/chat/data/chat_outbox.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';

// ─── Channel List Provider ───

final chatChannelsProvider =
    StateNotifierProvider<ChatChannelsNotifier, AsyncValue<List<ChatChannel>>>((ref) {
  final repo = ref.read(chatRepositoryProvider);
  return ChatChannelsNotifier(repository: repo);
});

class ChatChannelsNotifier extends StateNotifier<AsyncValue<List<ChatChannel>>> {
  ChatChannelsNotifier({required this.repository}) : super(const AsyncValue.loading()) {
    loadChannels();
  }

  final ChatRepository repository;

  Future<void> loadChannels() async {
    try {
      state = const AsyncValue.loading();
      final channels = await repository.fetchChannels();
      state = AsyncValue.data(channels);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> refresh() async {
    try {
      final channels = await repository.fetchChannels();
      state = AsyncValue.data(channels);
    } catch (_) {
      // keep existing on background refresh failure
    }
  }

  void markChannelAsRead(String channelId) {
    state.whenData((channels) {
      final updated = channels.map((c) {
        if (c.id == channelId) {
          return c.copyWith(unreadCount: 0);
        }
        return c;
      }).toList();
      state = AsyncValue.data(updated);
    });
  }
}

// ─── Channel Messages State & Notifier ───

class ChatMessagesState {
  const ChatMessagesState({
    this.messages = const [],
    this.isLoading = false,
    this.hasMore = true,
    this.errorMessage,
  });

  final List<ChatMessage> messages;
  final bool isLoading;
  final bool hasMore;
  final String? errorMessage;

  ChatMessagesState copyWith({
    List<ChatMessage>? messages,
    bool? isLoading,
    bool? hasMore,
    String? errorMessage,
  }) {
    return ChatMessagesState(
      messages: messages ?? this.messages,
      isLoading: isLoading ?? this.isLoading,
      hasMore: hasMore ?? this.hasMore,
      errorMessage: errorMessage,
    );
  }
}

final chatMessagesProvider =
    StateNotifierProvider.family<ChatMessagesNotifier, ChatMessagesState, String>(
        (ref, channelId) {
  final repo = ref.read(chatRepositoryProvider);
  final authState = ref.watch(authProvider);
  return ChatMessagesNotifier(
    channelId: channelId,
    repository: repo,
    currentStaffId: authState.user?.id ?? '',
  );
});

class ChatMessagesNotifier extends StateNotifier<ChatMessagesState> {
  ChatMessagesNotifier({
    required this.channelId,
    required this.repository,
    required this.currentStaffId,
  }) : super(const ChatMessagesState(isLoading: true)) {
    loadInitial();
  }

  final String channelId;
  final ChatRepository repository;
  final String currentStaffId;

  Future<void> loadInitial() async {
    try {
      state = state.copyWith(isLoading: true, errorMessage: null);
      final list = await repository.fetchMessages(channelId, limit: 50);
      // Sort oldest first (so index 0 is oldest, last item is newest)
      final sorted = List<ChatMessage>.from(list);
      state = state.copyWith(messages: sorted, isLoading: false, hasMore: list.length >= 50);
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
    }
  }

  Future<void> loadMore() async {
    if (state.isLoading || !state.hasMore || state.messages.isEmpty) return;

    try {
      final oldestTimestamp = state.messages.first.createdAt;
      final olderMessages =
          await repository.fetchMessages(channelId, before: oldestTimestamp, limit: 50);

      if (olderMessages.isEmpty) {
        state = state.copyWith(hasMore: false);
        return;
      }

      final combined = [...olderMessages, ...state.messages];
      state = state.copyWith(messages: combined, hasMore: olderMessages.length >= 50);
    } catch (_) {
      // Ignore pagination errors
    }
  }

  Future<void> sendMessage(String content, {String type = 'text', String? replyToId}) async {
    if (content.trim().isEmpty) return;

    final clientMessageId = 'client-${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now().toIso8601String();

    // Optimistic message
    final optimisticMsg = ChatMessage(
      id: clientMessageId,
      channelId: channelId,
      senderId: currentStaffId,
      clientMessageId: clientMessageId,
      content: content.trim(),
      type: type,
      replyToId: replyToId,
      createdAt: now,
      status: 'sending',
    );

    state = state.copyWith(messages: [...state.messages, optimisticMsg]);

    try {
      final serverMsg = await repository.sendMessage(
        channelId: channelId,
        content: content.trim(),
        type: type,
        clientMessageId: clientMessageId,
        replyToId: replyToId,
      );

      // Replace optimistic message with server message
      final updated = state.messages.map((m) {
        if (m.clientMessageId == clientMessageId || m.id == clientMessageId) {
          return serverMsg.copyWith(status: 'sent');
        }
        return m;
      }).toList();

      state = state.copyWith(messages: updated);
    } catch (e) {
      // Queue in Hive offline chat outbox
      await ChatOutboxManager.enqueue(ChatOutboxJob(
        clientMessageId: clientMessageId,
        channelId: channelId,
        content: content.trim(),
        type: type,
        replyToId: replyToId,
        createdAt: now,
        status: 'pending',
      ));

      // Mark as pending outbox
      final updated = state.messages.map((m) {
        if (m.clientMessageId == clientMessageId) {
          return m.copyWith(status: 'failed');
        }
        return m;
      }).toList();

      state = state.copyWith(messages: updated);
    }
  }

  Future<void> markMessageRead(String messageId) async {
    try {
      await repository.markRead(messageId: messageId);
    } catch (_) {
      // Ignore
    }
  }
}

// ─── Presence Provider ───

final chatPresenceProvider =
    FutureProvider.autoDispose<Map<String, String>>((ref) async {
  final repo = ref.read(chatRepositoryProvider);
  return repo.fetchPresence();
});
