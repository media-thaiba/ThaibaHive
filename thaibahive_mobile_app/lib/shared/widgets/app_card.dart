import 'package:flutter/material.dart';
import 'tap_scale.dart';

class AppCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? borderColor;
  final double borderRadius;
  final double borderWidth;
  final List<BoxShadow>? customShadows;
  final bool useScaleOnTap;

  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    this.color,
    this.borderColor,
    this.borderRadius = 16,
    this.borderWidth = 1.0,
    this.customShadows,
    this.useScaleOnTap = true,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final resolvedColor = color ?? (isDark ? const Color(0xFF22262b) : Colors.white);
    final resolvedBorderColor = borderColor ?? 
        (isDark 
            ? Colors.white.withValues(alpha: 0.06) 
            : const Color(0xFFd4dbd4).withValues(alpha: 0.5));

    final resolvedShadows = customShadows ?? [
      BoxShadow(
        color: Colors.black.withValues(alpha: isDark ? 0.3 : 0.05),
        blurRadius: 10,
        offset: const Offset(0, 2),
      ),
    ];

    Widget cardWidget = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: resolvedColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: resolvedBorderColor,
          width: borderWidth,
        ),
        boxShadow: resolvedShadows,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius - borderWidth),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: useScaleOnTap ? null : onTap,
            child: Padding(
              padding: padding ?? EdgeInsets.zero,
              child: child,
            ),
          ),
        ),
      ),
    );

    if (onTap != null && useScaleOnTap) {
      cardWidget = TapScale(
        onTap: onTap,
        child: cardWidget,
      );
    }

    return cardWidget;
  }
}
