import 'package:flutter/material.dart';

/// Animates a number from 0 to [target] over [duration].
///
/// Uses a simple tween — no external dependencies needed.
/// Respects [MediaQuery.disableAnimations] for accessibility.
class AnimatedCounter extends StatefulWidget {
  final int target;
  final TextStyle? style;
  final Duration duration;

  const AnimatedCounter({
    super.key,
    required this.target,
    this.style,
    this.duration = const Duration(milliseconds: 800),
  });

  @override
  State<AnimatedCounter> createState() => _AnimatedCounterState();
}

class _AnimatedCounterState extends State<AnimatedCounter>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  int _displayValue = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: widget.duration,
    );

    _animation = Tween<double>(
      begin: 0,
      end: widget.target.toDouble(),
    ).animate(CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    ));

    _animation.addListener(() {
      setState(() {
        _displayValue = _animation.value.round();
      });
    });

    _startAnimation();
  }

  void _startAnimation() {
    final animationsDisabled = MediaQuery.disableAnimationsOf(context);
    if (animationsDisabled) {
      _displayValue = widget.target;
      return;
    }
    _controller.forward();
  }

  @override
  void didUpdateWidget(AnimatedCounter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.target != widget.target) {
      _animation = Tween<double>(
        begin: _displayValue.toDouble(),
        end: widget.target.toDouble(),
      ).animate(CurvedAnimation(
        parent: _controller,
        curve: Curves.easeOutCubic,
      ));
      _controller.reset();
      _controller.forward();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      '$_displayValue',
      style: widget.style ??
          const TextStyle(
            fontFamily: 'PlusJakartaSans',
            fontSize: 28,
            fontWeight: FontWeight.w800,
          ),
    );
  }
}
