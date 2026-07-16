import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/help_desk_model.dart';

import 'help_desk_repository.dart';

class HelpDeskState {
  final List<HelpDeskTicketModel> tickets;
  final HelpDeskTicketModel? selectedTicket;
  final bool isLoading;
  final String? error;
  final String? statusFilter;
  final String? categoryFilter;

  const HelpDeskState({
    this.tickets = const [],
    this.selectedTicket,
    this.isLoading = false,
    this.error,
    this.statusFilter,
    this.categoryFilter,
  });

  HelpDeskState copyWith({
    List<HelpDeskTicketModel>? tickets,
    HelpDeskTicketModel? selectedTicket,
    bool? isLoading,
    String? error,
    String? statusFilter,
    String? categoryFilter,
  }) =>
      HelpDeskState(
        tickets: tickets ?? this.tickets,
        selectedTicket: selectedTicket ?? this.selectedTicket,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        statusFilter: statusFilter ?? this.statusFilter,
        categoryFilter: categoryFilter ?? this.categoryFilter,
      );
}

class HelpDeskNotifier extends StateNotifier<HelpDeskState> {
  final HelpDeskRepository _repository;

  HelpDeskNotifier(this._repository) : super(const HelpDeskState());

  Future<void> loadTickets() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final tickets = await _repository.getTickets();
      state = state.copyWith(tickets: tickets, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> loadTicketDetail(String id) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final ticket = await _repository.getTicket(id);
      state = state.copyWith(selectedTicket: ticket, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> createTicket(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createTicket(data);
      await loadTickets();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> updateTicket(String id, Map<String, dynamic> data) async {
    try {
      final updated = await _repository.updateTicket(id, data);
      state = state.copyWith(selectedTicket: updated);
      await loadTickets();
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  Future<void> addComment(String ticketId, String comment) async {
    try {
      await _repository.addComment(ticketId, comment);
      await loadTicketDetail(ticketId);
    } catch (e) {
      state = state.copyWith(error: e.toString());
      rethrow;
    }
  }

  void setStatusFilter(String? status) {
    state = state.copyWith(statusFilter: status);
  }

  void setCategoryFilter(String? category) {
    state = state.copyWith(categoryFilter: category);
  }

  List<HelpDeskTicketModel> get filteredTickets {
    var result = state.tickets;
    if (state.statusFilter != null) {
      result = result.where((t) => t.status == state.statusFilter).toList();
    }
    if (state.categoryFilter != null) {
      result = result.where((t) => t.category == state.categoryFilter).toList();
    }
    return result;
  }
}

final helpDeskProvider =
    StateNotifierProvider<HelpDeskNotifier, HelpDeskState>((ref) {
  final repo = ref.read(helpDeskRepositoryProvider);
  return HelpDeskNotifier(repo);
});
