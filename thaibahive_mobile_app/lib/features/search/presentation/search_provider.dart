import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/providers.dart';
import '../data/recent_searches_service.dart';
import '../data/search_models.dart';
import '../data/search_repository.dart';

final searchRepositoryProvider = Provider<SearchRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return SearchRepository(apiClient: apiClient);
});

final recentSearchesServiceProvider = Provider<RecentSearchesService>((ref) {
  return recentSearchesService;
});

@immutable
class SearchState {
  final String query;
  final List<String> selectedTypes;
  final List<SearchResult> results;
  final Map<String, List<SearchResult>> grouped;
  final int totalResults;
  final bool isLoading;
  final bool isOffline;
  final String? errorMessage;
  final int selectedIndex;
  final List<String> recentSearches;
  final List<String> suggestions;

  const SearchState({
    this.query = '',
    this.selectedTypes = const [],
    this.results = const [],
    this.grouped = const {},
    this.totalResults = 0,
    this.isLoading = false,
    this.isOffline = false,
    this.errorMessage,
    this.selectedIndex = -1,
    this.recentSearches = const [],
    this.suggestions = const [],
  });

  SearchState copyWith({
    String? query,
    List<String>? selectedTypes,
    List<SearchResult>? results,
    Map<String, List<SearchResult>>? grouped,
    int? totalResults,
    bool? isLoading,
    bool? isOffline,
    String? errorMessage,
    bool clearError = false,
    int? selectedIndex,
    List<String>? recentSearches,
    List<String>? suggestions,
  }) {
    return SearchState(
      query: query ?? this.query,
      selectedTypes: selectedTypes ?? this.selectedTypes,
      results: results ?? this.results,
      grouped: grouped ?? this.grouped,
      totalResults: totalResults ?? this.totalResults,
      isLoading: isLoading ?? this.isLoading,
      isOffline: isOffline ?? this.isOffline,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      selectedIndex: selectedIndex ?? this.selectedIndex,
      recentSearches: recentSearches ?? this.recentSearches,
      suggestions: suggestions ?? this.suggestions,
    );
  }
}

class SearchNotifier extends StateNotifier<SearchState> {
  final SearchRepository _repository;
  final RecentSearchesService _recentService;
  Timer? _debounceTimer;
  CancelToken? _cancelToken;
  StreamSubscription? _connectivitySubscription;

  SearchNotifier({
    required SearchRepository repository,
    required RecentSearchesService recentService,
  })  : _repository = repository,
        _recentService = recentService,
        super(const SearchState()) {
    _init();
  }

  void _init() {
    _loadRecentSearches();
    _checkConnectivity();
    _connectivitySubscription = Connectivity().onConnectivityChanged.listen((results) {
      final isOffline = !results.any((r) => r != ConnectivityResult.none);
      if (state.isOffline != isOffline) {
        state = state.copyWith(isOffline: isOffline);
        if (!isOffline && state.query.isNotEmpty && state.results.isEmpty) {
          onQueryChanged(state.query);
        }
      }
    });
  }

  void _loadRecentSearches() {
    final recents = _recentService.getRecentSearches();
    state = state.copyWith(recentSearches: recents);
  }

  Future<void> _checkConnectivity() async {
    try {
      final results = await Connectivity().checkConnectivity();
      final isOffline = !results.any((r) => r != ConnectivityResult.none);
      state = state.copyWith(isOffline: isOffline);
    } catch (_) {}
  }

  void onQueryChanged(String query) {
    final trimmed = query.trim();
    _debounceTimer?.cancel();
    _cancelToken?.cancel('New query entered');
    _cancelToken = null;

    if (trimmed.isEmpty) {
      state = state.copyWith(
        query: '',
        results: const [],
        grouped: const {},
        totalResults: 0,
        isLoading: false,
        clearError: true,
        selectedIndex: -1,
        suggestions: const [],
      );
      _loadRecentSearches();
      return;
    }

    state = state.copyWith(
      query: query,
      clearError: true,
      selectedIndex: -1,
    );

    _debounceTimer = Timer(const Duration(milliseconds: 150), () {
      _executeSearch(trimmed);
    });
  }

  Future<void> _executeSearch(String query) async {
    final cancelToken = CancelToken();
    _cancelToken = cancelToken;

    state = state.copyWith(isLoading: true);

    try {
      final response = await _repository.search(
        query,
        types: state.selectedTypes.isNotEmpty ? state.selectedTypes : null,
        cancelToken: cancelToken,
      );

      if (cancelToken.isCancelled) return;

      state = state.copyWith(
        results: response.results,
        grouped: response.grouped,
        totalResults: response.total,
        isLoading: false,
        clearError: true,
        selectedIndex: response.results.isNotEmpty ? 0 : -1,
      );

      // Announce for accessibility screen readers
      if (response.results.isNotEmpty) {
        SemanticsService.announce(
          '${response.total} results found for $query',
          TextDirection.ltr,
        );
      } else {
        SemanticsService.announce(
          'No results found for $query',
          TextDirection.ltr,
        );
      }
    } catch (e) {
      if (cancelToken.isCancelled) return;
      final isDioCancel = e is DioException && e.type == DioExceptionType.cancel;
      if (isDioCancel) return;

      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to complete search. Please try again.',
      );
    }
  }

  void selectNextResult() {
    if (state.results.isEmpty) return;
    final next = (state.selectedIndex + 1) % state.results.length;
    state = state.copyWith(selectedIndex: next);
  }

  void selectPreviousResult() {
    if (state.results.isEmpty) return;
    final prev = state.selectedIndex <= 0 ? state.results.length - 1 : state.selectedIndex - 1;
    state = state.copyWith(selectedIndex: prev);
  }

  Future<void> addRecentSearch(String query) async {
    await _recentService.addSearch(query);
    _loadRecentSearches();
  }

  Future<void> removeRecentSearch(String query) async {
    await _recentService.removeSearch(query);
    _loadRecentSearches();
  }

  Future<void> clearRecentSearches() async {
    await _recentService.clearRecentSearches();
    _loadRecentSearches();
  }

  void toggleEntityType(String type) {
    final current = List<String>.from(state.selectedTypes);
    if (current.contains(type)) {
      current.remove(type);
    } else {
      current.add(type);
    }
    state = state.copyWith(selectedTypes: current);
    if (state.query.trim().isNotEmpty) {
      onQueryChanged(state.query);
    }
  }

  void retry() {
    if (state.query.trim().isNotEmpty) {
      _executeSearch(state.query.trim());
    }
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    _cancelToken?.cancel('Provider disposed');
    _connectivitySubscription?.cancel();
    super.dispose();
  }
}

final searchProvider = StateNotifierProvider.autoDispose<SearchNotifier, SearchState>((ref) {
  final repository = ref.watch(searchRepositoryProvider);
  final recentService = ref.watch(recentSearchesServiceProvider);
  return SearchNotifier(
    repository: repository,
    recentService: recentService,
  );
});
