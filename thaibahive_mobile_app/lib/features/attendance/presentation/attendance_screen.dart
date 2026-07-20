import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/features/attendance/data/attendance_provider.dart';
import 'package:thaibahive_mobile/features/attendance/presentation/nfc_scan_screen.dart';
import 'package:thaibahive_mobile/features/attendance/presentation/qr_scan_screen.dart';
import 'package:thaibahive_mobile/models/attendance_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';
import 'package:thaibahive_mobile/shared/widgets/error_widget.dart';

enum _ButtonState { idle, pressed, loading, success, failure }

class AttendanceScreen extends ConsumerStatefulWidget {
  const AttendanceScreen({super.key});

  @override
  ConsumerState<AttendanceScreen> createState() => _AttendanceScreenState();
}

class _AttendanceScreenState extends ConsumerState<AttendanceScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseOpacity;
  late Animation<double> _pulseScale;

  _ButtonState _buttonState = _ButtonState.idle;
  late AnimationController _successController;
  late AnimationController _failureController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    )..repeat(reverse: true);

    _pulseOpacity = Tween<double>(begin: 0.25, end: 0.7).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _pulseScale = Tween<double>(begin: 1.0, end: 1.04).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _successController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _failureController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _successController.dispose();
    _failureController.dispose();
    super.dispose();
  }

  void _triggerSuccess() {
    setState(() => _buttonState = _ButtonState.success);
    HapticFeedback.mediumImpact();
    _successController.forward(from: 0).then((_) {
      if (mounted) setState(() => _buttonState = _ButtonState.idle);
    });
  }

  void _triggerFailure() {
    setState(() => _buttonState = _ButtonState.failure);
    HapticFeedback.heavyImpact();
    _failureController.forward(from: 0).then((_) {
      if (mounted) setState(() => _buttonState = _ButtonState.idle);
    });
  }

  void _openNFCScreen(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const NFCScanScreen()));
  }

  void _openQRScreen(BuildContext context) {
    Navigator.of(context).push(MaterialPageRoute(builder: (_) => const QRScanScreen()));
  }

  void _showScanMethodBottomSheet(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.sheet)),
      ),
      backgroundColor: isDark ? const Color(0xFF22262b) : Colors.white,
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.15),
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
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
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

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceProvider);
    final stats = state.stats;
    final hasCheckIn = stats?.lastCheckIn != null;
    final hasCheckOut = stats?.lastCheckOut != null;
    final isPresent = stats?.todayStatus == 'present';

    return Scaffold(
      appBar: AppBar(title: const Text('Attendance')),
      body: RefreshIndicator(
        color: const Color(0xFF1a8a3e),
        onRefresh: () => ref.read(attendanceProvider.notifier).refresh(),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
          child: Column(
            children: [
              if (state.isLoading && stats == null)
                const _AttendanceShimmer()
              else if (state.error != null && stats == null)
                AppErrorWidget(
                  message: state.error!,
                  onRetry: () => ref.read(attendanceProvider.notifier).refresh(),
                )
              else ...[
                const SizedBox(height: 12),
                RepaintBoundary(
                  child: _CheckInOutButton(
                    isCheckedIn: hasCheckIn && !hasCheckOut,
                    isPresent: isPresent,
                    pulseOpacity: _pulseOpacity,
                    pulseScale: _pulseScale,
                    buttonState: _buttonState,
                    successController: _successController,
                    failureController: _failureController,
                    onCheckIn: () => _showScanMethodBottomSheet(context),
                    onCheckOut: () async {
                      setState(() => _buttonState = _ButtonState.loading);
                      try {
                        await ref.read(attendanceProvider.notifier).checkOut();
                        if (mounted) _triggerSuccess();
                      } catch (_) {
                        if (mounted) _triggerFailure();
                      }
                    },
                    isLoading: state.isLoading,
                  ),
                ),
                if (!hasCheckIn || hasCheckOut) ...[
                  const SizedBox(height: 20),
                  _ScanMethodButtons(
                    onNFCScan: () => _openNFCScreen(context),
                    onQRScan: () => _openQRScreen(context),
                  ),
                ],
                const SizedBox(height: 28),
                _TodayStatusCard(stats: stats, isPresent: isPresent),
                const SizedBox(height: 24),
                _MonthlySummary(stats: stats),
                const SizedBox(height: 24),
                _RecentLogs(logs: state.logs),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

// ── Check-In/Out Button (glassmorphic, state machine) ────────────────────────

class _CheckInOutButton extends StatelessWidget {
  final bool isCheckedIn;
  final bool isPresent;
  final Animation<double> pulseOpacity;
  final Animation<double> pulseScale;
  final _ButtonState buttonState;
  final AnimationController successController;
  final AnimationController failureController;
  final VoidCallback onCheckIn;
  final VoidCallback onCheckOut;
  final bool isLoading;

  const _CheckInOutButton({
    required this.isCheckedIn,
    required this.isPresent,
    required this.pulseOpacity,
    required this.pulseScale,
    required this.buttonState,
    required this.successController,
    required this.failureController,
    required this.onCheckIn,
    required this.onCheckOut,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    final color = isCheckedIn ? const Color(0xFFFF9800) : const Color(0xFF1a8a3e);
    final label = isCheckedIn ? 'CHECK OUT' : 'CHECK IN';
    final sublabel = isCheckedIn ? 'Tap to check out' : 'Tap to check in';
    final isPressed = buttonState == _ButtonState.pressed;
    final isIdle = buttonState == _ButtonState.idle;
    final isSuccess = buttonState == _ButtonState.success;
    final isFailure = buttonState == _ButtonState.failure;

    return Semantics(
      label: '$label button. Tap to record attendance.',
      button: true,
      child: Column(
        children: [
          GestureDetector(
            onTapDown: isIdle ? (_) {} : null,
            onTapUp: isIdle ? (_) {} : null,
            onTapCancel: isIdle ? () {} : null,
            onTap: (isLoading || !isIdle) ? null : (isCheckedIn ? onCheckOut : onCheckIn),
            child: AnimatedScale(
              scale: isPressed ? 0.95 : 1.0,
              duration: const Duration(milliseconds: 100),
              child: SizedBox(
                width: 220,
                height: 220,
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    // ── Outer pulse ring ──
                    if (isIdle && (isCheckedIn || isPresent))
                      AnimatedBuilder(
                        animation: Listenable.merge([pulseOpacity, pulseScale]),
                        builder: (_, child) => Opacity(
                          opacity: pulseOpacity.value,
                          child: Container(
                            width: 200,
                            height: 200,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: color.withValues(alpha: 0.28),
                                  blurRadius: 48,
                                  spreadRadius: 8,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                    // ── Success burst ring ──
                    if (isSuccess)
                      AnimatedBuilder(
                        animation: successController,
                        builder: (_, child) => Transform.scale(
                          scale: 0.8 + 0.6 * successController.value,
                          child: Opacity(
                            opacity: 1.0 - successController.value,
                            child: Container(
                              width: 200,
                              height: 200,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: const Color(0xFF1a8a3e).withValues(alpha: 0.5),
                                  width: 3,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),

                    // ── Failure red glow ──
                    if (isFailure)
                      AnimatedBuilder(
                        animation: failureController,
                        builder: (_, child) => Opacity(
                          opacity: (1.0 - failureController.value) * 0.5,
                          child: Container(
                            width: 200,
                            height: 200,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.red.withValues(alpha: 0.4),
                                  blurRadius: 40,
                                  spreadRadius: 6,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),

                    // ── Main button (glassmorphic) ──
                    Container(
                      width: 180,
                      height: 180,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: (isSuccess
                                ? const Color(0xFF1a8a3e)
                                : isFailure
                                    ? Colors.red
                                    : color)
                            .withValues(alpha: 0.12),
                        border: Border.all(
                          color: (isSuccess
                                  ? const Color(0xFF1a8a3e)
                                  : isFailure
                                      ? Colors.red
                                      : color)
                              .withValues(alpha: 0.6),
                          width: 2.5,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: (isSuccess
                                    ? const Color(0xFF1a8a3e)
                                    : isFailure
                                        ? Colors.red
                                        : color)
                                .withValues(alpha: 0.3),
                            blurRadius: 20,
                            spreadRadius: 0,
                          ),
                        ],
                      ),
                      child: ClipOval(
                        child: BackdropFilter(
                          filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                          child: Center(
                            child: _buildButtonContent(
                              color: color,
                              label: label,
                              isCheckedIn: isCheckedIn,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 14),
          Text(
            sublabel,
            style: TextStyle(
              fontFamily: 'PlusJakartaSans',
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButtonContent({
    required Color color,
    required String label,
    required bool isCheckedIn,
  }) {
    switch (buttonState) {
      case _ButtonState.loading:
        return SizedBox(
          width: 36,
          height: 36,
          child: CircularProgressIndicator(strokeWidth: 3, color: color),
        );
      case _ButtonState.success:
        return const Icon(Icons.check_rounded, size: 52, color: Color(0xFF1a8a3e));
      case _ButtonState.failure:
        return Icon(Icons.close_rounded, size: 52, color: Colors.red.withValues(alpha: 0.8));
      case _ButtonState.idle:
      case _ButtonState.pressed:
        return Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.fingerprint_rounded, size: 52, color: color),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'PlusJakartaSans',
                color: color,
                fontWeight: FontWeight.w800,
                fontSize: 13,
                letterSpacing: 1.5,
              ),
            ),
          ],
        );
    }
  }
}

// ── Scan Method Buttons ──────────────────────────────────────────────────────

class _ScanMethodButtons extends StatelessWidget {
  final VoidCallback onNFCScan;
  final VoidCallback onQRScan;

  const _ScanMethodButtons({required this.onNFCScan, required this.onQRScan});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _ScanMethodChip(icon: Icons.nfc_rounded, label: 'NFC', onTap: onNFCScan, color: const Color(0xFF2196F3)),
        const SizedBox(width: 14),
        _ScanMethodChip(icon: Icons.qr_code_scanner_rounded, label: 'QR Code', onTap: onQRScan, color: const Color(0xFF9C27B0)),
      ],
    );
  }
}

class _ScanMethodChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color color;

  const _ScanMethodChip({required this.icon, required this.label, required this.onTap, required this.color});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(AppRadius.button),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.button),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 11),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(AppRadius.button),
            border: Border.all(color: color.withValues(alpha: 0.25), width: 1.5),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: AppIconSize.list, color: color),
              const SizedBox(width: 7),
              Text(
                label,
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  color: color,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Bottom Sheet Option ──────────────────────────────────────────────────────

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
                  borderRadius: BorderRadius.circular(AppRadius.button),
                ),
                child: Icon(icon, size: AppIconSize.button, color: color),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(label, style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 2),
                    Text(description, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55))),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: theme.colorScheme.onSurface.withValues(alpha: 0.3)),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Today Status Card ────────────────────────────────────────────────────────

class _TodayStatusCard extends StatelessWidget {
  final AttendanceStatsModel? stats;
  final bool isPresent;

  const _TodayStatusCard({required this.stats, required this.isPresent});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppCard(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(18),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Today's Status", style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
              StatusBadge(
                label: isPresent ? 'Present' : 'Not checked in',
                variant: isPresent ? StatusBadgeVariant.success : StatusBadgeVariant.warning,
              ),
            ],
          ),
          const SizedBox(height: 20),
          Row(
            children: [
              _TimeTile(
                label: 'Check In',
                time: stats?.lastCheckIn ?? '--:-- --',
                icon: Icons.login_rounded,
                color: const Color(0xFF1a8a3e),
              ),
              Container(height: 48, width: 1, color: theme.colorScheme.onSurface.withValues(alpha: 0.08)),
              _TimeTile(
                label: 'Check Out',
                time: stats?.lastCheckOut ?? '--:-- --',
                icon: Icons.logout_rounded,
                color: Colors.red,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TimeTile extends StatelessWidget {
  final String label;
  final String time;
  final IconData icon;
  final Color color;

  const _TimeTile({required this.label, required this.time, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDash = time.contains('--');
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: isDash ? theme.colorScheme.onSurface.withValues(alpha: 0.3) : color, size: AppIconSize.list),
          const SizedBox(height: 6),
          Text(
            time,
            style: TextStyle(
              fontFamily: 'PlusJakartaSans',
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: isDash ? theme.colorScheme.onSurface.withValues(alpha: 0.3) : theme.colorScheme.onSurface,
            ),
          ),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
          ),
        ],
      ),
    );
  }
}

// ── Monthly Summary (horizontal pill cards) ──────────────────────────────────

class _MonthlySummary extends StatelessWidget {
  final AttendanceStatsModel? stats;
  const _MonthlySummary({required this.stats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (stats == null) return const SizedBox.shrink();

    final items = [
      _SummaryItem(label: 'Present', value: '${stats!.presentDays}', color: const Color(0xFF1a8a3e), icon: Icons.check_circle_rounded),
      _SummaryItem(label: 'Absent', value: '${stats!.absentDays}', color: Colors.red, icon: Icons.cancel_rounded),
      _SummaryItem(label: 'Late', value: '${stats!.lateDays}', color: const Color(0xFFFF9800), icon: Icons.warning_amber_rounded),
      _SummaryItem(label: 'Half Day', value: '${stats!.halfDays}', color: const Color(0xFF2196F3), icon: Icons.wb_cloudy_rounded),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Monthly Summary', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: items.map((item) {
              return AppCard(
                margin: const EdgeInsets.only(right: 10),
                padding: const EdgeInsets.all(8),
                color: theme.brightness == Brightness.dark ? const Color(0xFF22262b) : Colors.white,
                borderColor: theme.brightness == Brightness.dark ? Colors.white.withValues(alpha: 0.06) : item.color.withValues(alpha: 0.15),
                child: SizedBox(
                  width: 72,
                  height: 72,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(item.icon, color: item.color, size: AppIconSize.list),
                      const SizedBox(height: 5),
                      Text(
                        item.value,
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: item.color,
                          height: 1,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        item.label,
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontSize: 10.5,
                          fontWeight: FontWeight.w500,
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }
}

class _SummaryItem {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  const _SummaryItem({required this.label, required this.value, required this.color, required this.icon});
}

// ── Recent Logs ──────────────────────────────────────────────────────────────

class _RecentLogs extends StatelessWidget {
  final List<AttendanceLogModel> logs;
  const _RecentLogs({required this.logs});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (logs.isEmpty) {
      return AppCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.history_rounded, size: AppIconSize.hero, color: theme.colorScheme.onSurface.withValues(alpha: 0.25)),
              const SizedBox(height: 10),
              Text(
                'No attendance logs yet',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.45)),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Recent Logs', style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        ...logs.map((log) => _LogTile(log: log)),
      ],
    );
  }
}

class _LogTile extends StatelessWidget {
  final AttendanceLogModel log;
  const _LogTile({required this.log});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final statusColor = log.status == 'present'
        ? const Color(0xFF1a8a3e)
        : log.status == 'absent'
            ? Colors.red
            : log.status == 'late'
                ? const Color(0xFFFF9800)
                : const Color(0xFF2196F3);

    final badgeVariant = log.status == 'present'
        ? StatusBadgeVariant.success
        : log.status == 'absent'
            ? StatusBadgeVariant.destructive
            : log.status == 'late'
                ? StatusBadgeVariant.warning
                : StatusBadgeVariant.info;

    final date = DateTime.tryParse(log.date);
    final formattedDate = date != null ? DateFormat('dd MMM yyyy').format(date) : log.date;

    return AppCard(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      onTap: () {},
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(AppRadius.button),
            ),
            child: Icon(
              log.status == 'present'
                  ? Icons.check_rounded
                  : log.status == 'absent'
                      ? Icons.close_rounded
                      : Icons.access_time_rounded,
              color: statusColor,
              size: AppIconSize.list,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(formattedDate, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 2),
                Text(
                  '${log.checkIn ?? '--'} – ${log.checkOut ?? '--'}',
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurface.withValues(alpha: 0.55)),
                ),
              ],
            ),
          ),
          if (log.workedMinutes != null) ...[
            Text(
              '${(log.workedMinutes! / 60).toStringAsFixed(1)}h',
              style: TextStyle(
                fontFamily: 'PlusJakartaSans',
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: theme.colorScheme.primary,
              ),
            ),
            const SizedBox(width: 8),
          ],
          StatusBadge(
            label: log.status,
            variant: badgeVariant,
          ),
        ],
      ),
    );
  }
}

// ── Shimmer ──────────────────────────────────────────────────────────────────

class _AttendanceShimmer extends StatelessWidget {
  const _AttendanceShimmer();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF2a2e33) : Colors.grey.shade200,
      highlightColor: isDark ? const Color(0xFF3a3e43) : Colors.grey.shade100,
      child: Column(
        children: [
          Container(
            width: 180,
            height: 180,
            decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white),
          ),
          const SizedBox(height: 28),
          Container(height: 100, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(AppRadius.card))),
          const SizedBox(height: AppSpacing.dashboardSection),
          Container(height: 100, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(AppRadius.card))),
        ],
      ),
    );
  }
}
