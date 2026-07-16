import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/extensions.dart';
import '../../../models/event_model.dart';
import '../../../shared/widgets/error_widget.dart';
import '../../../shared/widgets/loading_widget.dart';
import '../data/events_provider.dart';

class EventsScreen extends ConsumerStatefulWidget {
  const EventsScreen({super.key});

  @override
  ConsumerState<EventsScreen> createState() => _EventsScreenState();
}

class _EventsScreenState extends ConsumerState<EventsScreen> {
  String _selectedType = 'all';
  final _types = ['all', 'meeting', 'workshop', 'social', 'holiday', 'other'];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final eventsAsync = ref.watch(eventsListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Events')),
      body: Column(
        children: [
          Container(
            color: theme.colorScheme.surface,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: _types.map((type) {
                  final label = type == 'all' ? 'All' : type;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(label[0].toUpperCase() + label.substring(1)),
                      selected: _selectedType == type,
                      onSelected: (_) {
                        setState(() => _selectedType = type);
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            child: eventsAsync.when(
              data: (events) {
                final filtered = _selectedType == 'all'
                    ? events
                    : events.where((e) => e.eventType == _selectedType).toList();
                if (filtered.isEmpty) {
                  return const EmptyStateWidget(
                    icon: Icons.event_rounded,
                    title: 'No Events',
                    message: 'There are no upcoming events.',
                  );
                }
                return RefreshIndicator(
                  onRefresh: () =>
                      ref.read(eventsListProvider.notifier).refresh(),
                  child: ListView.builder(
                    padding: const EdgeInsets.only(top: 8, bottom: 80),
                    itemCount: filtered.length,
                    itemBuilder: (_, i) => _EventCard(
                      event: filtered[i],
                      onRsvp: () => _rsvpEvent(filtered[i].id),
                    ),
                  ),
                );
              },
              loading: () => const PageShimmer(),
              error: (e, _) => AppErrorWidget(
                message: e.toString(),
                onRetry: () =>
                    ref.read(eventsListProvider.notifier).refresh(),
              ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add_rounded),
      ),
    );
  }

  Future<void> _rsvpEvent(String id) async {
    try {
      await ref.read(eventsListProvider.notifier).rsvp(id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('RSVP confirmed!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e')),
        );
      }
    }
  }

  void _showCreateDialog(BuildContext context) {
    final titleCtrl = TextEditingController();
    final descCtrl = TextEditingController();
    final locCtrl = TextEditingController();
    String type = 'meeting';
    DateTime date = DateTime.now();
    TimeOfDay startTime = const TimeOfDay(hour: 9, minute: 0);
    TimeOfDay endTime = const TimeOfDay(hour: 10, minute: 0);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Create Event'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleCtrl,
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Event title',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  alignLabelWithHint: true,
                ),
                maxLines: 3,
              ),
              const SizedBox(height: 12),
              TextField(
                controller: locCtrl,
                decoration: const InputDecoration(
                  labelText: 'Location (optional)',
                  prefixIcon: Icon(Icons.location_on_rounded),
                ),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: type,
                decoration: const InputDecoration(labelText: 'Event Type'),
                items: _types
                    .where((t) => t != 'all')
                    .map((t) => DropdownMenuItem(
                          value: t,
                          child: Text(t[0].toUpperCase() + t.substring(1)),
                        ))
                    .toList(),
                onChanged: (v) => type = v!,
              ),
              const SizedBox(height: 12),
              ListTile(
                title: Text('Date: ${DateFormat('dd MMM yyyy').format(date)}'),
                trailing: const Icon(Icons.calendar_month_rounded),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: date,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) date = picked;
                },
              ),
              ListTile(
                title: Text(
                    'Start: ${startTime.format(context)}'),
                trailing: const Icon(Icons.access_time_rounded),
                onTap: () async {
                  final picked = await showTimePicker(
                    context: ctx,
                    initialTime: startTime,
                  );
                  if (picked != null) startTime = picked;
                },
              ),
              ListTile(
                title:
                    Text('End: ${endTime.format(context)}'),
                trailing: const Icon(Icons.access_time_rounded),
                onTap: () async {
                  final picked = await showTimePicker(
                    context: ctx,
                    initialTime: endTime,
                  );
                  if (picked != null) endTime = picked;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (titleCtrl.text.trim().isEmpty) return;
              ref
                  .read(eventsListProvider.notifier)
                  .createEvent({
                'title': titleCtrl.text.trim(),
                'description': descCtrl.text.trim(),
                'location': locCtrl.text.trim(),
                'event_date':
                    DateFormat('yyyy-MM-dd').format(date),
                'start_time':
                    '${startTime.hour.toString().padLeft(2, '0')}:${startTime.minute.toString().padLeft(2, '0')}',
                'end_time':
                    '${endTime.hour.toString().padLeft(2, '0')}:${endTime.minute.toString().padLeft(2, '0')}',
                'event_type': type,
              });
              Navigator.pop(ctx);
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}

class _EventCard extends StatelessWidget {
  final EventModel event;
  final VoidCallback onRsvp;
  const _EventCard({required this.event, required this.onRsvp});

  IconData _typeIcon(String type) {
    switch (type) {
      case 'meeting':
        return Icons.groups_rounded;
      case 'workshop':
        return Icons.school_rounded;
      case 'social':
        return Icons.celebration_rounded;
      case 'holiday':
        return Icons.card_travel_rounded;
      default:
        return Icons.event_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final eventDate = DateTime.tryParse(event.eventDate);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(_typeIcon(event.eventType),
                      color: theme.colorScheme.primary, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(event.title,
                          style: theme.textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w600),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      if (eventDate != null)
                        Text(
                          DateFormat('EEEE, dd MMM yyyy').format(eventDate),
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurface
                                .withValues(alpha: 0.6),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (event.startTime != null)
              _InfoChip(
                  icon: Icons.access_time_rounded,
                  text:
                      '${event.startTime}${event.endTime != null ? ' - ${event.endTime}' : ''}'),
            if (event.location != null)
              _InfoChip(
                  icon: Icons.location_on_rounded,
                  text: event.location!),
            _InfoChip(
                icon: Icons.people_rounded,
                text: '${event.attendeeCount} attending'),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: event.hasRsvp ? null : onRsvp,
                    icon: Icon(
                      event.hasRsvp
                          ? Icons.check_circle_rounded
                          : Icons.event_available_rounded,
                      size: 18,
                    ),
                    label: Text(event.hasRsvp ? 'RSVP\'d' : 'RSVP'),
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

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoChip({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Icon(icon, size: 16,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.6)),
          const SizedBox(width: 6),
          Text(text,
              style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface
                      .withValues(alpha: 0.7))),
        ],
      ),
    );
  }
}
