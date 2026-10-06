import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/features/action_center/controller.dart';
import 'package:thaibahive_mobile/features/action_center/tray.dart';
import 'package:thaibahive_mobile/shared/widgets/quick_action_card.dart';

/// Services Catalog Screen - Searchable catalog of campus utilities
/// Replaces the old "More" tab with a focused services marketplace
class ServicesScreen extends ConsumerStatefulWidget {
  const ServicesScreen({super.key});

  @override
  ConsumerState<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends ConsumerState<ServicesScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final actions = ref.watch(actionCenterProvider);
    final pendingCount = actions.length;

    // Service categories with their capabilities
    final serviceCategories = [
      _ServiceCategory(
        name: 'Food & Dining',
        icon: Icons.restaurant_rounded,
        color: Colors.orange,
        services: [
          _ServiceItem(
            name: 'Order Meal',
            description: 'Pre-order daily meals and refreshments',
            icon: Icons.lunch_dining_rounded,
            route: '/canteen',
            capability: 'canteen.order.create',
          ),
          _ServiceItem(
            name: 'View Menu',
            description: 'Browse daily canteen menu',
            icon: Icons.menu_book_rounded,
            route: '/canteen/menu',
            capability: 'canteen.order.create',
          ),
        ],
      ),
      _ServiceCategory(
        name: 'Visitor Management',
        icon: Icons.person_add_rounded,
        color: Colors.green,
        services: [
          _ServiceItem(
            name: 'Issue Gate Pass',
            description: 'Pre-register visitors and generate QR passes',
            icon: Icons.badge_rounded,
            route: '/visitors/create',
            capability: 'visitor.pass.create',
          ),
          _ServiceItem(
            name: 'Visitor Log',
            description: 'View visitor check-in history',
            icon: Icons.history_rounded,
            route: '/visitors',
            capability: 'visitor.pass.create',
          ),
        ],
      ),
      _ServiceCategory(
        name: 'IT & Facilities',
        icon: Icons.build_rounded,
        color: Colors.blue,
        services: [
          _ServiceItem(
            name: 'Raise Ticket',
            description: 'Submit IT, maintenance, or facility requests',
            icon: Icons.note_add_rounded,
            route: '/help-desk/create',
            capability: 'helpdesk.ticket.create',
          ),
          _ServiceItem(
            name: 'My Tickets',
            description: 'Track status of submitted tickets',
            icon: Icons.list_alt_rounded,
            route: '/help-desk',
            capability: 'helpdesk.ticket.create',
          ),
        ],
      ),
      _ServiceCategory(
        name: 'Room & Resource Booking',
        icon: Icons.meeting_room_rounded,
        color: Colors.purple,
        services: [
          _ServiceItem(
            name: 'Book Room',
            description: 'Reserve seminar halls, labs, sports courts',
            icon: Icons.event_available_rounded,
            route: '/bookings/create',
            capability: 'booking.resource.create',
          ),
          _ServiceItem(
            name: 'My Bookings',
            description: 'View and manage your reservations',
            icon: Icons.calendar_today_rounded,
            route: '/bookings',
            capability: 'booking.resource.create',
          ),
        ],
      ),
      _ServiceCategory(
        name: 'Daily Operations',
        icon: Icons.work_rounded,
        color: Colors.teal,
        services: [
          _ServiceItem(
            name: 'Submit Report',
            description: 'File daily work report to department head',
            icon: Icons.description_rounded,
            route: '/reports/create',
            capability: 'report.daily.submit',
          ),
          _ServiceItem(
            name: 'View Tasks',
            description: 'Check assigned tasks and deadlines',
            icon: Icons.task_alt_rounded,
            route: '/tasks',
            capability: 'task.item.view',
          ),
          _ServiceItem(
            name: 'Expense Claim',
            description: 'Submit reimbursement with receipts',
            icon: Icons.receipt_long_rounded,
            route: '/expenses/create',
            capability: 'finance.expense.claim',
          ),
        ],
      ),
      _ServiceCategory(
        name: 'Academic',
        icon: Icons.school_rounded,
        color: Colors.indigo,
        services: [
          _ServiceItem(
            name: 'Student Directory',
            description: 'Quick contact lookup for students',
            icon: Icons.contacts_rounded,
            route: '/students',
            capability: 'academic.student.directory',
          ),
          _ServiceItem(
            name: 'Exam Duty',
            description: 'View invigilation schedule',
            icon: Icons.assignment_rounded,
            route: '/exam-duty',
            capability: 'exam.duty.view',
          ),
        ],
      ),
    ];

    // Filter categories based on search query
    final filteredCategories = serviceCategories.where((category) {
      if (_searchQuery.isEmpty) return true;
      final query = _searchQuery.toLowerCase();
      return category.name.toLowerCase().contains(query) ||
          category.services.any((s) => s.name.toLowerCase().contains(query) ||
              s.description.toLowerCase().contains(query));
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Services'),
        actions: [
          if (pendingCount > 0)
            Stack(
              children: [
                IconButton(
                  icon: const Icon(Icons.pending_actions_rounded),
                  onPressed: () => _showActionCenterSheet(context),
                  tooltip: 'Action Center',
                ),
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.error,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '$pendingCount',
                      style: theme.textTheme.labelSmall?.copyWith(
                        color: Colors.white,
                        fontSize: 10,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search services...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: theme.colorScheme.surfaceContainerHighest,
                contentPadding: const EdgeInsets.symmetric(vertical: 0),
              ),
              onChanged: (value) => setState(() => _searchQuery = value),
            ),
          ),

          // Categories list
          Expanded(
            child: filteredCategories.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.search_off_rounded,
                          size: 64,
                          color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.3),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'No services found',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Try a different search term',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredCategories.length,
                    itemBuilder: (context, index) {
                      final category = filteredCategories[index];
                      return _ServiceCategoryCard(
                        category: category,
                        searchQuery: _searchQuery,
                        index: index,
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  void _showActionCenterSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) => ActionCenterTray(
          initiallyExpanded: true,
          onClose: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }
}

class _ServiceCategoryCard extends StatelessWidget {
  final _ServiceCategory category;
  final String searchQuery;
  final int index;

  const _ServiceCategoryCard({
    required this.category,
    required this.searchQuery,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (index == 0 || searchQuery.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8, bottom: 8),
            child: Row(
              children: [
                Icon(category.icon, color: category.color, size: 20),
                const SizedBox(width: 8),
                Text(
                  category.name,
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: category.color,
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 8),
        ...category.services.map((service) => _ServiceTile(
              service: service,
              categoryColor: category.color,
            )),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _ServiceTile extends StatelessWidget {
  final _ServiceItem service;
  final Color categoryColor;

  const _ServiceTile({
    required this.service,
    required this.categoryColor,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 0,
      color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: theme.colorScheme.outlineVariant,
          width: 0.5,
        ),
      ),
      child: ListTile(
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: categoryColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            service.icon,
            color: categoryColor,
            size: 20,
          ),
        ),
        title: Text(
          service.name,
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          service.description,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        trailing: const Icon(Icons.chevron_right_rounded),
        onTap: () => context.push(service.route),
      ),
    );
  }
}

class _ServiceCategory {
  final String name;
  final IconData icon;
  final Color color;
  final List<_ServiceItem> services;

  const _ServiceCategory({
    required this.name,
    required this.icon,
    required this.color,
    required this.services,
  });
}

class _ServiceItem {
  final String name;
  final String description;
  final IconData icon;
  final String route;
  final String capability;

  const _ServiceItem({
    required this.name,
    required this.description,
    required this.icon,
    required this.route,
    required this.capability,
  });
}