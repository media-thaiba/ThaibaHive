import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/app/theme.dart';
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
  late Animation<double> _opacityAnimation;

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
    _opacityAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.5, curve: Curves.easeOut)),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceProvider);
    final stats = state.stats;
    final hasCheckIn = stats?.lastCheckIn != null;
    final hasCheckOut = stats?.lastCheckOut != null;
    final isPresent = stats?.todayStatus == 'present';

    // Determine if we should show compact or expanded view
    final isCompact = hasCheckIn && hasCheckOut;
    final isCheckedIn = hasCheckIn && !hasCheckOut;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOutCubic,
          transform: Matrix4.identity()..scale(_scaleAnimation.value),
          height: isCompact ? null : 220, // Expanded height
          child: Opacity(
            opacity: _opacityAnimation.value,
            child: _buildCard(
              context,
              isCompact,
              isCheckedIn,
              isPresent,
              stats,
              state,
              hasCheckIn,
              hasCheckOut,
            ),
          ),
        );
      },
    );
  }

  Widget _buildCard(
    BuildContext context,
    bool isCompact,
    bool isCheckedIn,
    bool isPresent,
    AttendanceStatsModel? stats,
    AttendanceState state,
    bool hasCheckIn,
    bool hasCheckOut,
  ) {
    final theme = Theme.of(context);
    final color = isCheckedIn ? Colors.orange : const Color(0xFF1a8a3e);
    final label = isCheckedIn ? 'CHECK OUT' : 'CHECK IN';

    if (isCompact) {
      // Compact status pill after both check-in and check-out
      return Container(
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
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
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
              variant: isPresent ? StatusBadgeVariant.success : StatusBadgeVariant.info,
            ),
          ],
        ),
      );
    }

    // Expanded punch card (before punch or after check-in only)
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
                  isCheckedIn ? 'Tap to check out' : 'Tap to check in',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant,
                  ),
                ),
              ],
            ),
          ),
          StatusBadge(
            label: isPresent ? 'Present' : isCheckedIn ? 'Checked In' : 'Not checked in',
            variant: isPresent
                ? StatusBadgeVariant.success
                : isCheckedIn
                    ? StatusBadgeVariant.warning
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
              : () async {
                  if (isCheckedIn) {
                    try {
                      await ref.read(attendanceProvider.notifier).checkOut();
                      widget.onPunchComplete?.call();
                    } catch (_) {
                      // Error handled by provider
                    }
                  } else {
                    _showScanMethodBottomSheet(context);
                  }
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
                          isCheckedIn ? Icons.logout_rounded : Icons.login_rounded,
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

    // Scan method buttons (only when not checked in)
    if (!isCheckedIn) {
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
    }

    // Today status times (compact)
    if (hasCheckIn || hasCheckOut) {
      cardChildren.add(const SizedBox(height: 16));
      cardChildren.add(
        Row(
          children: [
            _TimeTile(
              label: 'Check In',
              time: stats?.lastCheckIn ?? '--:--',
              icon: Icons.login_rounded,
              color: const Color(0xFF1a8a3e),
            ),
            Container(height: 40, width: 1, color: theme.colorScheme.outlineVariant),
            _TimeTile(
              label: 'Check Out',
              time: stats?.lastCheckOut ?? '--:--',
              icon: Icons.logout_rounded,
              color: Colors.red,
            ),
          ],
        ),
      );
    }

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

class _TimeTile extends StatelessWidget {
  final String label;
  final String time;
  final IconData icon;
  final Color color;

  const _TimeTile({
    required this.label,
    required this.time,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDash = time.contains('--');
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: isDash ? theme.colorScheme.onSurfaceVariant : color, size: 20),
          const SizedBox(height: 4),
          Text(
            time,
            style: TextStyle(
              fontFamily: 'PlusJakartaSans',
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: isDash ? theme.colorScheme.onSurfaceVariant : theme.colorScheme.onSurface,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.labelSmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ),
    );
  }
}