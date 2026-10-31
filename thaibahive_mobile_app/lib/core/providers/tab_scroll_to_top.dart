import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Broadcast emitted when the user re-taps the bottom-nav tab they are
/// already on (Rule 9: "tap the active tab to scroll to top").
///
/// The navigation shell writes to [tabScrollToTopProvider]; each tab screen
/// listens for its own [TabScrollToTop.branch] and animates its scroll
/// position back to offset 0. [TabScrollToTop.token] is incremented on every
/// trigger so consecutive taps on the same tab still notify listeners.
class TabScrollToTop {
  const TabScrollToTop(this.branch, this.token);

  /// Shell branch index that was re-tapped (0 = Today, 2 = Notices, 3 = My Hub).
  final int branch;

  /// Monotonic counter; a new value always means "fire again".
  final int token;
}

class TabScrollToTopNotifier extends Notifier<TabScrollToTop?> {
  int _token = 0;

  @override
  TabScrollToTop? build() => null;

  /// Requests a scroll-to-top for every screen on [branch].
  void trigger(int branch) {
    state = TabScrollToTop(branch, ++_token);
  }
}

final tabScrollToTopProvider =
    NotifierProvider<TabScrollToTopNotifier, TabScrollToTop?>(
  TabScrollToTopNotifier.new,
);

/// Convenience for listeners: animates to offset 0 (280ms, ease-out-cubic)
/// and no-ops when no position is attached yet (e.g. while a list is still in
/// its loading shimmer). A controller may be shared by several lists — the
/// Notices tab hands one controller to all three of its segments — so every
/// attached position is animated.
extension TabScrollToTopControllerX on ScrollController {
  void animateToTop({
    Duration duration = const Duration(milliseconds: 280),
  }) {
    if (!hasClients) return;
    for (final position in positions) {
      position.animateTo(0, duration: duration, curve: Curves.easeOutCubic);
    }
  }
}
