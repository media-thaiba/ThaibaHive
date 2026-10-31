import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../app/theme.dart';

/// A fluid, VisionOS/Cupertino-style segmented control.
///
/// Replaces `ToggleButtons` with a sliding background pill that animates
/// between equally-distributed segments, so the control adapts to any screen
/// width instead of relying on a fixed `minWidth` per segment.
///
/// Fires `HapticFeedback.lightImpact()` on selection.
class SlidingPillSegmentedControl extends StatelessWidget {
  final List<String> segments;
  final int selectedIndex;
  final ValueChanged<int> onValueChanged;

  const SlidingPillSegmentedControl({
    super.key,
    required this.segments,
    required this.selectedIndex,
    required this.onValueChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    if (segments.isEmpty) return const SizedBox.shrink();

    return Container(
      // 48 keeps every segment inside the 48x48 dp minimum touch target
      // (WCAG 2.1 AA 2.5.8 / Android accessibility guidance) while the 4dp
      // inset leaves a 40dp visual pill inside it.
      height: 48,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: isDark
            ? theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5)
            : theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: theme.colorScheme.outlineVariant.withValues(alpha: 0.4),
          width: 1,
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final tabWidth = constraints.maxWidth / segments.length;

          return Stack(
            children: [
              AnimatedPositioned(
                duration: AppMotion.normal,
                curve: Curves.easeOutCubic,
                left: selectedIndex * tabWidth,
                top: 0,
                bottom: 0,
                width: tabWidth,
                child: Container(
                  decoration: BoxDecoration(
                    color: isDark
                        ? theme.colorScheme.surface
                        : Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    boxShadow: AppShadows.chip(Colors.black),
                  ),
                ),
              ),
              Row(
                children: List.generate(segments.length, (index) {
                  final isSelected = index == selectedIndex;
                  return Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        if (index != selectedIndex) onValueChanged(index);
                      },
                      child: Center(
                        child: Text(
                          segments[index],
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight:
                                isSelected ? FontWeight.w700 : FontWeight.w500,
                            letterSpacing: 0.2,
                            color: isSelected
                                ? theme.colorScheme.primary
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ],
          );
        },
      ),
    );
  }
}
