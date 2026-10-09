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

/// Compact attendance punch card for embedding in Today screen
/// Adapts size based on punch state (large before punch, compact after)
class AttendancePunchCard extends ConsumerStatefulWidget {
  final VoidCallback? onPunchComplete;

  const AttendancePunchCard({super.key, this.onPunchComplete});

  @override
  ConsumerState<AttendancePunchCard> createState() => _AttendancePunchCardState();
}

class _AttendancePunchCardState extends ConsumerState<AttendancePunchCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOutCubic),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// D13: the card collapses **after check-in** (not only after check-out).
  /// Drives the shrink animation with `forward()` (expanded → compact) and
  /// `reverse()` (compact → expanded, e.g. next day reset).
  void _syncAnimation(bool compact) {
    final target = compact ? 1.0 : 0.0;
    if (_controller.value == target || _controller.isAnimating) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (compact) {
        _controller.forward();
      } else {
        _controller.reverse();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceProvider);
    final stats = state.stats;
    final hasCheckIn = stats?.lastCheckIn != null;
    final hasCheckOut = stats?.lastCheckOut != null;
    final isPresent = stats?.todayStatus == 'present';

    // D13: collapse once checked in; compact pill carries the checkout
    // affordance until the day completes.
    final isCheckedIn = hasCheckIn && !hasCheckOut;
    final isCompact = hasCheckIn;
    _syncAnimation(isCompact);

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOutCubic,
          transform: Matrix4.identity()..scale(_scaleAnimation.value),
          height: isCompact ? null : 220, // Expanded height
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
      },
    );
  }

  /// Compact pill shown once checked in: full "Attendance Complete" row after
  /// checkout, or a checked-in row with a compact "Check out" affordance.
  Widget _buildCompactPill({
    required Key key,
    required BuildContext context,
    required bool isCheckedIn,
    required bool isPresent,
    required AttendanceStatsModel? stats,
    required AttendanceState state,
  }) {
    final theme = Theme.of(context);
    if (isCheckedIn) {
      Widget? statusChip;
      if (state.isOfflineCheckOut && state.pendingCheckOutId != null) {
        statusChip = _OfflineStatusChip(pendingCheckOutId: state.pendingCheckOutId!);
      }

      return Container(
        key: key,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: theme.colorScheme.outlineVariant),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.login_rounded,
                color: Colors.orange,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Checked In',
                    style: theme.textTheme.titleSmall
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  Text(
                    'In: ${stats?.lastCheckIn ?? '--:--'}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  if (statusChip != null) ...[
                    const SizedBox(height: 4),
                    statusChip,
                  ],
                ],
              ),
            ),
            const SizedBox(width: 8),
            OutlinedButton.icon(
              onPressed: state.isLoading
                  ? null
                  : () async {
                      try {
                        await ref.read(attendanceProvider.notifier).checkOut();
                        widget.onPunchComplete?.call();
                      } catch (_) {
                        // Error surfaced via provider state.
                      }
                    },
              icon: state.isLoading
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.logout_rounded, size: 16),
              label: const Text('Check out'),
            ),
            if (statusChip != null) const SizedBox(width: 8),
          ],
        ),
      );
    }

    // Attendance complete (checked in AND out).
    return Container(
      key: key,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: theme.colorScheme.outlineVariant,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.green.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.check_circle_rounded,
              color: Colors.green,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Attendance Complete',
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.w600),
                ),
                Text(
                  'In: ${stats?.lastCheckIn ?? '--:--'} • Out: ${stats?.lastCheckOut ?? '--:--'}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          StatusBadge(
            label: isPresent ? 'Present' : 'Completed',
            variant:
                isPresent ? StatusBadgeVariant.success : StatusBadgeVariant.info,
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
    const color = Color(0xFF1a8a3e);
    const label = 'CHECK IN';

    // Expanded punch card — only shown before the first check-in (D13:
    // once checked in the card collapses into the compact pill above).
    // Build children list imperatively to avoid collection-if parsing issues
    final List<Widget> cardChildren = <Widget>[];

    // Header
    cardChildren.add(
      Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.fingerprint_rounded,
              color: color,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: theme.textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: color,
                    letterSpacing: 1.2,
                  ),
                ),
                Text(
                  'Tap to check in',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          StatusBadge(
            label: isPresent ? 'Present' : 'Not checked in',
            variant: isPresent
                ? StatusBadgeVariant.success
                : StatusBadgeVariant.info,
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
              : () {
                  _showScanMethodBottomSheet(context);
                },
          borderRadius: BorderRadius.circular(12),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            width: double.infinity,
            height: 56,
            decoration: BoxDecoration(
              color: state.isLoading
                  ? color.withValues(alpha: 0.5)
                  : color,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Center(
              child: state.isLoading
                  ? const SizedBox(
                      width: 24,
                      height: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: Colors.white,
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.login_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          label,
                          style: theme.textTheme.labelLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.0,
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
              label: 'NFC',
              color: const Color(0xFF2196F3),
              onTap: () => _openNFCScreen(context),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ScanMethodChip(
              icon: Icons.qr_code_scanner_rounded,
              label: 'QR Code',
              color: const Color(0xFF9C27B0),
              onTap: () => _openQRScreen(context),
            ),
          ),
        ],
      ),
    );

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 2,
        ),
      ),
      child: Column(
        children: cardChildren,
      ),
    );
  }

  void _showScanMethodBottomSheet(BuildContext context) {
    final theme = Theme.of(context);
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      backgroundColor: theme.colorScheme.surface,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Text(
              'Select Check-in Method',
              style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 6),
            Text(
              'Choose a physical verification method to record attendance',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            _BottomSheetOption(
              icon: Icons.nfc_rounded,
              label: 'NFC Tag',
              description: 'Scan an NFC tag at the entrance',
              color: const Color(0xFF2196F3),
              onTap: () {
                Navigator.pop(context);
                _openNFCScreen(context);
              },
            ),
            const SizedBox(height: 12),
            _BottomSheetOption(
              icon: Icons.qr_code_scanner_rounded,
              label: 'QR Code',
              description: 'Scan the QR code displayed at the entrance',
              color: const Color(0xFF9C27B0),
              onTap: () {
                Navigator.pop(context);
                _openQRScreen(context);
              },
            ),
          ],
        ),
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
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.25), width: 1.5),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: 8),
              Text(
                label,
                style: theme.textTheme.labelLarge?.copyWith(
                  color: color,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _BottomSheetOption extends StatelessWidget {
  final IconData icon;
  final String label;
  final String description;
  final Color color;
  final VoidCallback onTap;

  const _BottomSheetOption({
    required this.icon,
    required this.label,
    required this.description,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(14),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: color.withValues(alpha: 0.2), width: 1.5),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [color.withValues(alpha: 0.15), color.withValues(alpha: 0.07)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(icon, size: 24, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(description,
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: theme.colorScheme.onSurfaceVariant),
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
