import 'dart:math' as math;
import 'package:flutter/material.dart';

/// A full-screen ambient gradient canvas that renders barely perceptible,
/// slowly shifting organic color blobs behind all content.
///
/// - **Dark theme**: Deep obsidian base (#171A17) with subtle emerald & moss hues.
/// - **Light theme**: Soft mint-tinted luminous canvas (#F4F7F4) with gentle sage shifts.
///
/// Uses an isolated [AnimationController] cycling at ~0.4 Hz driving three
/// additive radial-gradient blobs whose centers orbit slowly over time.
/// Wrapped in a [RepaintBoundary] to ensure zero GPU/CPU cost for siblings.
class AmbientCanvasBackground extends StatefulWidget {
  /// When `true`, renders the dark obsidian palette; otherwise light canvas.
  final bool isDark;

  const AmbientCanvasBackground({super.key, required this.isDark});

  @override
  State<AmbientCanvasBackground> createState() => _AmbientCanvasBackgroundState();
}

class _AmbientCanvasBackgroundState extends State<AmbientCanvasBackground>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final disableAnims = MediaQuery.maybeOf(context)?.disableAnimations ?? false;
    if (disableAnims) {
      if (_controller.isAnimating) {
        _controller.stop();
      }
    } else {
      if (!_controller.isAnimating) {
        _controller.repeat();
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return RepaintBoundary(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, _) {
          return CustomPaint(
            painter: _AmbientGradientPainter(
              phase: _controller.value,
              isDark: widget.isDark,
            ),
            size: Size.infinite,
          );
        },
      ),
    );
  }
}

/// Paints three soft radial-gradient blobs whose centres orbit slowly based
/// on a normalised [phase] (0 → 1). Each blob uses a different sine/cosine
/// frequency multiplier so they produce a living, breathing canvas.
class _AmbientGradientPainter extends CustomPainter {
  final double phase;
  final bool isDark;

  const _AmbientGradientPainter({
    required this.phase,
    required this.isDark,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final double t = phase * 2 * math.pi;

    if (isDark) {
      _paintDark(canvas, size, t);
    } else {
      _paintLight(canvas, size, t);
    }
  }

  // ── Dark / Obsidian Emerald palette ──────────────────────────────────────
  void _paintDark(Canvas canvas, Size size, double t) {
    // Solid obsidian base fill.
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFF171A17),
    );

    final cx = size.width * 0.5;
    final cy = size.height * 0.5;
    final radius = size.longestSide * 0.55;

    // Blob A – deep emerald forest, drifting upper-left ↔ centre.
    _drawBlob(
      canvas,
      center: Offset(
        cx + math.sin(t) * size.width * 0.18,
        cy + math.cos(t * 0.7) * size.height * 0.12,
      ),
      radius: radius,
      color: const Color(0xFF0D2214).withValues(alpha: 0.50),
    );

    // Blob B – dark moss, drifting lower-right ↔ centre.
    _drawBlob(
      canvas,
      center: Offset(
        cx + math.cos(t * 0.8) * size.width * 0.20,
        cy + math.sin(t * 1.1) * size.height * 0.14,
      ),
      radius: radius * 0.9,
      color: const Color(0xFF0A1C10).withValues(alpha: 0.40),
    );

    // Blob C – subtle sage glow, slow drift.
    _drawBlob(
      canvas,
      center: Offset(
        cx + math.sin(t * 0.5 + 1.2) * size.width * 0.15,
        cy + math.cos(t * 0.6 + 0.8) * size.height * 0.18,
      ),
      radius: radius * 0.75,
      color: const Color(0xFF0F2617).withValues(alpha: 0.35),
    );
  }

  // ── Light / Mint-tinted Luminous palette ──────────────────────────────────
  void _paintLight(Canvas canvas, Size size, double t) {
    // Soft luminous canvas base.
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = const Color(0xFFF4F7F4),
    );

    final cx = size.width * 0.5;
    final cy = size.height * 0.5;
    final radius = size.longestSide * 0.55;

    // Blob A – cool mint tint, upper region.
    _drawBlob(
      canvas,
      center: Offset(
        cx + math.sin(t) * size.width * 0.15,
        cy + math.cos(t * 0.7) * size.height * 0.10,
      ),
      radius: radius,
      color: const Color(0xFFE3EFE4).withValues(alpha: 0.75),
    );

    // Blob B – deeper sage tint, lower-right area.
    _drawBlob(
      canvas,
      center: Offset(
        cx + math.cos(t * 0.8) * size.width * 0.18,
        cy + math.sin(t * 1.1) * size.height * 0.12,
      ),
      radius: radius * 0.85,
      color: const Color(0xFFDBEADB).withValues(alpha: 0.60),
    );

    // Blob C – gentle pale emerald wash, slow wander.
    _drawBlob(
      canvas,
      center: Offset(
        cx + math.sin(t * 0.5 + 1.0) * size.width * 0.12,
        cy + math.cos(t * 0.6 + 0.7) * size.height * 0.15,
      ),
      radius: radius * 0.70,
      color: const Color(0xFFE6F2E8).withValues(alpha: 0.55),
    );
  }

  void _drawBlob(
    Canvas canvas, {
    required Offset center,
    required double radius,
    required Color color,
  }) {
    final paint = Paint()
      ..shader = RadialGradient(
        colors: [color, color.withValues(alpha: 0.0)],
        stops: const [0.0, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));

    canvas.drawCircle(center, radius, paint);
  }

  @override
  bool shouldRepaint(_AmbientGradientPainter oldDelegate) {
    return oldDelegate.phase != phase || oldDelegate.isDark != isDark;
  }
}
