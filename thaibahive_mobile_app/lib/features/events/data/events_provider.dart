import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/event_model.dart';
import 'events_repository.dart';

final eventsListProvider =
    AsyncNotifierProvider<EventsListNotifier, List<EventModel>>(
  EventsListNotifier.new,
);

class EventsListNotifier extends AsyncNotifier<List<EventModel>> {
  @override
  Future<List<EventModel>> build() async {
    final repo = ref.watch(eventsRepositoryProvider);
    return repo.getEvents();
  }

  Future<void> refresh() async {
    final repo = ref.watch(eventsRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getEvents());
  }

  Future<void> createEvent(Map<String, dynamic> data) async {
    final repo = ref.watch(eventsRepositoryProvider);
    await repo.createEvent(data);
    await refresh();
  }

  Future<void> rsvp(String id) async {
    final repo = ref.watch(eventsRepositoryProvider);
    await repo.rsvp(id);
  }
}
