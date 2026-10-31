import 'package:flutter/material.dart';

enum StatusBadgeVariant {
  success,
  warning,
  destructive,
  info,
  secondary,
}

class StatusBadge extends StatelessWidget {
  final String label;
  final StatusBadgeVariant variant;
  final Color? customColor;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  const StatusBadge({
    super.key,
    required this.label,
    this.variant = StatusBadgeVariant.secondary,
    this.customColor,
    this.borderRadius = 20,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    Color color;
    switch (variant) {
      case StatusBadgeVariant.success:
        color = isDark ? const Color(0xFF34D399) : const Color(0xFF047857);
        break;
      case StatusBadgeVariant.warning:
        color = isDark ? const Color(0xFFFBBF24) : const Color(0xFF92400E);
        break;
      case StatusBadgeVariant.destructive:
        color = isDark ? const Color(0xFFFB7185) : const Color(0xFFDC2626);
        break;
      case StatusBadgeVariant.info:
        color = isDark ? const Color(0xFF38BDF8) : const Color(0xFF0369A1);
        break;
      case StatusBadgeVariant.secondary:
        color = isDark ? const Color(0xFF94A3B8) : const Color(0xFF475569);
        break;
    }

    if (customColor != null) {
      color = customColor!;
    }

    return Semantics(
      label: '$label status',
      container: true,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(borderRadius),
          border: Border.all(
            color: color.withValues(alpha: 0.25),
            width: 1,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontFamily: 'PlusJakartaSans',
            color: color,
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    );
  }
}
