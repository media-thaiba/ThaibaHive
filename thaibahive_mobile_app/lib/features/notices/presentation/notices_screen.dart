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

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(title: const Text('Notices')),
      body: Column(
        children: [
          // VisionOS/Cupertino-style pill tab bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: Container(
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
                  width: 1,
                ),
              ),
              child: ToggleButtons(
                isSelected: List.generate(_segments.length, (i) => i == _segment),
                onPressed: (index) => setState(() => _segment = index!),
                fillColor: theme.colorScheme.primary.withValues(alpha: 0.15),
                color: theme.colorScheme.onSurfaceVariant,
                selectedColor: theme.colorScheme.primary,
                borderRadius: BorderRadius.circular(14),
                borderColor: Colors.transparent,
                selectedBorderColor: Colors.transparent,
                constraints: const BoxConstraints(
                  minHeight: 40,
                  minWidth: 80,
                ),
                children: _segments.map((label) {
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      label,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.2,
                        color: _segment == _segments.indexOf(label)
                            ? theme.colorScheme.primary
                            : theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  );
                }).toList(),
              ),
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
