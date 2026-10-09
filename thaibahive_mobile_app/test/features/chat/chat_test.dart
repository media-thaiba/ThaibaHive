import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/features/chat/data/chat_models.dart';
import 'package:thaibahive_mobile/features/chat/data/chat_outbox.dart';
import 'package:thaibahive_mobile/features/chat/data/chat_repository.dart';
import 'package:thaibahive_mobile/features/chat/presentation/chat_providers.dart';
import 'package:thaibahive_mobile/features/chat/presentation/channel_list_screen.dart';
import 'package:thaibahive_mobile/features/chat/presentation/chat_screen.dart';

class _FakeChatRepository extends ChatRepository {
  _FakeChatRepository() : super(apiClient: ApiClient(baseUrl: 'http://localhost'));

  @override
  Future<List<ChatChannel>> fetchChannels() async {
    return [
      const ChatChannel(
        id: 'chan-1',
        institutionId: 'inst-1',
        name: 'Faculty Lounge',
        type: 'group',
        createdById: 'staff-1',
        unreadCount: 3,
        latestMessage: ChatMessagePreview(
          id: 'msg-1',
          content: 'Hello everyone!',
          senderId: 'staff-1',
          createdAt: '2026-10-09T10:00:00.000Z',
          type: 'text',
        ),
      ),
      const ChatChannel(
        id: 'chan-2',
        institutionId: 'inst-1',
        name: 'Dean Direct',
        type: 'direct',
        createdById: 'staff-2',
        unreadCount: 0,
      ),
    ];
  }

  @override
  Future<List<ChatMessage>> fetchMessages(String channelId, {String? before, int limit = 50}) async {
    return [
      const ChatMessage(
        id: 'msg-1',
        channelId: 'chan-1',
        senderId: 'staff-1',
        content: 'Welcome to the group!',
        createdAt: '2026-10-09T10:00:00.000Z',
        senderFirstName: 'Alice',
        senderLastName: 'Smith',
        status: 'delivered',
      ),
      const ChatMessage(
        id: 'msg-2',
        channelId: 'chan-1',
        senderId: 'staff-me-123',
        content: 'Thanks Alice, glad to be here.',
        createdAt: '2026-10-09T10:01:00.000Z',
        senderFirstName: 'Me',
        status: 'read',
      ),
    ];
  }

  @override
  Future<ChatMessage> sendMessage({
    required String channelId,
    required String content,
    String type = 'text',
    String? clientMessageId,
    String? replyToId,
    String? attachmentUrl,
  }) async {
    return ChatMessage(
      id: 'server-${DateTime.now().millisecondsSinceEpoch}',
      channelId: channelId,
      senderId: 'staff-me-123',
      clientMessageId: clientMessageId,
      content: content,
      type: type,
      replyToId: replyToId,
      createdAt: DateTime.now().toIso8601String(),
      status: 'sent',
    );
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Flutter Chat Module Models & Outbox Tests', () {
    test('ChatChannel deserializes and serializes correctly', () {
      final json = {
        'id': 'c-100',
        'institutionId': 'inst-100',
        'name': 'Science Dept',
        'type': 'group',
        'createdById': 'staff-1',
        'isActive': true,
        'unreadCount': 4,
        'latestMessage': {
          'id': 'm-1',
          'content': 'Meeting tomorrow at 9',
          'senderId': 'staff-1',
          'createdAt': '2026-10-09T12:00:00Z',
          'type': 'text',
        },
      };

      final channel = ChatChannel.fromJson(json);
      expect(channel.id, 'c-100');
      expect(channel.name, 'Science Dept');
      expect(channel.unreadCount, 4);
      expect(channel.latestMessage?.content, 'Meeting tomorrow at 9');

      final serialized = channel.toJson();
      expect(serialized['id'], 'c-100');
      expect(serialized['name'], 'Science Dept');
    });

    test('ChatMessage deserializes sender details and handles fullName fallback', () {
      final json = {
        'id': 'msg-500',
        'channelId': 'c-100',
        'senderId': 'staff-2',
        'content': 'Check the attachment',
        'type': 'text',
        'createdAt': '2026-10-09T12:05:00Z',
        'sender': {
          'firstName': 'John',
          'lastName': 'Doe',
          'avatarUrl': 'https://example.com/avatar.png',
        },
      };

      final msg = ChatMessage.fromJson(json);
      expect(msg.id, 'msg-500');
      expect(msg.content, 'Check the attachment');
      expect(msg.senderFullName, 'John Doe');
      expect(msg.status, 'delivered');
    });

    test('ChatOutboxJob correctly tracks status and attempts', () {
      final job = ChatOutboxJob(
        clientMessageId: 'client-999',
        channelId: 'chan-1',
        content: 'Offline draft',
        createdAt: '2026-10-09T12:10:00Z',
        attempts: 1,
        status: 'pending',
      );

      expect(job.clientMessageId, 'client-999');
      expect(job.attempts, 1);

      final updated = job.copyWith(attempts: 2, status: 'failed', lastError: 'Timeout');
      expect(updated.attempts, 2);
      expect(updated.status, 'failed');
      expect(updated.lastError, 'Timeout');
    });
  });

  group('Flutter Chat UI Widget Tests', () {
    testWidgets('ChannelListScreen renders channel list tiles and unread badges', (tester) async {
      final fakeRepo = _FakeChatRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: const MaterialApp(
            home: ChannelListScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Campus Chat'), findsOneWidget);
      expect(find.text('Faculty Lounge'), findsOneWidget);
      expect(find.text('Dean Direct'), findsOneWidget);
      expect(find.text('3'), findsOneWidget); // unread badge
    });

    testWidgets('ChatScreen renders messages and sends message input', (tester) async {
      final fakeRepo = _FakeChatRepository();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            chatRepositoryProvider.overrideWithValue(fakeRepo),
          ],
          child: const MaterialApp(
            home: ChatScreen(channelId: 'chan-1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Welcome to the group!'), findsOneWidget);
      expect(find.text('Thanks Alice, glad to be here.'), findsOneWidget);

      // Find input and enter text
      final inputFinder = find.byType(TextField);
      expect(inputFinder, findsOneWidget);

      await tester.enterText(inputFinder, 'Sounds great!');
      await tester.tap(find.byIcon(Icons.send));
      await tester.pumpAndSettle();

      expect(find.text('Sounds great!'), findsOneWidget);
    });
  });
}
