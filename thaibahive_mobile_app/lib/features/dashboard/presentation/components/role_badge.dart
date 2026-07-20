import 'package:flutter/material.dart';
import 'package:thaibahive_mobile/app/theme.dart';

/// Displays a role name (e.g. "HOD", "ADMIN") in a gradient pill badge.
///
/// The gradient colours come from [ThaibaHiveTheme.roleBadgeGradients].
/// Falls back to a neutral grey gradient for unknown roles.
class RoleBadge extends StatelessWidget {
  final String role;
  final double borderRadius;
  final EdgeInsetsGeometry padding;

  const RoleBadge({
    super.key,
    required this.role,
    this.borderRadius = AppRadius.badge,
    this.padding = const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
  });

  String get _label {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return 'SUPER ADMIN';
      case 'admin':
        return 'ADMIN';
      case 'principal':
        return 'PRINCIPAL';
      case 'hod':
        return 'HOD';
      default:
        return 'STAFF';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final gradients = ThaibaHiveTheme.roleBadgeGradients;
    final colors = gradients[role.toLowerCase()] ??
        [const Color(0xFF6B7280), const Color(0xFF9CA3AF)];
    final primaryColor = colors.first;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: primaryColor.withValues(alpha: isDark ? 0.15 : 0.08),
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(
          color: primaryColor.withValues(alpha: isDark ? 0.35 : 0.25),
          width: 1.0,
        ),
      ),
      child: Text(
        _label,
        style: TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 9.5,
          fontWeight: FontWeight.w800,
          color: primaryColor,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}
