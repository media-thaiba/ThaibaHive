import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/tab_scroll_to_top.dart';
import '../../../core/services/sse_service.dart';
import '../../announcements/presentation/announcements_screen.dart';
import '../../circulars/presentation/circulars_screen.dart';
import '../../notifications/data/notifications_provider.dart';
import '../../polls/presentation/polls_screen.dart';
import '../../../shared/widgets/sliding_pill_segmented_control.dart';

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

  /// Shared by all three segments (they stay alive in the IndexedStack, so
  /// each keeps its own attached position). Lets a re-tap of the Notices tab
  /// scroll the visible list back to the top (Rule 9).
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  static const List<String> _segments = [
    'Circulars',
    'Announcements',
    'Polls',
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

    // Rule 9: re-tapping the Notices tab scrolls the active segment to the top.
    ref.listen(tabScrollToTopProvider, (previous, next) {
      if (next?.branch == 2) _scrollController.animateToTop();
    });

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('Bulletin'),
        backgroundColor: Colors.transparent,
      ),
      body: Column(
        children: [
          // VisionOS/Cupertino-style sliding pill segmented control
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: SlidingPillSegmentedControl(
              segments: _segments,
              selectedIndex: _segment,
              onValueChanged: (index) => setState(() => _segment = index),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _segment,
              children: [
                CircularsScreen(
                  embedded: true,
                  scrollController: _scrollController,
                ),
                AnnouncementsScreen(
                  embedded: true,
                  scrollController: _scrollController,
                ),
                PollsScreen(
                  embedded: true,
                  scrollController: _scrollController,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
