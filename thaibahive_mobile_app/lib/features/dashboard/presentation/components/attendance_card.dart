import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/models/dashboard_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';
import 'breathing_dot.dart';

/// A premium attendance status card with check-in/out info and NFC/QR buttons.
class AttendanceCard extends StatelessWidget {
  final DashboardStatsModel stats;

  const AttendanceCard({super.key, required this.stats});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasCheckIn = stats.todayCheckIn != null;
    final hasCheckOut = stats.todayCheckOut != null;
    final isPresent = stats.todayStatus == 'present';

    final statusColor =
        isPresent ? const Color(0xFF1a8a3e) : const Color(0xFFFF9800);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.section),
      child: AppCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(AppSpacing.section),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Left: Status info ──
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      BreathingDot(
                        color: statusColor,
                        isActive: isPresent,
                      ),
                      const SizedBox(width: AppSpacing.normal),
                      Text(
                        hasCheckIn ? 'Checked In' : 'Not Yet Checked In',
                        style: theme.textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.compact),
                  if (hasCheckIn || hasCheckOut)
                    Padding(
                      padding: const EdgeInsets.only(left: AppSpacing.normal + 10),
                      child: Text(
                        '${hasCheckIn ? 'In: ${stats.todayCheckIn}' : ''}'
                        '${hasCheckIn && hasCheckOut ? '  \u00b7  ' : ''}'
                        '${hasCheckOut ? 'Out: ${stats.todayCheckOut}' : ''}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.mutedForeground(context),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    )
                  else
                    Padding(
                      padding: const EdgeInsets.only(left: AppSpacing.normal + 10),
                      child: Text(
                        'Tap NFC or QR to check in',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.mutedForeground(context)
                              .withValues(alpha: 0.6),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // ── Right: NFC + QR buttons (stacked vertically) ──
            Column(
              children: [
                _ScanButton(
                  label: 'TAP NFC',
                  icon: Icons.nfc_rounded,
                  gradient: const LinearGradient(
                    colors: [Color(0xFFFF9800), Color(0xFFFFB74D)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    context.push('/attendance');
                  },
                ),
                const SizedBox(height: AppSpacing.compact),
                _ScanButton(
                  label: 'SCAN QR',
                  icon: Icons.qr_code_scanner_rounded,
                  gradient: const LinearGradient(
                    colors: [Color(0xFF9C27B0), Color(0xFFBA68C8)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    context.push('/attendance');
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ScanButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Gradient gradient;
  final VoidCallback onTap;

  const _ScanButton({
    required this.label,
    required this.icon,
    required this.gradient,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 110,
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.normal, vertical: AppSpacing.compact),
        decoration: BoxDecoration(
          gradient: gradient,
          borderRadius: BorderRadius.circular(AppRadius.button),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Colors.white, size: 18),
            const SizedBox(width: 6),
            Text(
              label,
              style: const TextStyle(
                fontFamily: 'PlusJakartaSans',
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
