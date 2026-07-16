import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/booking_model.dart';
import 'package:thaibahive_mobile/models/booking_resource_model.dart';

import 'bookings_repository.dart';

class BookingsState {
  final List<BookingModel> bookings;
  final List<BookingResourceModel> resources;
  final bool isLoading;
  final String? error;
  final String? selectedResourceId;
  final int currentPage;

  const BookingsState({
    this.bookings = const [],
    this.resources = const [],
    this.isLoading = false,
    this.error,
    this.selectedResourceId,
    this.currentPage = 1,
  });

  BookingsState copyWith({
    List<BookingModel>? bookings,
    List<BookingResourceModel>? resources,
    bool? isLoading,
    String? error,
    String? selectedResourceId,
    int? currentPage,
  }) =>
      BookingsState(
        bookings: bookings ?? this.bookings,
        resources: resources ?? this.resources,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        selectedResourceId: selectedResourceId ?? this.selectedResourceId,
        currentPage: currentPage ?? this.currentPage,
      );
}

class BookingsNotifier extends StateNotifier<BookingsState> {
  final BookingsRepository _repository;

  BookingsNotifier(this._repository) : super(const BookingsState());

  Future<void> loadInitial() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final resources = await _repository.getResources();
      final bookings = await _repository.getBookings();
      state = state.copyWith(
        bookings: bookings,
        resources: resources,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> refresh() async {
    await loadInitial();
  }

  Future<void> loadMore() async {
    final nextPage = state.currentPage + 1;
    try {
      final bookings = await _repository.getBookings(page: nextPage);
      state = state.copyWith(
        bookings: [...state.bookings, ...bookings],
        currentPage: nextPage,
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void setResourceFilter(String? resourceId) {
    state = state.copyWith(selectedResourceId: resourceId);
  }

  List<BookingModel> get filteredBookings {
    if (state.selectedResourceId == null) return state.bookings;
    return state.bookings
        .where((b) => b.resourceId == state.selectedResourceId)
        .toList();
  }

  Future<void> createBooking(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true);
    try {
      await _repository.createBooking(data);
      await refresh();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }
}

final bookingsProvider =
    StateNotifierProvider<BookingsNotifier, BookingsState>((ref) {
  final repo = ref.read(bookingsRepositoryProvider);
  return BookingsNotifier(repo);
});
