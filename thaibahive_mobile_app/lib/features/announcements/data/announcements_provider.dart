import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/announcement_model.dart';
import 'announcements_repository.dart';

final announcementPriorityProvider =
    StateProvider<String>((ref) => 'all');

final announcementsListProvider =
    AsyncNotifierProvider<AnnouncementsListNotifier, List<AnnouncementModel>>(
  AnnouncementsListNotifier.new,
);

class AnnouncementsListNotifier
    extends AsyncNotifier<List<AnnouncementModel>> {
  @override
  Future<List<AnnouncementModel>> build() async {
    final priority = ref.watch(announcementPriorityProvider);
    final repo = ref.watch(announcementsRepositoryProvider);
    return repo.getAnnouncements(priority: priority);
  }

  Future<void> refresh() async {
    final repo = ref.watch(announcementsRepositoryProvider);
    final priority = ref.read(announcementPriorityProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(
        () => repo.getAnnouncements(priority: priority));
  }

  Future<void> createAnnouncement(Map<String, dynamic> data) async {
    final repo = ref.watch(announcementsRepositoryProvider);
    await repo.createAnnouncement(data);
    await refresh();
  }

  Future<void> markAsRead(String id) async {
    final repo = ref.watch(announcementsRepositoryProvider);
    await repo.markAsRead(id);
  }
}
