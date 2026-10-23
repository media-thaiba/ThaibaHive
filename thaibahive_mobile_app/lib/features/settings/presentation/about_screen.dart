import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/constants.dart';

/// About screen showing app version, build number, and legal information.
class AboutScreen extends StatefulWidget {
  const AboutScreen({super.key});

  @override
  State<AboutScreen> createState() => _AboutScreenState();
}

class _AboutScreenState extends State<AboutScreen> {
  String _versionDisplay = '';

  @override
  void initState() {
    super.initState();
    _loadVersion();
  }

  Future<void> _loadVersion() async {
    try {
      final info = await PackageInfo.fromPlatform();
      if (!mounted) return;
      setState(() {
        _versionDisplay = 'v${info.version}  •  Build ${info.buildNumber}';
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _versionDisplay = 'v${AppConstants.appVersion}  •  Build 16';
      });
    }
  }

  Future<void> _checkForUpdates() async {
    // Navigate to settings where the Check for Updates action lives.
    if (mounted) context.go('/settings');
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('About'),
        leading: IconButton(
          icon: const Icon(Icons.chevron_left_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: theme.colorScheme.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Icon(
                      Icons.school_rounded,
                      size: 40,
                      color: Color(0xFF1a8a3e),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    AppConstants.appName,
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _versionDisplay.isNotEmpty
                        ? _versionDisplay
                        : 'v${AppConstants.appVersion}  •  Build 16',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            _SectionRow(
              icon: Icons.system_update_rounded,
              label: 'Check for Updates',
              subtitle: 'Download the latest version',
              onTap: _checkForUpdates,
            ),
            const Divider(height: 1),
            _SectionRow(
              icon: Icons.description_outlined,
              label: 'Privacy Policy',
              subtitle: 'Data handling and your rights',
              onTap: () => context.push('/legal/privacy'),
            ),
            const Divider(height: 1),
            _SectionRow(
              icon: Icons.description_rounded,
              label: 'Terms of Service',
              subtitle: 'Usage terms and conditions',
              onTap: () => context.push('/legal/terms'),
            ),
            const Divider(height: 1),
            _SectionRow(
              icon: Icons.info_outline_rounded,
              label: 'App Info',
              subtitle: 'Built with Flutter',
              onTap: null,
            ),
            const SizedBox(height: 32),
            Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: theme.colorScheme.primary.withValues(alpha: 0.2),
                    width: 1,
                  ),
                ),
                child: const Text(
                  'ThaibaHive',
                  style: TextStyle(
                    color: Color(0xFF1a8a3e),
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SectionRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback? onTap;

  const _SectionRow({
    required this.icon,
    required this.label,
    required this.subtitle,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: theme.colorScheme.primary.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            icon,
            color: theme.colorScheme.primary,
            size: 22,
          ),
        ),
        title: Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          subtitle,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: onTap != null
            ? const Icon(Icons.chevron_right_rounded, size: 20)
            : null,
      ),
    );
  }
}
