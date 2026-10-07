import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/services/sse_service.dart';
import '../../announcements/presentation/announcements_screen.dart';
import '../../circulars/presentation/circulars_screen.dart';
import '../../notifications/data/notifications_provider.dart';
import '../../polls/presentation/polls_screen.dart';

/// Notices tab (D2) — a thin segmented wrapper over the existing Circulars /
/// Announcements / Polls screens in embedded mode (no nested AppBars).
///
/// - No "View all" link: the pushed routes `/circulars`, `/announcements` and
///   `/polls` stay registered as FCM/deep-link targets only.
/// - `unreadCountProvider` is invalidated on tab open and on SSE arrival so
///   the shell's bottom-nav badge stays fresh.
class NoticesScreen extends ConsumerStatefulWidget {
  const NoticesScreen({super.key});

  @override
  ConsumerState<NoticesScreen> createState() => _NoticesScreenState();
}

class _NoticesScreenState extends ConsumerState<NoticesScreen> {
  int _segment = 0;

  static const _segments = [
    ButtonSegment(value: 0, label: Text('Circulars')),
    ButtonSegment(value: 1, label: Text('Announcements')),
    ButtonSegment(value: 2, label: Text('Polls')),
  ];

  @override
  void initState() {
    super.initState();
    // Tab open — refresh the unread badge (FutureProvider).
    Future.microtask(() {
      if (mounted) ref.invalidate(unreadCountProvider);
    });
  }

  @override
  Widget build(BuildContext context) {
    // SSE arrival — refresh the unread badge without re-fetching the lists.
    ref.listen(sseServiceProvider, (previous, next) {
      if (previous?.lastPayload != next.lastPayload) {
        ref.invalidate(unreadCountProvider);
      }
    });

    return Scaffold(
      appBar: AppBar(title: const Text('Notices')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SegmentedButton<int>(
              segments: _segments,
              selected: {_segment},
              showSelectedIcon: false,
              onSelectionChanged: (selection) {
                setState(() => _segment = selection.first);
              },
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _segment,
              children: const [
                CircularsScreen(embedded: true),
                AnnouncementsScreen(embedded: true),
                PollsScreen(embedded: true),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
