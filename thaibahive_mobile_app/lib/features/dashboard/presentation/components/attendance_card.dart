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

    final isDark = theme.brightness == Brightness.dark;
    final statusColor =
        isPresent ? const Color(0xFF1a8a3e) : const Color(0xFFFF9800);
    final cardBorderColor = statusColor.withValues(alpha: isDark ? 0.3 : 0.2);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.section),
      child: AppCard(
        margin: EdgeInsets.zero,
        padding: const EdgeInsets.all(AppSpacing.section),
        borderColor: cardBorderColor,
        borderWidth: 1.5,
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
                        'In: ${stats.todayCheckIn ?? '--:--'}'
                        '  \u00b7  '
                        'Out: ${stats.todayCheckOut ?? '--:--'}',
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
                        'Tap NFC or scan QR code',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: AppColors.mutedForeground(context)
                              .withValues(alpha: 0.7),
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
                  color: const Color(0xFFFF9800),
                  onTap: () {
                    HapticFeedback.lightImpact();
                    context.push('/attendance');
                  },
                ),
                const SizedBox(height: AppSpacing.compact),
                _ScanButton(
                  label: 'SCAN QR',
                  icon: Icons.qr_code_scanner_rounded,
                  color: const Color(0xFF9C27B0),
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
  final Color color;
  final VoidCallback onTap;

  const _ScanButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = color.withValues(alpha: isDark ? 0.15 : 0.08);
    final borderColor = color.withValues(alpha: isDark ? 0.35 : 0.25);
    final textColor = isDark ? color.withValues(alpha: 0.9) : color;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 105,
        padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.normal, vertical: AppSpacing.compact),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(AppRadius.button),
          border: Border.all(
            color: borderColor,
            width: 1.0,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: textColor, size: 16),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontFamily: 'PlusJakartaSans',
                fontSize: 10.5,
                fontWeight: FontWeight.w800,
                color: textColor,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
