import 'package:flutter/material.dart';
import 'tap_scale.dart';

class AppErrorWidget extends StatelessWidget {
  final String message;
  final String? title;
  final VoidCallback? onRetry;
  final IconData icon;

  const AppErrorWidget({
    super.key,
    this.message = 'Something went wrong.',
    this.title,
    this.onRetry,
    this.icon = Icons.error_outline_rounded,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: theme.colorScheme.error.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: theme.colorScheme.error.withValues(alpha: 0.15),
                  width: 1.5,
                ),
              ),
              child: Icon(
                icon,
                size: 36,
                color: theme.colorScheme.error,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title ?? 'Something Went Wrong',
              style: theme.textTheme.titleMedium?.copyWith(
                fontFamily: 'PlusJakartaSans',
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontFamily: 'PlusJakartaSans',
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 24),
              TapScale(
                onTap: onRetry,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.error,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: theme.colorScheme.error.withValues(alpha: 0.25),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.refresh_rounded, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        'Try Again',
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontFamily: 'PlusJakartaSans',
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class EmptyStateWidget extends StatelessWidget {
  final String message;
  final String? title;
  final IconData icon;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateWidget({
    super.key,
    this.message = 'No data available.',
    this.title,
    this.icon = Icons.inbox_rounded,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final primaryColor = theme.colorScheme.primary;

    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: primaryColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(22),
                border: Border.all(
                  color: primaryColor.withValues(alpha: 0.15),
                  width: 1.5,
                ),
              ),
              child: Icon(
                icon,
                size: 38,
                color: primaryColor,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title ?? 'No Data Found',
              style: theme.textTheme.titleMedium?.copyWith(
                fontFamily: 'PlusJakartaSans',
                fontWeight: FontWeight.w700,
                color: theme.colorScheme.onSurface,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              style: theme.textTheme.bodyMedium?.copyWith(
                fontFamily: 'PlusJakartaSans',
                color: theme.colorScheme.onSurface.withValues(alpha: 0.55),
                height: 1.4,
              ),
              textAlign: TextAlign.center,
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 24),
              TapScale(
                onTap: onAction,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  decoration: BoxDecoration(
                    color: primaryColor,
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: primaryColor.withValues(alpha: 0.25),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.add_rounded, color: Colors.white, size: 18),
                      const SizedBox(width: 8),
                      Text(
                        actionLabel!,
                        style: theme.textTheme.labelLarge?.copyWith(
                          fontFamily: 'PlusJakartaSans',
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
