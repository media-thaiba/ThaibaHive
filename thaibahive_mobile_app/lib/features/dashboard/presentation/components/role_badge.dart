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
    final gradients = ThaibaHiveTheme.roleBadgeGradients;
    final colors = gradients[role.toLowerCase()] ??
        [const Color(0xFF6B7280), const Color(0xFF9CA3AF)];

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: colors,
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(borderRadius),
        boxShadow: [
          BoxShadow(
            color: colors.first.withValues(alpha: 0.3),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Text(
        _label,
        style: const TextStyle(
          fontFamily: 'PlusJakartaSans',
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: Colors.white,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}
