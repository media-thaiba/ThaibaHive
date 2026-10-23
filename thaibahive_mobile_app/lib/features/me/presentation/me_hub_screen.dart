import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/models/user_model.dart';
import 'package:thaibahive_mobile/shared/widgets/app_card.dart';

/// My Hub Screen - Strictly "Things About Me"
/// Personal profile, ID card, attendance history, leave balance/requests, settings
/// Services (Canteen, Helpdesk, Gate pass) live in Services catalog, NOT here
class MeHubScreen extends ConsumerWidget {
  const MeHubScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Hub'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_rounded),
            onPressed: () => context.push('/settings'),
            tooltip: 'Settings',
          ),
        ],
      ),
      body: SingleChildScrollView(
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

    return Container(
      margin: EdgeInsets.zero,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            theme.colorScheme.primary,
            theme.colorScheme.primary.withValues(alpha: 0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: theme.colorScheme.primary.withValues(alpha: 0.3),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: AppCard(
        margin: EdgeInsets.zero,
        padding: EdgeInsets.zero,
        variant: AppCardVariant.glass,
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
                child: const Center(
                  child: Icon(Icons.qr_code_rounded, size: 32, color: Colors.black),
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
      ),
    );
  }
}

class _QuickStatsRow extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: _StatCard(
            title: 'Attendance',
            value: '98.5%',
            subtitle: 'This month',
            icon: Icons.check_circle_rounded,
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _StatCard(
            title: 'Leave Balance',
            value: '12 days',
            subtitle: 'Casual + Medical',
            icon: Icons.balance_rounded,
            color: Colors.blue,
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
          ),
        ),
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: theme.colorScheme.outlineVariant),
      ),
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
          const SizedBox(height: 10),
          Text(
            value,
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
            ),
          ),
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
        ...children,
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
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: theme.colorScheme.outlineVariant,
              width: 0.5,
            ),
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
            fontSize: 10,
          ),
        ),
      ],
    );
  }
}