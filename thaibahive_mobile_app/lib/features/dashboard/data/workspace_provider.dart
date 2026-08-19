import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive/hive.dart';
import 'dart:convert';
import 'package:thaibahive_mobile/core/network/providers.dart';

const _cacheBoxName = 'mobile_workspaces_cache';

class WorkspaceState {
  final bool isLoading;
  final String? error;
  final Map<String, dynamic>? data;

  const WorkspaceState({this.isLoading = false, this.error, this.data});

  WorkspaceState copyWith({bool? isLoading, String? error, Map<String, dynamic>? data}) {
    return WorkspaceState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      data: data ?? this.data,
    );
  }
}

class WorkspaceNotifier extends StateNotifier<WorkspaceState> {
  final Ref _ref;

  WorkspaceNotifier(this._ref) : super(const WorkspaceState()) {
    _loadCached();
    fetchWorkspaceData();
  }

  Future<void> _loadCached() async {
    try {
      final box = await Hive.openBox<String>(_cacheBoxName);
      final cached = box.get('workspace_data');
      if (cached != null && state.data == null) {
        final data = jsonDecode(cached) as Map<String, dynamic>;
        state = state.copyWith(data: data);
      }
    } catch (_) {}
  }

  Future<void> fetchWorkspaceData() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = _ref.read(dioProvider);
      final response = await dio.get('/api/workspaces/data');
      if (response.statusCode == 200) {
        final data = response.data as Map<String, dynamic>;
        state = WorkspaceState(isLoading: false, data: data);
        // Cache the result
        final box = await Hive.openBox<String>(_cacheBoxName);
        await box.put('workspace_data', jsonEncode(data));
      } else {
        throw Exception('Failed: ${response.statusCode}');
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load workspace: $e',
      );
    }
  }

  Future<void> refresh() => fetchWorkspaceData();
}

final workspaceStateProvider =
    StateNotifierProvider<WorkspaceNotifier, WorkspaceState>((ref) {
  return WorkspaceNotifier(ref);
});
