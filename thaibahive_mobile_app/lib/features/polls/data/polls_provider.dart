import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/poll_model.dart';

import 'polls_repository.dart';

class PollsState {
  final List<PollModel> polls;
  final bool isLoading;
  final String? error;
  final String? filter;

  const PollsState({
    this.polls = const [],
    this.isLoading = false,
    this.error,
    this.filter,
  });

  PollsState copyWith({
    List<PollModel>? polls,
    bool? isLoading,
    String? error,
    String? filter,
  }) =>
      PollsState(
        polls: polls ?? this.polls,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        filter: filter ?? this.filter,
      );
}

class PollsNotifier extends StateNotifier<PollsState> {
  final PollsRepository _repository;

  PollsNotifier(this._repository) : super(const PollsState());

  Future<void> loadPolls() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final polls = await _repository.getPolls();
      state = state.copyWith(polls: polls, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void setFilter(String? filter) {
    state = state.copyWith(filter: filter);
  }

  List<PollModel> get filteredPolls {
    var result = state.polls;
    if (state.filter == 'active') {
      result = result.where((p) => p.isActive).toList();
    } else if (state.filter == 'expired') {
      result = result.where((p) => !p.isActive).toList();
    }
    return result;
  }

  Future<void> createPoll(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createPoll(data);
      await loadPolls();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> respondToPoll(String pollId, String optionId) async {
    try {
      await _repository.respondToPoll(pollId, optionId);
      await loadPolls();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getResults(String pollId) async {
    return await _repository.getPollResults(pollId);
  }

  Future<void> deletePoll(String id) async {
    try {
      await _repository.deletePoll(id);
      await loadPolls();
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }
}

final pollsProvider = StateNotifierProvider<PollsNotifier, PollsState>((ref) {
  final repo = ref.read(pollsRepositoryProvider);
  return PollsNotifier(repo);
});
