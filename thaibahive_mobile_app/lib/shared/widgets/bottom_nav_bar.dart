import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'update_banner.dart';

class BottomNavShell extends ConsumerWidget {
  final StatefulNavigationShell navigationShell;

  const BottomNavShell({
    super.key,
    required this.navigationShell,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: navigationShell,
          ),
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: UpdateBanner(),
            ),
          ),
        ],
      ),
      bottomNavigationBar: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.section,
          0,
          AppSpacing.section,
          AppSpacing.normal,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppRadius.card),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
            child: Container(
              decoration: BoxDecoration(
                color: isDark
                    ? const Color(0xFF22262b).withValues(alpha: 0.94)
                    : Colors.white.withValues(alpha: 0.98),
                borderRadius: BorderRadius.circular(AppRadius.card),
                border: Border.all(
                  color: isDark
                      ? Colors.white.withValues(alpha: 0.08)
                      : const Color(0xFFd4dbd4).withValues(alpha: 0.6),
                  width: 1.0,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.35 : 0.05),
                    blurRadius: 20,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: NavigationBar(
                selectedIndex: navigationShell.currentIndex,
                backgroundColor: Colors.transparent,
                surfaceTintColor: Colors.transparent,
                shadowColor: Colors.transparent,
                elevation: AppElevation.level0,
                height: 60,
                onDestinationSelected: (index) {
                  navigationShell.goBranch(
                    index,
                    initialLocation: index == navigationShell.currentIndex,
                  );
                },
                destinations: const [
                  NavigationDestination(
                    icon: Icon(Icons.space_dashboard_outlined),
                    selectedIcon: Icon(Icons.space_dashboard_rounded),
                    label: 'Home',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.access_time_outlined),
                    selectedIcon: Icon(Icons.access_time_filled_rounded),
                    label: 'Attendance',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.task_alt_outlined),
                    selectedIcon: Icon(Icons.task_alt_rounded),
                    label: 'Tasks',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.event_note_outlined),
                    selectedIcon: Icon(Icons.event_note_rounded),
                    label: 'Leaves',
                  ),
                  NavigationDestination(
                    icon: Icon(Icons.apps_outlined),
                    selectedIcon: Icon(Icons.apps_rounded),
                    label: 'More',
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
