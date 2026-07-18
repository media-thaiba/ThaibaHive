import 'package:flutter/material.dart';

class AuthHeader extends StatelessWidget {
  const AuthHeader({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Image.asset(
          'assets/images/thl_logo_3d.png',
          width: 130,
          height: 130,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 20),
        Image.asset(
          'assets/images/thl_name.png',
          height: 32,
          fit: BoxFit.contain,
        ),
        const SizedBox(height: 8),
        Text(
          'Unified Staff Management Platform',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
          ),
        ),
      ],
    );
  }
}
