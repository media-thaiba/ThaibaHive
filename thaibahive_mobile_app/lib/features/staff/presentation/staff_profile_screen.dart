import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/extensions.dart';
import '../../../models/staff_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/staff_provider.dart';

class StaffProfileScreen extends ConsumerWidget {
  final String id;
  const StaffProfileScreen({super.key, required this.id});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final profileAsync = ref.watch(staffProfileProvider(id));

    return Scaffold(
      appBar: AppBar(title: const Text('Staff Profile')),
      body: profileAsync.when(
        data: (staff) => SingleChildScrollView(
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      theme.colorScheme.primary,
                      theme.colorScheme.primary.withValues(alpha: 0.8),
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 44,
                      backgroundColor: Colors.white.withValues(alpha: 0.2),
                      backgroundImage: staff.avatarUrl != null
                          ? CachedNetworkImageProvider(staff.avatarUrl!)
                          : null,
                      child: staff.avatarUrl == null
                          ? Text(
                              staff.initials,
                              style: const TextStyle(
                                fontSize: 28,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      staff.fullName,
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (staff.designation != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        staff.designation!,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: Colors.white.withValues(alpha: 0.9),
                        ),
                      ),
                    ],
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        staff.role.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      staff.employeeId,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.white.withValues(alpha: 0.8),
                      ),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Card(
                      margin: EdgeInsets.zero,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Contact Information',
                                style: theme.textTheme.titleSmall
                                    ?.copyWith(fontWeight: FontWeight.w600)),
                            const Divider(),
                            _ContactRow(
                              icon: Icons.email_outlined,
                              label: 'Email',
                              value: staff.email,
                              onTap: () => launchUrl(
                                Uri.parse('mailto:${staff.email}'),
                              ),
                            ),
                            if (staff.phone != null) ...[
                              const SizedBox(height: 12),
                              _ContactRow(
                                icon: Icons.phone_outlined,
                                label: 'Phone',
                                value: staff.phone!,
                                onTap: () => launchUrl(
                                  Uri.parse('tel:${staff.phone}'),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    if (staff.departments.isNotEmpty)
                      Card(
                        margin: EdgeInsets.zero,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Departments',
                                  style: theme.textTheme.titleSmall
                                      ?.copyWith(fontWeight: FontWeight.w600)),
                              const Divider(),
                              ...staff.departments.map((d) => Padding(
                                    padding: const EdgeInsets.only(bottom: 8),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.business_rounded,
                                          size: 18,
                                          color: theme.colorScheme.primary,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Text(d.name,
                                                  style: theme
                                                      .textTheme.bodyMedium
                                                      ?.copyWith(
                                                          fontWeight:
                                                              FontWeight.w500)),
                                              if (d.description != null)
                                                Text(d.description!,
                                                    style: theme
                                                        .textTheme.bodySmall),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  )),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 12),
                    Card(
                      margin: EdgeInsets.zero,
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _StatItem(
                                icon: Icons.calendar_today_rounded,
                                label: 'Joined',
                                value: _formatDate(staff.createdAt
                                    .toIso8601String())),
                            _StatItem(
                                icon: Icons.badge_rounded,
                                label: 'Status',
                                value: staff.isActive ? 'Active' : 'Inactive'),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        loading: () => const PageShimmer(),
        error: (e, _) => AppErrorWidget(
          message: e.toString(),
          onRetry: () => ref.invalidate(staffProfileProvider(id)),
        ),
      ),
    );
  }

  String _formatDate(String date) {
    try {
      return DateTime.parse(date).toDisplayDate();
    } catch (_) {
      return date;
    }
  }
}

class _ContactRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final VoidCallback onTap;
  const _ContactRow({
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            Icon(icon, size: 20,
                color: theme.colorScheme.primary),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(label,
                      style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.6))),
                  Text(value,
                      style: theme.textTheme.bodyMedium
                          ?.copyWith(fontWeight: FontWeight.w500)),
                ],
              ),
            ),
            const Icon(Icons.open_in_new_rounded, size: 16),
          ],
        ),
      ),
    );
  }
}

class _StatItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        Icon(icon, color: theme.colorScheme.primary),
        const SizedBox(height: 4),
        Text(value,
            style: theme.textTheme.bodyMedium
                ?.copyWith(fontWeight: FontWeight.w600)),
        Text(label,
            style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.6))),
      ],
    );
  }
}
