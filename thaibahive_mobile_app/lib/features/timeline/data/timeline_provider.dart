import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'timeline_repository.dart';

class TimelineState {
  final List<TimelineItem> items;
  final bool isLoading;
  final String? error;

  const TimelineState({
    this.items = const [],
    this.isLoading = false,
    this.error,
  });

  TimelineState copyWith({
    List<TimelineItem>? items,
    bool? isLoading,
    String? error,
  }) =>
      TimelineState(
        items: items ?? this.items,
        isLoading: isLoading ?? this.isLoading,
        error: error,
      );
}

class TimelineNotifier extends StateNotifier<TimelineState> {
  final TimelineRepository _repository;

  TimelineNotifier(this._repository) : super(const TimelineState());

  Future<void> loadTimeline() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final items = await _repository.getTimeline();
      state = state.copyWith(items: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Map<String, List<TimelineItem>> get groupedByDate {
    final grouped = <String, List<TimelineItem>>{};
    for (final item in state.items) {
      final key =
          '${item.timestamp.year}-${item.timestamp.month.toString().padLeft(2, '0')}-${item.timestamp.day.toString().padLeft(2, '0')}';
      grouped.putIfAbsent(key, () => []);
      grouped[key]!.add(item);
    }
    return grouped;
  }
}

final timelineProvider =
    StateNotifierProvider<TimelineNotifier, TimelineState>((ref) {
  final repo = ref.read(timelineRepositoryProvider);
  return TimelineNotifier(repo);
});
