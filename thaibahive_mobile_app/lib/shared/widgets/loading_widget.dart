import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class LoadingWidget extends StatelessWidget {
  final double size;

  const LoadingWidget({super.key, this.size = 36});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: size,
        height: size,
        child: const CircularProgressIndicator(strokeWidth: 3),
      ),
    );
  }
}

class ShimmerLoading extends StatelessWidget {
  final int itemCount;
  final ShimmerListItemBuilder itemBuilder;

  const ShimmerLoading({
    super.key,
    this.itemCount = 5,
    required this.itemBuilder,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    final baseColor = isDark ? const Color(0xFF2a2e33) : const Color(0xFFe9ebe9);
    final highlightColor = isDark ? const Color(0xFF353a3f) : const Color(0xFFf5f7f5);

    return Shimmer.fromColors(
      baseColor: baseColor,
      highlightColor: highlightColor,
      child: Column(
        children: List.generate(
          itemCount,
          (index) => itemBuilder(context, index),
        ),
      ),
    );
  }
}

typedef ShimmerListItemBuilder = Widget Function(BuildContext context, int index);

class CardShimmer extends StatelessWidget {
  const CardShimmer({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF22262b) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? Colors.white.withValues(alpha: 0.06) : const Color(0xFFd4dbd4).withValues(alpha: 0.5),
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  height: 14,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  width: 150,
                  height: 12,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class ListShimmer extends StatelessWidget {
  final int itemCount;

  const ListShimmer({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    return ShimmerLoading(
      itemCount: itemCount,
      itemBuilder: (_, __) => const CardShimmer(),
    );
  }
}

class PageShimmer extends StatelessWidget {
  final int itemCount;

  const PageShimmer({super.key, this.itemCount = 5});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.only(top: 8),
      child: ListShimmer(itemCount: itemCount),
    );
  }
}
