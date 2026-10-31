import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Wraps a child with a subtle scale animation and a light haptic tick on tap.
///
/// The haptic fires on touch-down (not release) so the surface feels
/// responsive the instant it is pressed.
///
/// Usage:
/// ```dart
/// TapScale(
///   onTap: () => context.push('/some-route'),
///   child: Container(...),
/// )
/// ```
class TapScale extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final double scale;
  final Duration duration;

  /// Optional stronger feedback for high-stakes actions such as an
  /// attendance punch or an approval confirmation.
  final Future<void> Function()? hapticFeedback;

  const TapScale({
    super.key,
    required this.child,
    this.onTap,
    this.scale = 0.97,
    this.duration = const Duration(milliseconds: 120),
    this.hapticFeedback,
  });

  @override
  State<TapScale> createState() => _TapScaleState();
}

class _TapScaleState extends State<TapScale>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );
    _animation = Tween<double>(
      begin: 1.0,
      end: widget.scale,
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    ));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: widget.onTap != null
          ? (_) {
              _controller.forward();
              (widget.hapticFeedback ?? HapticFeedback.lightImpact)();
            }
          : null,
      onTapUp: widget.onTap != null
          ? (_) {
              _controller.reverse();
              widget.onTap?.call();
            }
          : null,
      onTapCancel: widget.onTap != null ? () => _controller.reverse() : null,
      child: AnimatedBuilder(
        animation: _animation,
        builder: (context, child) {
          return Transform.scale(
            scale: _animation.value,
            child: child,
          );
        },
        child: widget.child,
      ),
    );
  }
}
