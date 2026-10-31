import 'package:flutter/material.dart';

import '../../app/theme.dart';

/// An Apple "Inset Grouped" list container.
///
/// Renders its children as one continuous rounded card separated by hairline
/// dividers, instead of stacking individually-bordered boxes on top of each
/// other. This removes the harsh border clashes and visual noise that come
/// from every row carrying its own outline.
///
/// ```dart
/// AppGroupedCard(
///   children: [
///     _MenuItem(...),
///     _MenuItem(...),
///   ],
/// )
/// ```
class AppGroupedCard extends StatelessWidget {
  final List<Widget> children;
  final EdgeInsetsGeometry margin;

  /// Left inset for the hairline dividers. Defaults to 70 so the rule starts
  /// under the row label (16 padding + 40 icon + 14 gap).
  final double dividerIndent;

  const AppGroupedCard({
    super.key,
    required this.children,
    this.margin = const EdgeInsets.symmetric(vertical: 8),
    this.dividerIndent = 70,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (children.isEmpty) return const SizedBox.shrink();

    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: AppColors.card(context),
        borderRadius: BorderRadius.circular(AppRadius.card),
        border: Border.all(
          color: isDark
              ? Colors.white.withValues(alpha: 0.06)
              : AppColors.border(context).withValues(alpha: 0.5),
          width: 1,
        ),
        boxShadow: AppColors.surfaceShadow2(context),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.card - 1),
        child: Column(
          children: [
            for (var index = 0; index < children.length; index++) ...[
              if (index > 0)
                Divider(
                  height: 1,
                  thickness: 0.5,
                  indent: dividerIndent,
                  color: theme.dividerTheme.color ??
                      theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
                ),
              children[index],
            ],
          ],
        ),
      ),
    );
  }
}
