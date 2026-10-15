/// Pure timing helpers for the presence verification pipeline.
///
/// These classes are intentionally free of Flutter/plugin dependencies so
/// the throttle and grace-window semantics can be unit-tested directly.

/// Decides whether a presence check should run based on the configured
/// check interval. The first call always runs (no prior timestamp), which
/// guarantees an immediate check after tracking (re)starts.
class PresenceCheckThrottle {
  DateTime? _lastCheckAt;

  /// Returns true when enough time has elapsed since the last granted check,
  /// and records [now] as the granted timestamp.
  bool shouldRun({required Duration interval, DateTime? now}) {
    final at = now ?? DateTime.now();
    if (_lastCheckAt != null && at.difference(_lastCheckAt!) < interval) {
      return false;
    }
    _lastCheckAt = at;
    return true;
  }

  /// Clears the last-check timestamp so the next call runs immediately.
  void reset() => _lastCheckAt = null;
}

/// Tracks how long the device has continuously been outside the geofence.
///
/// Grace is wall-clock based (not tick-count based) so it keeps real-minute
/// semantics regardless of how often presence checks actually run.
class GraceTracker {
  DateTime? _outsideSince;

  bool get isOutside => _outsideSince != null;

  /// Marks the device as back inside the geofence and closes the window.
  void markWithin() => _outsideSince = null;

  /// Records the first outside sample (starting the grace window) and
  /// returns true once [graceMinutes] have elapsed since that first sample.
  bool markOutside(DateTime now, {required int graceMinutes}) {
    _outsideSince ??= now;
    return now.difference(_outsideSince!).inMinutes >= graceMinutes;
  }
}
