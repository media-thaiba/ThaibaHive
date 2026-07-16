import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants.dart';
import '../../../models/user_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../../../shared/widgets/tap_scale.dart';
import '../data/settings_provider.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(currentUserProvider);
    final darkMode = ref.watch(darkModeProvider);
    final notificationsEnabled = ref.watch(notificationsEnabledProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          if (user != null)
            TapScale(
              onTap: () => context.push('/settings/profile'),
              child: Card(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor:
                            theme.colorScheme.primary.withValues(alpha: 0.15),
                        child: Text(
                          user.initials,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: theme.colorScheme.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.fullName,
                                style: theme.textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w600)),
                            if (user.designation != null)
                              Text(user.designation!,
                                  style: theme.textTheme.bodySmall),
                            Text(user.email,
                                style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.onSurface
                                        .withValues(alpha: 0.6))),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded),
                    ],
                  ),
                ),
              ),
            ),
          const SizedBox(height: 8),
          _SectionHeader(title: 'Account'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Column(
              children: [
                TapScale(
                  onTap: () => context.push('/settings/password'),
                  child: ListTile(
                    leading: const Icon(Icons.lock_outline_rounded),
                    title: const Text('Change Password'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: null,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _SectionHeader(title: 'Preferences'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Column(
              children: [
                SwitchListTile(
                  secondary: const Icon(Icons.dark_mode_rounded),
                  title: const Text('Dark Mode'),
                  value: darkMode,
                  onChanged: (v) =>
                      ref.read(darkModeProvider.notifier).state = v,
                ),
                const Divider(height: 1, indent: 72),
                SwitchListTile(
                  secondary: const Icon(Icons.notifications_rounded),
                  title: const Text('Push Notifications'),
                  value: notificationsEnabled,
                  onChanged: (v) =>
                      ref.read(notificationsEnabledProvider.notifier).state = v,
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _SectionHeader(title: 'App Info'),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.info_outline_rounded),
                  title: const Text('Version'),
                  trailing: Text(AppConstants.appVersion,
                      style: theme.textTheme.bodyMedium?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6))),
                ),
                const Divider(height: 1, indent: 72),
                TapScale(
                  onTap: () => _showAbout(context, theme),
                  child: ListTile(
                    leading: const Icon(Icons.description_outlined),
                    title: const Text('About'),
                    trailing: const Icon(Icons.chevron_right_rounded),
                    onTap: null,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () => _showLogoutConfirmation(context, ref),
              icon: const Icon(Icons.logout_rounded),
              label: const Text('Logout'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.red,
                side: const BorderSide(color: Colors.red),
              ),
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  void _showAbout(BuildContext context, ThemeData theme) {
    showAboutDialog(
      context: context,
      applicationName: AppConstants.appName,
      applicationVersion: AppConstants.appVersion,
      applicationLegalese: 'ThaibaHive - Unified Staff Management Platform',
      children: [
        const SizedBox(height: 8),
        const Text('Built with Flutter'),
      ],
    );
  }

  void _showLogoutConfirmation(BuildContext context, WidgetRef ref) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              ref.read(currentUserProvider.notifier).clear();
              Navigator.pop(ctx);
              context.go('/auth/login');
            },
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
      child: Text(
        title,
        style: Theme.of(context)
            .textTheme
            .labelMedium
            ?.copyWith(fontWeight: FontWeight.w600),
      ),
    );
  }
}
