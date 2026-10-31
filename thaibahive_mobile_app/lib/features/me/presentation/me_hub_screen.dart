import 'package:qr_flutter/qr_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/providers/tab_scroll_to_top.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/models/user_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_grouped_card.dart';

/// My Hub Screen - Strictly "Things About Me"
/// Personal profile, ID card, attendance history, leave balance/requests, settings
/// Services (Canteen, Helpdesk, Gate pass) live in Services catalog, NOT here
class MeHubScreen extends ConsumerStatefulWidget {
  const MeHubScreen({super.key});

  @override
  ConsumerState<MeHubScreen> createState() => _MeHubScreenState();
}

class _MeHubScreenState extends ConsumerState<MeHubScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    // Rule 9: re-tapping the My Hub tab scrolls the profile back to the top.
    ref.listen(tabScrollToTopProvider, (previous, next) {
      if (next?.branch == 3) _scrollController.animateToTop();
    });

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        title: const Text('My Hub'),
        backgroundColor: Colors.transparent,
      ),
      body: SingleChildScrollView(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Digital ID Card
            _DigitalIdCard(user: user),
            const SizedBox(height: 24),

            // Quick Stats Row
            _QuickStatsRow(),
            const SizedBox(height: 24),

            // Personal Sections
            _PersonalSection(
              title: 'Attendance',
              icon: Icons.access_time_rounded,
              children: [
                _MenuItem(
                  title: 'Punch History',
                  subtitle: 'View monthly attendance logs',
                  icon: Icons.history_rounded,
                  route: '/me/attendance',
                ),
                _MenuItem(
                  title: 'Attendance Summary',
                  subtitle: 'Percentage, late days, half days',
                  icon: Icons.analytics_rounded,
                  route: '/me/attendance/summary',
                ),
              ],
            ),
            const SizedBox(height: 16),

            _PersonalSection(
              title: 'Leave',
              icon: Icons.event_note_rounded,
              children: [
                _MenuItem(
                  title: 'Leave Balance',
                  subtitle: 'Casual, medical, earned leave',
                  icon: Icons.balance_rounded,
                  route: '/me/leaves/balance',
                ),
                _MenuItem(
                  title: 'My Requests',
                  subtitle: 'View status of submitted leaves',
                  icon: Icons.list_alt_rounded,
                  route: '/me/leaves',
                ),
                _MenuItem(
                  title: 'Apply for Leave',
                  subtitle: 'Submit new leave application',
                  icon: Icons.add_circle_rounded,
                  route: '/me/leaves/apply',
                ),
              ],
            ),
            const SizedBox(height: 16),

            _PersonalSection(
              title: 'Profile & Security',
              icon: Icons.person_rounded,
              children: [
                _MenuItem(
                  title: 'Edit Profile',
                  subtitle: 'Update personal information',
                  icon: Icons.edit_rounded,
                  route: '/settings/profile',
                ),
                _MenuItem(
                  title: 'Change Password',
                  subtitle: 'Update login credentials',
                  icon: Icons.lock_rounded,
                  route: '/settings/password',
                ),
                _MenuItem(
                  title: 'Biometric & Security',
                  subtitle: 'Fingerprint, face, NFC enrollment',
                  icon: Icons.fingerprint_rounded,
                  route: '/settings/biometric',
                ),
              ],
            ),
            const SizedBox(height: 16),

            _PersonalSection(
              title: 'App Preferences',
              icon: Icons.tune_rounded,
              children: [
                _MenuItem(
                  title: 'Notifications',
                  subtitle: 'Manage push and in-app alerts',
                  icon: Icons.notifications_rounded,
                  route: '/settings/notifications',
                ),
                _MenuItem(
                  title: 'Theme & Display',
                  subtitle: 'Dark mode, font size, language',
                  icon: Icons.palette_rounded,
                  route: '/settings/display',
                ),
                _MenuItem(
                  title: 'Offline & Sync',
                  subtitle: 'Manage offline data and sync',
                  icon: Icons.sync_rounded,
                  route: '/settings/sync',
                ),
              ],
            ),
            const SizedBox(height: 16),

            _PersonalSection(
              title: 'Support & Legal',
              icon: Icons.help_rounded,
              children: [
                _MenuItem(
                  title: 'Help Center',
                  subtitle: 'FAQs and troubleshooting',
                  icon: Icons.help_outline_rounded,
                  route: '/help',
                ),
                _MenuItem(
                  title: 'Privacy Policy',
                  subtitle: 'Data handling and your rights',
                  icon: Icons.privacy_tip_rounded,
                  route: '/legal/privacy',
                ),
                _MenuItem(
                  title: 'Terms of Service',
                  subtitle: 'Usage terms and conditions',
                  icon: Icons.description_rounded,
                  route: '/legal/terms',
                ),
                _MenuItem(
                  title: 'About',
                  subtitle: 'Version, licenses, acknowledgments',
                  icon: Icons.info_outline_rounded,
                  route: '/settings/about',
                ),
              ],
            ),
            const SizedBox(height: 24),

            // App version badge at the bottom of My Hub
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: Theme.of(context).colorScheme.outlineVariant.withValues(alpha: 0.4),
                    width: 0.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.info_outline_rounded,
                      size: 14,
                      color: Color(0xFF1a8a3e),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'ThaibaHive v${AppConstants.appVersion}  •  Build ${AppConstants.appBuildNumber}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.4,
                        color: Color(0xFF1a8a3e),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _DigitalIdCard extends StatelessWidget {
  final UserModel user;

  const _DigitalIdCard({required this.user});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    // Single unified card — no nested wrapper, so the gradient surface reads
    // as one sleek object instead of a frame inside a frame.
    return Container(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: isDark
              ? const [Color(0xFF0D5C3A), Color(0xFF094229)]
              : const [Color(0xFF107C4A), Color(0xFF0B633A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.15),
          width: AppBorder.hairline,
        ),
        boxShadow: AppShadows.card(Colors.black),
      ),
      child: Column(
        children: [
          // Header row with avatar, name, QR
          Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 36,
                backgroundColor: Colors.white.withValues(alpha: 0.2),
                backgroundImage: user.avatarUrl != null
                    ? NetworkImage(user.avatarUrl!)
                    : null,
                child: user.avatarUrl == null
                    ? Text(
                        user.initials,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 16),
              // Name & Role
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      user.fullName,
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            user.role.toUpperCase(),
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          user.designation ?? 'Staff',
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: Colors.white.withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              // QR Code placeholder
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                ),
                padding: const EdgeInsets.all(4),
                child: QrImageView(
                  data: 'thaibahive:staff:${user.id}',
                  version: QrVersions.auto,
                  errorCorrectionLevel: QrErrorCorrectLevel.M,
                  gapless: true,
                  size: 48.0,
                  backgroundColor: Colors.white,
                  eyeStyle: const QrEyeStyle(
                    eyeShape: QrEyeShape.square,
                    color: Colors.black,
                  ),
                  dataModuleStyle: const QrDataModuleStyle(
                    dataModuleShape: QrDataModuleShape.square,
                    color: Colors.black,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Employee ID
          Row(
            children: [
              Expanded(
                child: _IdDetail(
                  label: 'Employee ID',
                  value: user.employeeId,
                  icon: Icons.badge_rounded,
                ),
              ),
              Container(height: 48, width: 1, color: Colors.white.withValues(alpha: 0.2)),
              Expanded(
                child: _IdDetail(
                  label: 'Email',
                  value: user.email,
                  icon: Icons.email_rounded,
                ),
              ),
              Container(height: 48, width: 1, color: Colors.white.withValues(alpha: 0.2)),
              Expanded(
                child: _IdDetail(
                  label: 'Phone',
                  value: user.phone ?? 'Not set',
                  icon: Icons.phone_rounded,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _QuickStatsRow extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    // IntrinsicHeight + stretch forces all three cards to the height of the
    // tallest, so icons/values line up even when a subtitle wraps to 2 lines.
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Expanded(
            child: _StatCard(
              title: 'Attendance',
              value: '98.5%',
              subtitle: 'This month',
              icon: Icons.check_circle_rounded,
              color: Colors.green,
              onTap: () => context.push('/me/attendance'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _StatCard(
              title: 'Leave',
              value: '12 days',
              subtitle: 'Casual + Medical',
              icon: Icons.balance_rounded,
              color: Colors.blue,
              onTap: () => context.push('/me/leaves/balance'),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _StatCard(
              title: 'Pending',
              value: '2',
              subtitle: 'Approvals needed',
              icon: Icons.pending_actions_rounded,
              color: Colors.orange,
              onTap: () => context.push('/approvals'),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback? onTap;

  const _StatCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E242C) : Colors.white,
            borderRadius: BorderRadius.circular(18),
            border: Border.all(
              color: isDark
                  ? Colors.white.withValues(alpha: 0.06)
                  : const Color(0xFFd4dbd4).withValues(alpha: 0.5),
              width: isDark ? AppBorder.hairlineDark : AppBorder.hairline,
            ),
            boxShadow: AppShadows.card(Colors.black),
          ),
          // Top-anchored (not spaceBetween) with fixed gaps so all three cards'
          // icons, values, titles, and subtitles share one horizontal baseline.
          child: Column(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                title,
                style: theme.textTheme.labelMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PersonalSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _PersonalSection({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: theme.colorScheme.primary),
            const SizedBox(width: 8),
            Text(
              title,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        AppGroupedCard(children: children),
      ],
    );
  }
}

class _MenuItem extends StatelessWidget {
  final String title;
  final String subtitle;
  final IconData icon;
  final String route;

  const _MenuItem({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.route,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.push(route),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: const BoxDecoration(
            color: Colors.transparent,
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  icon,
                  color: theme.colorScheme.onPrimaryContainer,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    Text(
                      subtitle,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _IdDetail extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _IdDetail({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Icon(icon, color: Colors.white.withValues(alpha: 0.7), size: 20),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 14,
          ),
          overflow: TextOverflow.ellipsis,
        ),
        const SizedBox(height: 2),
        Text(
          label,
          style: TextStyle(
            color: Colors.white.withValues(alpha: 0.6),
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}