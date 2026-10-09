import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:dio/dio.dart';

class ChatOutboxJob {
  const ChatOutboxJob({
    required this.clientMessageId,
    required this.channelId,
    required this.content,
    this.type = 'text',
    this.replyToId,
    this.attachmentUrl,
    required this.createdAt,
    this.attempts = 0,
    this.status = 'pending',
    this.lastError,
  });

  final String clientMessageId;
  final String channelId;
  final String content;
  final String type;
  final String? replyToId;
  final String? attachmentUrl;
  final String createdAt;
  final int attempts;
  final String status; // 'pending' | 'sending' | 'completed' | 'failed'
  final String? lastError;

  factory ChatOutboxJob.fromJson(Map<dynamic, dynamic> json) {
    return ChatOutboxJob(
      clientMessageId: json['clientMessageId'] as String? ?? '',
      channelId: json['channelId'] as String? ?? '',
      content: json['content'] as String? ?? '',
      type: json['type'] as String? ?? 'text',
      replyToId: json['replyToId'] as String?,
      attachmentUrl: json['attachmentUrl'] as String?,
      createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
      attempts: json['attempts'] as int? ?? 0,
      status: json['status'] as String? ?? 'pending',
      lastError: json['lastError'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'clientMessageId': clientMessageId,
      'channelId': channelId,
      'content': content,
      'type': type,
      'replyToId': replyToId,
      'attachmentUrl': attachmentUrl,
      'createdAt': createdAt,
      'attempts': attempts,
      'status': status,
      'lastError': lastError,
    };
  }

  ChatOutboxJob copyWith({
    String? clientMessageId,
    String? channelId,
    String? content,
    String? type,
    String? replyToId,
    String? attachmentUrl,
    String? createdAt,
    int? attempts,
    String? status,
    String? lastError,
  }) {
    return ChatOutboxJob(
      clientMessageId: clientMessageId ?? this.clientMessageId,
      channelId: channelId ?? this.channelId,
      content: content ?? this.content,
      type: type ?? this.type,
      replyToId: replyToId ?? this.replyToId,
      attachmentUrl: attachmentUrl ?? this.attachmentUrl,
      createdAt: createdAt ?? this.createdAt,
      attempts: attempts ?? this.attempts,
      status: status ?? this.status,
      lastError: lastError ?? this.lastError,
    );
  }
}

const String kChatOutboxBoxName = 'chat_outbox';

class ChatOutboxManager {
  static const int maxAttempts = 3;

  static Box? _box;

  static Future<Box> getBox() async {
    if (_box != null && _box!.isOpen) {
      return _box!;
    }
    if (!Hive.isBoxOpen(kChatOutboxBoxName)) {
      _box = await Hive.openBox(kChatOutboxBoxName);
    } else {
      _box = Hive.box(kChatOutboxBoxName);
    }
    return _box!;
  }

  /// Enqueue a message in offline chat outbox
  static Future<void> enqueue(ChatOutboxJob job) async {
    final box = await getBox();
    await box.put(job.clientMessageId, job.toJson());
  }

  /// Retrieve all pending jobs
  static Future<List<ChatOutboxJob>> getPendingJobs() async {
    final box = await getBox();
    final list = <ChatOutboxJob>[];
    for (var key in box.keys) {
      final raw = box.get(key);
      if (raw != null && raw is Map) {
        final job = ChatOutboxJob.fromJson(raw);
        if (job.status == 'pending' || job.status == 'sending') {
          list.add(job);
        }
      }
    }
    return list;
  }

  /// Delete a job upon successful server delivery
  static Future<void> remove(String clientMessageId) async {
    final box = await getBox();
    await box.delete(clientMessageId);
  }
}

class ChatDrainState {
  const ChatDrainState({
    this.isDraining = false,
    this.drainedCount = 0,
    this.failedCount = 0,
    this.lastError,
  });

  final bool isDraining;
  final int drainedCount;
  final int failedCount;
  final String? lastError;
}

class ChatDrainNotifier extends StateNotifier<ChatDrainState> {
  ChatDrainNotifier({required this.apiClient}) : super(const ChatDrainState());

  final ApiClient apiClient;

  Future<int> drain() async {
    if (state.isDraining) return 0;
    state = const ChatDrainState(isDraining: true);

    int drained = 0;
    int failed = 0;

    try {
      final pendingJobs = await ChatOutboxManager.getPendingJobs();
      if (pendingJobs.isEmpty) {
        state = const ChatDrainState(isDraining: false);
        return 0;
      }

      for (final job in pendingJobs) {
        try {
          final res = await apiClient.post(
            '/api/chat/channels/${job.channelId}/messages',
            data: {
              'content': job.content,
              'type': job.type,
              'clientMessageId': job.clientMessageId,
              if (job.replyToId != null) 'replyToId': job.replyToId,
              if (job.attachmentUrl != null) 'attachmentUrl': job.attachmentUrl,
            },
          );

          if (res.statusCode == 200 || res.statusCode == 201) {
            await ChatOutboxManager.remove(job.clientMessageId);
            drained++;
          } else {
            failed++;
          }
        } on DioException catch (dioErr) {
          failed++;
          final box = await ChatOutboxManager.getBox();
          final newAttempts = job.attempts + 1;
          await box.put(
            job.clientMessageId,
            job
                .copyWith(
                  attempts: newAttempts,
                  status: newAttempts >= ChatOutboxManager.maxAttempts ? 'failed' : 'pending',
                  lastError: dioErr.message,
                )
                .toJson(),
          );
        } catch (err) {
          failed++;
        }
      }

      state = ChatDrainState(
        isDraining: false,
        drainedCount: drained,
        failedCount: failed,
      );
      return drained;
    } catch (e) {
      state = ChatDrainState(isDraining: false, lastError: e.toString());
      return drained;
    }
  }
}

final chatDrainProvider = StateNotifierProvider<ChatDrainNotifier, ChatDrainState>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return ChatDrainNotifier(apiClient: apiClient);
});
