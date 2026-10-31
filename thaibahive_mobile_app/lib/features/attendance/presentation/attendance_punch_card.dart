import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/core/services/offline_queue_providers.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_provider.dart';
import 'package:thaibahive_mobile/features/attendance/presentation/nfc_scan_screen.dart';
import 'package:thaibahive_mobile/features/attendance/presentation/qr_scan_screen.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';
import 'package:thaibahive_mobile/shared/widgets/th_micro_label.dart';

/// Compact attendance punch card for embedding in Today screen
/// Adapts size based on punch state (large before punch, compact after)
class AttendancePunchCard extends ConsumerStatefulWidget {
  final VoidCallback? onPunchComplete;

  const AttendancePunchCard({super.key, this.onPunchComplete});

  @override
  ConsumerState<AttendancePunchCard> createState() => _AttendancePunchCardState();
}

class _AttendancePunchCardState extends ConsumerState<AttendancePunchCard> {
  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceProvider);
    final stats = state.stats;
    final hasCheckIn = stats?.lastCheckIn != null;
    final hasCheckOut = stats?.lastCheckOut != null;
    final isPresent = stats?.todayStatus == 'present';

    // D13: collapse once checked in; compact pill carries the checkout
    // affordance until the day completes.
    // Multi-shift / overtime: server-reported on-shift state (trailing 'in'
    // event) wins; fall back to the legacy single-shift derivation.
    final isOnShift = stats?.isOnShift ?? (hasCheckIn && !hasCheckOut);
    final isOvertime = isOnShift && hasCheckOut;
    final isCheckedIn = isOnShift;
    final isCompact = hasCheckIn;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOutCubic,
      width: double.infinity,
      height: null,
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 250),
        switchInCurve: Curves.easeOut,
        switchOutCurve: Curves.easeIn,
        transitionBuilder: (child, anim) => FadeTransition(
          opacity: anim,
          child: ScaleTransition(
            scale: Tween<double>(begin: 0.96, end: 1.0).animate(anim),
            child: child,
          ),
        ),
        child: isCompact
            ? _buildCompactPill(
                key: const ValueKey('attendance-compact'),
                context: context,
                isCheckedIn: isCheckedIn,
                isOvertime: isOvertime,
                isPresent: isPresent,
                stats: stats,
                state: state,
              )
            : _buildExpandedCard(
                key: const ValueKey('attendance-expanded'),
                context: context,
                isPresent: isPresent,
                state: state,
              ),
      ),
    );
  }

  /// Compact pill shown once checked in: full "Attendance Complete" row after
  /// checkout, or a checked-in row with a compact "Check out" affordance.
  Widget _buildCompactPill({
    required Key key,
    required BuildContext context,
    required bool isCheckedIn,
    required bool isOvertime,
    required bool isPresent,
    required AttendanceStatsModel? stats,
    required AttendanceState state,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (isCheckedIn) {
      Widget? statusChip;
      if (state.isOfflineCheckOut && state.pendingCheckOutId != null) {
        statusChip = _OfflineStatusChip(pendingCheckOutId: state.pendingCheckOutId!);
      }

      const emeraldAccent = Color(0xFF10B981);

      return Container(
        key: key,
        width: double.infinity,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF132A1C) : const Color(0xFFECFDF5),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: emeraldAccent.withValues(alpha: isDark ? 0.35 : 0.45),
            width: 1.0,
          ),
          boxShadow: AppShadows.card(emeraldAccent),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header Row
            Row(
              children: [
                // Pulsing dot indicator
                Container(
                  width: 9,
                  height: 9,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: emeraldAccent,
                    boxShadow: [
                      BoxShadow(
                        color: emeraldAccent.withValues(alpha: 0.6),
                        blurRadius: 6,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                // Active overtime (multi-shift) is labelled distinctly so a
                // second concurrent shift never reads as the first one.
                ThMicroLabel(
                  isOvertime ? 'ACTIVE OVERTIME' : 'ACTIVE SHIFT',
                  color: emeraldAccent,
                  tracking: 1.4,
                ),
                const Spacer(),
                if (isOvertime)
                  const StatusBadge(
                    label: 'Overtime',
                    variant: StatusBadgeVariant.warning,
                  )
                else
                  const StatusBadge(
                    label: 'On Duty',
                    variant: StatusBadgeVariant.success,
                  ),
              ],
            ),
            const SizedBox(height: 14),

            // Shift Information & Check In Details
            Row(
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF059669), Color(0xFF10B981)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(
                    Icons.login_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Checked In at ${stats?.lastCheckIn ?? '--:--'}',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                          letterSpacing: -0.2,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatShiftLabel(stats),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            if (statusChip != null) ...[
              const SizedBox(height: 10),
              statusChip,
            ],
            const SizedBox(height: 14),

            // Clock Out Action Button
            Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: state.isLoading
                    ? null
                    : () async {
                        // One-tap geofence clock-out — unified with check-in
                        // via punchOneTap (GPS, offline queue, snackbar).
                        final outcome = await ref
                            .read(attendanceProvider.notifier)
                            .punchOneTap(isCheckIn: false);
                        widget.onPunchComplete?.call();
                        if (mounted && outcome != null) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                  outcome.message ?? 'Clock-out recorded'),
                              backgroundColor: outcome.isQueuedOffline
                                  ? Colors.amber[800]
                                  : const Color(0xFF1a8a3e),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        }
                      },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 11),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFE11D48), Color(0xFFBE123C)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFE11D48).withValues(alpha: isDark ? 0.2 : 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Center(
                    child: state.isLoading
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: Colors.white,
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: const [
                              Icon(
                                Icons.logout_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Clock Out Now',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            ),
          ],
        ),
      );
    }

    // Attendance complete (checked in AND out).
    return Container(
      key: key,
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E242C) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF2E3744) : const Color(0xFFE2E8F0),
          width: 1.0,
        ),
        boxShadow: AppShadows.card(Colors.black),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF059669), Color(0xFF10B981)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF10B981).withValues(alpha: 0.25),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: Colors.white,
                  size: 22,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Shift Completed',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'In: ${stats?.lastCheckIn ?? '--:--'} • Out: ${stats?.lastCheckOut ?? '--:--'}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
              const StatusBadge(
                label: 'Shift Ended',
                variant: StatusBadgeVariant.info,
              ),
            ],
          ),
          // Multi-shift / overtime: after the day's shift has ended, a second
          // check-in opens an extra shift session on top of the completed one.
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: state.isLoading
                ? null
                : () async {
                    final outcome = await ref
                        .read(attendanceProvider.notifier)
                        .punchOneTap(isCheckIn: true);
                    widget.onPunchComplete?.call();
                    if (context.mounted && outcome != null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                              outcome.message ?? 'Overtime check-in recorded'),
                        ),
                      );
                    }
                  },
            icon: const Icon(Icons.add_circle_outline_rounded, size: 18),
            label: const Text('Check In (Overtime / Extra Shift)'),
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF10B981),
              side: const BorderSide(color: Color(0xFF10B981), width: 1.2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
              padding: const EdgeInsets.symmetric(vertical: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildExpandedCard({
    required Key key,
    required BuildContext context,
    required bool isPresent,
    required AttendanceState state,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    const primaryEmerald = Color(0xFF10B981);
    const darkEmerald = Color(0xFF059669);

    final List<Widget> cardChildren = <Widget>[];

    // Header
    cardChildren.add(
      Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [darkEmerald, primaryEmerald],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: primaryEmerald.withValues(alpha: isDark ? 0.2 : 0.28),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(
              Icons.fingerprint_rounded,
              color: Colors.white,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Attendance Clock-In',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: isDark ? const Color(0xFFF1F5F9) : const Color(0xFF0F172A),
                    letterSpacing: -0.2,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _formatShiftLabel(state.stats),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          if (isPresent)
            const StatusBadge(
              label: 'Present',
              variant: StatusBadgeVariant.success,
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF2E2619) : const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isDark ? const Color(0xFFD97706).withValues(alpha: 0.3) : const Color(0xFFFDE68A),
                  width: 1,
                ),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: Color(0xFFD97706),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 5),
                  Text(
                    'Pending',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: isDark ? const Color(0xFFFBBF24) : const Color(0xFFB45309),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );

    // Spacing
    cardChildren.add(const SizedBox(height: 16));

    // Punch button
    cardChildren.add(
      Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: state.isLoading
              ? null
              : () async {
                  // One-tap geofence punch. The NFC and QR chips below already
                  // expose the alternative methods, so the old picker sheet
                  // only repeated options already on this card.
                  final outcome = await ref
                      .read(attendanceProvider.notifier)
                      .punchOneTap(isCheckIn: true);
                  widget.onPunchComplete?.call();
                  if (mounted && outcome != null) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(outcome.message ?? 'Check-in recorded'),
                        backgroundColor: outcome.isQueuedOffline
                            ? Colors.amber[800]
                            : const Color(0xFF1a8a3e),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  }
                },
          borderRadius: BorderRadius.circular(14),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: double.infinity,
            height: 52,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: state.isLoading
                    ? [darkEmerald.withValues(alpha: 0.6), primaryEmerald.withValues(alpha: 0.6)]
                    : const [darkEmerald, primaryEmerald],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: primaryEmerald.withValues(alpha: isDark ? 0.2 : 0.35),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: state.isLoading
                  ? const SizedBox(
                      width: 22,
                      height: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(
                          Icons.touch_app_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                        SizedBox(width: 8),
                        Text(
                          'Clock In Now',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),
      ),
    );

    // Scan method buttons (expanded card only renders before first check-in)
    cardChildren.add(const SizedBox(height: 12));
    cardChildren.add(
      Row(
        children: [
          Expanded(
            child: _ScanMethodChip(
              icon: Icons.nfc_rounded,
              label: 'NFC Scan',
              color: const Color(0xFF6366F1),
              onTap: () => _openNFCScreen(context),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: _ScanMethodChip(
              icon: Icons.qr_code_scanner_rounded,
              label: 'QR Code',
              color: const Color(0xFF0EA5E9),
              onTap: () => _openQRScreen(context),
            ),
          ),
        ],
      ),
    );

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E242C) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? const Color(0xFF2E3744) : const Color(0xFFE2E8F0),
          width: 1,
        ),
        boxShadow: AppShadows.card(Colors.black),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: cardChildren,
      ),
    );
  }

  void _openNFCScreen(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const NFCScanScreen()),
    );
  }

  void _openQRScreen(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const QRScanScreen()),
    );
  }
}

