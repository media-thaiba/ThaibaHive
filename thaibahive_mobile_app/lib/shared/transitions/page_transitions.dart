import 'package:flutter/cupertino.dart';
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

  /// Slide from right (forward navigation) with interactive edge-swipe back support.
  static Page<void> slide({
    required GoRouterState state,
    required Widget child,
  }) {
    return CupertinoPage<void>(
      key: state.pageKey,
      child: child,
    );
  }

  /// Slide from bottom (modals, sheets).
  static Page<void> slideUp({
    required GoRouterState state,
    required Widget child,
  }) {
    return CupertinoPage<void>(
      key: state.pageKey,
      fullscreenDialog: true,
      child: child,
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
