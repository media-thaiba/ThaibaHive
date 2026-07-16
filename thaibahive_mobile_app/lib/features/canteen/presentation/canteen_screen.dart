import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/widgets/app_scaffold.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/canteen_provider.dart';

class CanteenScreen extends ConsumerStatefulWidget {
  const CanteenScreen({super.key});

  @override
  ConsumerState<CanteenScreen> createState() => _CanteenScreenState();
}

class _CanteenScreenState extends ConsumerState<CanteenScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(canteenProvider.notifier).loadMeals());
  }

  Future<void> _selectDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: ref.read(canteenProvider).selectedDate,
      firstDate: now.subtract(const Duration(days: 7)),
      lastDate: now.add(const Duration(days: 30)),
    );
    if (date != null) {
      ref.read(canteenProvider.notifier).setSelectedDate(date);
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(canteenProvider);
    final notifier = ref.read(canteenProvider.notifier);
    final theme = Theme.of(context);

    final dateStr =
        '${state.selectedDate.day} ${_months[state.selectedDate.month - 1]} ${state.selectedDate.year}';
    final isToday = state.selectedDate.day == DateTime.now().day &&
        state.selectedDate.month == DateTime.now().month &&
        state.selectedDate.year == DateTime.now().year;

    return AppScaffold(
      title: 'Canteen',
      showBack: false,
      body: state.isLoading
          ? const PageShimmer()
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: InkWell(
                    onTap: _selectDate,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          const Icon(Icons.calendar_month_rounded),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment:
                                  CrossAxisAlignment.start,
                              children: [
                                Text(isToday ? 'Today' : 'Selected Date',
                                    style: theme.textTheme.titleSmall),
                                Text(dateStr,
                                    style: theme.textTheme.titleMedium
                                        ?.copyWith(
                                            fontWeight:
                                                FontWeight.w600)),
                              ],
                            ),
                          ),
                          const Icon(Icons.arrow_forward_ios_rounded,
                              size: 16),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text('Meal Preferences',
                    style: theme.textTheme.titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                _mealTypeCard('Breakfast', 'breakfast', state, notifier,
                    theme),
                _mealTypeCard(
                    'Lunch', 'lunch', state, notifier, theme),
                _mealTypeCard(
                    'Dinner', 'dinner', state, notifier, theme),
              ],
            ),
    );
  }

  Widget _mealTypeCard(
    String label,
    String mealType,
    CanteenState state,
    CanteenNotifier notifier,
    ThemeData theme,
  ) {
    final existing = state.meals.where((m) => m.mealType == mealType).firstOrNull;
    final currentStatus = existing?.status ?? 'none';
    final guestCount = existing?.guestCount ?? 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label,
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.w600)),
            const SizedBox(height: 12),
            Row(
              children: [
                _statusOption('Eat', 'eat', currentStatus, mealType,
                    notifier, theme, Icons.restaurant_rounded),
                const SizedBox(width: 8),
                _statusOption('Skip', 'skip', currentStatus, mealType,
                    notifier, theme, Icons.block_rounded),
                const SizedBox(width: 8),
                _statusOption('Guest', 'guest', currentStatus, mealType,
                    notifier, theme, Icons.group_add_rounded),
              ],
            ),
            if (currentStatus == 'guest') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Text('Guest count: ',
                      style: TextStyle(color: Colors.grey[600])),
                  IconButton(
                    icon: const Icon(Icons.remove_circle_outline),
                    onPressed: guestCount > 0
                        ? () => notifier.saveMealPreference(
                            mealType, 'guest',
                            guestCount: guestCount - 1)
                        : null,
                  ),
                  Text('$guestCount',
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w600)),
                  IconButton(
                    icon: const Icon(Icons.add_circle_outline),
                    onPressed: () => notifier.saveMealPreference(
                        mealType, 'guest',
                        guestCount: guestCount + 1),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _statusOption(
    String label,
    String value,
    String current,
    String mealType,
    CanteenNotifier notifier,
    ThemeData theme,
    IconData icon,
  ) {
    final selected = current == value;
    return Expanded(
      child: InkWell(
        onTap: () => notifier.saveMealPreference(mealType, value),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: selected
                ? theme.colorScheme.primary.withValues(alpha: 0.15)
                : Colors.grey.withValues(alpha: 0.08),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: selected
                  ? theme.colorScheme.primary
                  : Colors.grey.withValues(alpha: 0.3),
              width: selected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(icon,
                  size: 24,
                  color: selected
                      ? theme.colorScheme.primary
                      : Colors.grey[600]),
              const SizedBox(height: 4),
              Text(label,
                  style: TextStyle(
                    fontWeight:
                        selected ? FontWeight.w600 : FontWeight.normal,
                    color: selected
                        ? theme.colorScheme.primary
                        : Colors.grey[600],
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

const _months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
