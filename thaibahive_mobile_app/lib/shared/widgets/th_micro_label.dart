import 'package:flutter/material.dart';
import '../../app/theme.dart';

/// Flagship uppercase micro-label widget.
/// Enforces Apple-grade micro-typography (w800, balanced letter-spacing, uppercase)
/// while strictly observing the repository's >= 11px accessibility floor.
class ThMicroLabel extends StatelessWidget {
  final String text;
  final Color? color;
  final double tracking;
  final int? maxLines;
  final TextOverflow? overflow;

  const ThMicroLabel(
    this.text, {
    super.key,
    this.color,
    this.tracking = 1.2,
    this.maxLines = 1,
    this.overflow = TextOverflow.ellipsis,
  });

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      maxLines: maxLines,
      overflow: overflow,
      style: AppTypography.overline(context, color: color).copyWith(
        fontSize: 11.0,
        fontWeight: FontWeight.w800,
        letterSpacing: tracking,
      ),
    );
  }
}
