import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/shared/widgets/tap_scale.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});

  // ── Unlocked route registry ──────────────────────────────────────────────
  //
  // Add a route string here when a Phase 2+ feature graduates from "Coming Soon"
  // to fully available. Phase 1 routes are always unlocked by default.
  // This is the single place to update when a feature goes live.
  //
  static const Set<String> _unlockedRoutes = {
    '/notifications', // Phase 1 — always available
    '/settings',      // Phase 1 — always available
    // Phase 2+ features — live:
    '/announcements',
    '/circulars',
    '/polls',
    '/recognition',
    '/help-desk',
    '/staff',
    '/reports',
    '/approvals',
    '/bookings',
    '/assets',
  };

  static const _communicationFeatures = [
    _FeatureItem(name: 'Notifications', icon: Icons.notifications_rounded, route: '/notifications', color: Color(0xFFEF6C00)),
    _FeatureItem(name: 'Announcements', icon: Icons.campaign_rounded, route: '/announcements', color: Color(0xFF2196F3)),
    _FeatureItem(name: 'Events', icon: Icons.event_rounded, route: '/events', color: Color(0xFF9C27B0)),
    _FeatureItem(name: 'Circulars', icon: Icons.description_rounded, route: '/circulars', color: Color(0xFFFF9800)),
    _FeatureItem(name: 'Polls', icon: Icons.poll_rounded, route: '/polls', color: Color(0xFF4CAF50)),
    _FeatureItem(name: 'Recognition', icon: Icons.emoji_events_rounded, route: '/recognition', color: Color(0xFFFFC107)),
  ];

  static const _supportAdminFeatures = [
    _FeatureItem(name: 'Settings', icon: Icons.settings_rounded, route: '/settings', color: Color(0xFF37474F)),
    _FeatureItem(name: 'Help Desk', icon: Icons.support_agent_rounded, route: '/help-desk', color: Color(0xFFE91E63)),
    _FeatureItem(name: 'Bookings', icon: Icons.book_online_rounded, route: '/bookings', color: Color(0xFF00BCD4)),
    _FeatureItem(name: 'Checklists', icon: Icons.checklist_rounded, route: '/checklists', color: Color(0xFF2E7D32)),
    _FeatureItem(name: 'Availability', icon: Icons.schedule_rounded, route: '/availability', color: Color(0xFF6A1B9A)),
    _FeatureItem(name: 'Staff', icon: Icons.people_alt_rounded, route: '/staff', color: Color(0xFF283593)),
    _FeatureItem(name: 'Admin', icon: Icons.admin_panel_settings_rounded, route: '/admin', color: Color(0xFFB71C1C)),
  ];

  static const _operationsFinanceFeatures = [
    _FeatureItem(name: 'Approvals', icon: Icons.approval_rounded, route: '/approvals', color: Color(0xFF00838F)),
    _FeatureItem(name: 'Reports', icon: Icons.assignment_rounded, route: '/reports', color: Color(0xFF558B2F)),
    _FeatureItem(name: 'Assets', icon: Icons.inventory_2_rounded, route: '/assets', color: Color(0xFF795548)),
    _FeatureItem(name: 'Expenses', icon: Icons.receipt_rounded, route: '/expenses', color: Color(0xFF607D8B)),
    _FeatureItem(name: 'Purchases', icon: Icons.shopping_cart_rounded, route: '/purchases', color: Color(0xFF3F51B5)),
    _FeatureItem(name: 'Visitors', icon: Icons.people_rounded, route: '/visitors', color: Color(0xFF009688)),
    _FeatureItem(name: 'Grievances', icon: Icons.report_problem_rounded, route: '/grievances', color: Color(0xFFD32F2F)),
    _FeatureItem(name: 'Vehicles', icon: Icons.directions_car_rounded, route: '/vehicles', color: Color(0xFF673AB7)),
    _FeatureItem(name: 'Canteen', icon: Icons.restaurant_rounded, route: '/canteen', color: Color(0xFFFF5722)),
    _FeatureItem(name: 'Timeline', icon: Icons.timeline_rounded, route: '/timeline', color: Color(0xFF1565C0)),
    _FeatureItem(name: 'Accounts', icon: Icons.account_balance_rounded, route: '/accounts', color: Color(0xFFC62828)),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        title: const Text('More'),
        elevation: 0,
        backgroundColor: isDark ? const Color(0xFF22262b) : Colors.white,
      ),
      body: ListView(
        physics: const BouncingScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          _buildCategory(context, theme, 'Communication', _communicationFeatures),
          const SizedBox(height: 24),
          _buildCategory(context, theme, 'Support & Admin', _supportAdminFeatures),
          const SizedBox(height: 24),
          _buildCategory(context, theme, 'Operations & Finance', _operationsFinanceFeatures),
        ],
      ),
    );
  }

  Widget _buildCategory(
    BuildContext context,
    ThemeData theme,
    String title,
    List<_FeatureItem> items,
  ) {
    final isDark = theme.brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Pill-style category label
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: const Color(0xFF1a8a3e).withValues(alpha: isDark ? 0.12 : 0.07),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            title,
            style: TextStyle(
              fontFamily: 'PlusJakartaSans',
              fontSize: 12,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF1a8a3e),
              letterSpacing: 0.2,
            ),
          ),
        ),
        const SizedBox(height: 12),
        // 3-column grid with improved aspect ratio for better proportions
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 3,
            mainAxisSpacing: 14,
            crossAxisSpacing: 14,
            childAspectRatio: 0.92,
          ),
          itemCount: items.length,
          itemBuilder: (_, i) {
            final item = items[i];
            final isUnlocked = _unlockedRoutes.contains(item.route);
            return _FeatureCard(item: item, isUnlocked: isUnlocked);
          },
        ),
      ],
    );
  }
}