class _ScanMethodChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ScanMethodChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF222934) : const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? const Color(0xFF2E3846) : const Color(0xFFE2E8F0),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Icon(icon, size: 14, color: color),
              ),
              const SizedBox(width: 8),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF334155),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Status chip for offline check-out sync state.
class _OfflineStatusChip extends ConsumerWidget {
  const _OfflineStatusChip({required this.pendingCheckOutId});

  final String pendingCheckOutId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final offlineQueue = ref.watch(offlineQueueProvider);
    final events = offlineQueue.getAllEvents();
    final event = events.cast<OfflineEvent?>().firstWhere(
      (e) => e?.clientEventId == pendingCheckOutId,
      orElse: () => null,
    );

    if (event == null) {
      // Event completed - show synced
      return _buildChip(context, 'Synced', Colors.green, Icons.check_circle_rounded);
    }

    switch (event!.status) {
      case QueueStatus.pending:
        return _buildChip(context, 'Queued', Colors.orange, Icons.schedule_rounded);
      case QueueStatus.syncing:
        return _buildChip(context, 'Syncing...', Colors.blue, Icons.sync_rounded);
      case QueueStatus.conflict:
        return _buildChip(context, 'Conflict', Colors.red, Icons.error_rounded);
      case QueueStatus.failed:
        return _buildChip(context, 'Failed', Colors.red, Icons.error_rounded);
      case QueueStatus.completed:
        return _buildChip(context, 'Synced', Colors.green, Icons.check_circle_rounded);
    }
  }

  Widget _buildChip(BuildContext context, String label, Color color, IconData icon) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

String _formatShiftLabel(AttendanceStatsModel? stats) {
  final name = stats?.shiftName ?? 'General Shift';
  final start = stats?.shiftStartTime;
  final end = stats?.shiftEndTime;
  if (start != null && end != null) {
    return '$name • ${_formatTimeStr(start)} - ${_formatTimeStr(end)}';
  }
  return '$name • 09:00 AM - 05:00 PM';
}

String _formatTimeStr(String hhmm) {
  final parts = hhmm.split(':');
  if (parts.length >= 2) {
    final h = int.tryParse(parts[0]) ?? 9;
    final m = int.tryParse(parts[1]) ?? 0;
    final period = h >= 12 ? 'PM' : 'AM';
    final h12 = h % 12 == 0 ? 12 : h % 12;
    return '${h12.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} $period';
  }
  return hhmm;
}
