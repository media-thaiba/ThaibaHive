import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Custom page transitions for GoRouter.
///
/// Usage in GoRoute:
/// ```dart
/// GoRoute(
///   path: '/some-route',
///   pageBuilder: (context, state) => AppTransitions.slide(
///     state: state,
///     child: const SomeScreen(),
///   ),
/// )
/// ```
class AppTransitions {
  AppTransitions._();

  /// Slide from right (forward navigation).
  static CustomTransitionPage<void> slide({
    required GoRouterState state,
    required Widget child,
  }) {
    return CustomTransitionPage<void>(
      key: state.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 280),
      reverseTransitionDuration: const Duration(milliseconds: 240),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        const begin = Offset(1.0, 0.0);
        const end = Offset.zero;
        const curve = Curves.easeInOut;

        final tween = Tween(begin: begin, end: end).chain(
          CurveTween(curve: curve),
        );

        final offsetAnimation = animation.drive(tween);

        return SlideTransition(
          position: offsetAnimation,
          child: child,
        );
      },
    );
  }

  /// Slide from bottom (modals, sheets).
  static CustomTransitionPage<void> slideUp({
    required GoRouterState state,
    required Widget child,
  }) {
    return CustomTransitionPage<void>(
      key: state.pageKey,
      child: child,
      opaque: false,
      barrierDismissible: true,
      barrierColor: Colors.black45,
      transitionDuration: const Duration(milliseconds: 300),
      reverseTransitionDuration: const Duration(milliseconds: 250),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        const begin = Offset(0.0, 1.0);
        const end = Offset.zero;
        const curve = Curves.easeOutCubic;

        final tween = Tween(begin: begin, end: end).chain(
          CurveTween(curve: curve),
        );

        final offsetAnimation = animation.drive(tween);

        return SlideTransition(
          position: offsetAnimation,
          child: child,
        );
      },
    );
  }

  /// Fade + slight scale (for dialogs, overlays).
  static CustomTransitionPage<void> fadeScale({
    required GoRouterState state,
    required Widget child,
  }) {
    return CustomTransitionPage<void>(
      key: state.pageKey,
      child: child,
      transitionDuration: const Duration(milliseconds: 200),
      reverseTransitionDuration: const Duration(milliseconds: 180),
      transitionsBuilder: (context, animation, secondaryAnimation, child) {
        final curved = CurvedAnimation(
          parent: animation,
          curve: Curves.easeOut,
          reverseCurve: Curves.easeIn,
        );

        return ScaleTransition(
          scale: Tween<double>(begin: 0.95, end: 1.0).animate(curved),
          child: FadeTransition(
            opacity: Tween<double>(begin: 0.0, end: 1.0).animate(curved),
            child: child,
          ),
        );
      },
    );
  }
}
