import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../application/engagement_providers.dart';
import 'widgets/in_app_chat_sheet.dart';

class EngagementFeedScreen extends ConsumerWidget {
  const EngagementFeedScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feedAsync = ref.watch(engagementFeedProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Campus Updates & Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(engagementFeedProvider.notifier).loadNotifications(),
          ),
        ],
      ),
      body: feedAsync.when(
        data: (items) {
          if (items.isEmpty) {
            return const Center(child: Text('No new notifications'));
          }
          return RefreshIndicator(
            onRefresh: () => ref.read(engagementFeedProvider.notifier).loadNotifications(),
            child: ListView.separated(
              itemCount: items.length,
              separatorBuilder: (_, __) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final item = items[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundColor: item.priority == 'high' ? Colors.amber.shade100 : Colors.blue.shade100,
                    child: Icon(
                      item.channel == 'push' ? Icons.notifications_active : Icons.mail,
                      color: item.priority == 'high' ? Colors.amber.shade900 : Colors.blue.shade900,
                    ),
                  ),
                  title: Text(
                    item.title,
                    style: TextStyle(
                      fontWeight: item.isRead ? FontWeight.normal : FontWeight.bold,
                    ),
                  ),
                  subtitle: Text(item.body),
                  trailing: item.isRead
                      ? null
                      : Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            color: Colors.blueAccent,
                          ),
                        ),
                  onTap: () {
                    ref.read(engagementFeedProvider.notifier).markAsRead(item.id);
                  },
                );
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, _) => Center(child: Text('Error loading feed: $err')),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            builder: (_) => const InAppChatSheet(studentId: 'current_student'),
          );
        },
        icon: const Icon(Icons.chat_bubble_outline),
        label: const Text('Campus AI Help'),
      ),
    );
  }
}
