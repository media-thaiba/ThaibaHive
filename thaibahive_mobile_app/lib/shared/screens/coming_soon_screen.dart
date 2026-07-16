import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class ComingSoonScreen extends StatelessWidget {
  final String title;
  final IconData? icon;

  const ComingSoonScreen({
    super.key,
    required this.title,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(title),
        elevation: 0,
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Spacer(),
              // Icon container with premium glow/gradients
              Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 120,
                      height: 120,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            theme.colorScheme.primary.withValues(alpha: 0.15),
                            theme.colorScheme.primary.withValues(alpha: 0.0),
                          ],
                        ),
                      ),
                    ),
                    Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        color: isDark ? const Color(0xFF2C2C2C) : Colors.white,
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.05),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Icon(
                        icon ?? Icons.lock_outline_rounded,
                        size: 40,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: theme.colorScheme.secondary,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isDark ? const Color(0xFF121212) : const Color(0xFFF5F5F5),
                            width: 3,
                          ),
                        ),
                        child: const Icon(
                          Icons.upcoming_rounded,
                          size: 16,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              // Heading
              Text(
                'Coming Soon',
                style: theme.textTheme.headlineMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  letterSpacing: -0.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              // Description
              Text(
                'The "$title" module is scheduled for a future update. We are working hard to bring this feature to your mobile device soon.',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.6),
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const Spacer(),
              // Back Button
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => context.pop(),
                  icon: const Icon(Icons.arrow_back_rounded),
                  label: const Text('Go Back'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}
