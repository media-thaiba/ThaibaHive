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
  final bool isLoadingMore;
  final bool hasMore;

  const BookingsState({
    this.bookings = const [],
    this.resources = const [],
    this.isLoading = false,
    this.error,
    this.selectedResourceId,
    this.currentPage = 1,
    this.isLoadingMore = false,
    this.hasMore = true,
  });

  BookingsState copyWith({
    List<BookingModel>? bookings,
    List<BookingResourceModel>? resources,
    bool? isLoading,
    String? error,
    String? selectedResourceId,
    int? currentPage,
    bool? isLoadingMore,
    bool? hasMore,
  }) =>
      BookingsState(
        bookings: bookings ?? this.bookings,
        resources: resources ?? this.resources,
        isLoading: isLoading ?? this.isLoading,
        error: error,
        selectedResourceId: selectedResourceId ?? this.selectedResourceId,
        currentPage: currentPage ?? this.currentPage,
        isLoadingMore: isLoadingMore ?? this.isLoadingMore,
        hasMore: hasMore ?? this.hasMore,
      );
}

class BookingsNotifier extends StateNotifier<BookingsState> {
  final BookingsRepository _repository;

  BookingsNotifier(this._repository) : super(const BookingsState());

  Future<void> loadInitial() async {
    state = state.copyWith(isLoading: true, error: null, currentPage: 1, hasMore: true);
    try {
      final resources = await _repository.getResources();
      final bookings = await _repository.getBookings();
      state = state.copyWith(
        bookings: bookings,
        resources: resources,
        isLoading: false,
        hasMore: bookings.length >= 10,
        isLoadingMore: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> refresh() async {
    await loadInitial();
  }

  Future<void> loadMore() async {
    if (state.isLoadingMore || !state.hasMore || state.isLoading) return;
    state = state.copyWith(isLoadingMore: true);
    final nextPage = state.currentPage + 1;
    try {
      final bookings = await _repository.getBookings(page: nextPage);
      state = state.copyWith(
        bookings: [...state.bookings, ...bookings],
        currentPage: nextPage,
        hasMore: bookings.isNotEmpty,
        isLoadingMore: false,
      );
    } catch (e) {
      state = state.copyWith(isLoadingMore: false, error: e.toString());
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
