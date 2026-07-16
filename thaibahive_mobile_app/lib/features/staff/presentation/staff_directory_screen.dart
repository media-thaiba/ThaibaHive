import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/extensions.dart';
import '../../../models/department_model.dart';
import '../../../models/staff_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/staff_provider.dart';

class StaffDirectoryScreen extends ConsumerStatefulWidget {
  const StaffDirectoryScreen({super.key});

  @override
  ConsumerState<StaffDirectoryScreen> createState() =>
      _StaffDirectoryScreenState();
}

class _StaffDirectoryScreenState extends ConsumerState<StaffDirectoryScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String value) {
    ref.read(staffSearchProvider.notifier).state = value;
    ref.read(staffListProvider.notifier).refresh();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final staffAsync = ref.watch(staffListProvider);
    final departmentsAsync = ref.watch(staffDepartmentsProvider);
    final selectedDepartment = ref.watch(staffDepartmentFilterProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Staff Directory')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search by name, email, designation...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          _onSearch('');
                        },
                      )
                    : null,
              ),
              onChanged: _onSearch,
            ),
          ),
          departmentsAsync.when(
            data: (departments) {
              if (departments.isEmpty) return const SizedBox.shrink();
              return SizedBox(
                height: 40,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: departments.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (_, i) {
                    final isAll = i == 0;
                    final dept = isAll ? null : departments[i - 1];
                    final isSelected = isAll
                        ? selectedDepartment.isEmpty
                        : selectedDepartment == dept!.id;
                    return FilterChip(
                      label: Text(isAll ? 'All' : dept!.name),
                      selected: isSelected,
                      onSelected: (_) {
                        ref
                            .read(staffDepartmentFilterProvider.notifier)
                            .state = isAll ? '' : dept!.id;
                        ref.read(staffListProvider.notifier).refresh();
                      },
                    );
                  },
                ),
              );
            },
            loading: () => const SizedBox(
              height: 40,
              child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
            ),
            error: (_, __) => const SizedBox.shrink(),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: staffAsync.when(
              data: (staff) {
                if (staff.isEmpty) {
                  return const EmptyStateWidget(
                    icon: Icons.people_outline_rounded,
                    title: 'No Staff Found',
                    message: 'No staff members match your search.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.read(staffListProvider.notifier).refresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(bottom: 16),
                    itemCount: staff.length,
                    itemBuilder: (_, i) => _StaffCard(
                      staff: staff[i],
                      onTap: () => context.push('/staff/${staff[i].id}'),
                    ),
                  ),
                );
              },
              loading: () => const PageShimmer(),
              error: (e, _) => AppErrorWidget(
                message: e.toString(),
                onRetry: () =>
                    ref.read(staffListProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StaffCard extends StatelessWidget {
  final StaffModel staff;
  final VoidCallback onTap;
  const _StaffCard({required this.staff, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.15),
                backgroundImage: staff.avatarUrl != null
                    ? CachedNetworkImageProvider(staff.avatarUrl!)
                    : null,
                child: staff.avatarUrl == null
                    ? Text(
                        staff.initials,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.primary,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      staff.fullName,
                      style: theme.textTheme.titleSmall
                          ?.copyWith(fontWeight: FontWeight.w600),
                    ),
                    if (staff.designation != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        staff.designation!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.onSurface
                              .withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                    if (staff.departments.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        staff.departments.map((d) => d.name).join(', '),
                        style: theme.textTheme.labelSmall?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              const Icon(Icons.chevron_right_rounded),
            ],
          ),
        ),
      ),
    );
  }
}
