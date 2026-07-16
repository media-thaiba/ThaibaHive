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
        color = const Color(0xFF1a8a3e);
        break;
      case StatusBadgeVariant.warning:
        color = const Color(0xFFFF9800);
        break;
      case StatusBadgeVariant.destructive:
        color = Colors.red;
        break;
      case StatusBadgeVariant.info:
        color = const Color(0xFF2196F3);
        break;
      case StatusBadgeVariant.secondary:
        color = isDark ? const Color(0xFF9e9e9e) : const Color(0xFF607D8B);
        break;
    }

    if (customColor != null) {
      color = customColor!;
    }

    return Container(
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
    );
  }
}
