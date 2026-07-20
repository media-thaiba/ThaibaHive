import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'tap_scale.dart';

enum AppCardVariant { solid, flat, glass }

class AppCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final Color? borderColor;
  final double? borderRadius;
  final double borderWidth;
  final List<BoxShadow>? customShadows;
  final bool useScaleOnTap;
  final AppCardVariant variant;

  const AppCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(16),
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    this.color,
    this.borderColor,
    this.borderRadius,
    this.borderWidth = 1.0,
    this.customShadows,
    this.useScaleOnTap = true,
    this.variant = AppCardVariant.solid,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final radius = borderRadius ?? AppRadius.card;

    Color resolvedColor;
    Color resolvedBorderColor;
    List<BoxShadow> resolvedShadows;

    switch (variant) {
      case AppCardVariant.flat:
        resolvedColor = color ??
            (isDark
                ? Colors.white.withOpacity(0.04)
                : Colors.white.withOpacity(0.65));
        resolvedBorderColor = borderColor ??
            (isDark
                ? Colors.white.withOpacity(0.06)
                : const Color(0xFFd4dbd4).withOpacity(0.35));
        resolvedShadows = customShadows ?? [];
        break;
      case AppCardVariant.glass:
        resolvedColor = color ??
            (isDark
                ? const Color(0xFF22262b).withOpacity(0.4)
                : Colors.white.withOpacity(0.65));
        resolvedBorderColor = borderColor ??
            (isDark
                ? Colors.white.withOpacity(0.08)
                : const Color(0xFFd4dbd4).withOpacity(0.4));
        resolvedShadows = customShadows ?? AppColors.surfaceShadow2(context);
        break;
      case AppCardVariant.solid:
      default:
        resolvedColor = color ?? AppColors.card(context);
        resolvedBorderColor = borderColor ??
            (isDark
                ? Colors.white.withOpacity(0.06)
                : const Color(0xFFd4dbd4).withOpacity(0.5));
        resolvedShadows = customShadows ?? AppColors.surfaceShadow2(context);
        break;
    }

    Widget cardWidget = Container(
      margin: margin,
      decoration: BoxDecoration(
        color: resolvedColor,
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(
          color: resolvedBorderColor,
          width: borderWidth,
        ),
        boxShadow: resolvedShadows,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius - borderWidth),
        child: variant == AppCardVariant.glass
            ? BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
                child: _buildInner(context),
              )
            : _buildInner(context),
      ),
    );

    if (variant == AppCardVariant.glass) {
      cardWidget = RepaintBoundary(child: cardWidget);
    }

    if (onTap != null && useScaleOnTap) {
      cardWidget = TapScale(
        onTap: onTap,
        child: cardWidget,
      );
    }

    return cardWidget;
  }

  Widget _buildInner(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: useScaleOnTap ? null : onTap,
        child: Padding(
          padding: padding ?? EdgeInsets.zero,
          child: child,
        ),
      ),
    );
  }
}