// ── Data Model ───────────────────────────────────────────────────────────────

class _FeatureItem {
  final String name;
  final IconData icon;
  final String route;
  final Color color;

  const _FeatureItem({
    required this.name,
    required this.icon,
    required this.route,
    required this.color,
  });
}

// ── Feature Card ─────────────────────────────────────────────────────────────

class _FeatureCard extends StatelessWidget {
  final _FeatureItem item;
  final bool isUnlocked;

  const _FeatureCard({required this.item, required this.isUnlocked});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return TapScale(
      onTap: () {
        if (!isUnlocked) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: const Text('This feature is coming soon'),
              behavior: SnackBarBehavior.floating,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          );
          return;
        }
        try {
          context.push(item.route);
        } catch (_) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Could not navigate to ${item.name}')),
          );
        }
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeInOut,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF22262b) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isDark
                ? Colors.white.withValues(alpha: 0.06)
                : const Color(0xFFd4dbd4).withValues(alpha: 0.5),
            width: 0.5,
          ),
          boxShadow: isUnlocked
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.25 : 0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              // Left accent indicator bar
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 3.5,
                child: Container(
                  color: isUnlocked ? item.color : item.color.withValues(alpha: 0.3),
                ),
              ),
              // Card Content
              Padding(
                padding: const EdgeInsets.fromLTRB(14, 14, 10, 14),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // Icon container — 42px rounded square to prevent overflow
                      Container(
                        width: 42,
                        height: 42,
                        decoration: BoxDecoration(
                          color: item.color.withValues(alpha: isUnlocked ? 0.12 : 0.06),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Icon(
                          item.icon,
                          color: isUnlocked ? item.color : item.color.withValues(alpha: 0.35),
                          size: 22,
                        ),
                      ),
                      const SizedBox(height: 8),
                      // Feature label
                      Text(
                        item.name,
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontWeight: isUnlocked ? FontWeight.w600 : FontWeight.w500,
                          color: isUnlocked
                              ? theme.colorScheme.onSurface
                              : theme.colorScheme.onSurface.withValues(alpha: 0.45),
                          fontSize: 11.5,
                          height: 1.2,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
