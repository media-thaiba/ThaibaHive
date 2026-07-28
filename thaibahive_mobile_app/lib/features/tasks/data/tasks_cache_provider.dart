import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../../../core/network/api_client.dart';
import '../../../core/services/offline_cache_service.dart';
import '../../../core/services/offline_queue.dart';
import '../../../models/task_model.dart';
import '../../../models/task_comment_model.dart';

class CachedTasksState {
  final List<TaskModel> tasks;
  final List<TaskCommentModel> comments;
  final Map<String, List<TaskCommentModel>> commentsByTask;
  final bool isOffline;
  final String? error;
  final String statusFilter;
  final String priorityFilter;

  const CachedTasksState({
    this.tasks = const [],
    this.comments = const [],
    this.commentsByTask = const {},
    this.isOffline = false,
    this.error,
    this.statusFilter = 'all',
    this.priorityFilter = 'all',
  });

  List<TaskModel> get filteredTasks {
    return tasks.where((t) {
      if (statusFilter != 'all' && t.status != statusFilter) return false;
      if (priorityFilter != 'all' && t.priority != priorityFilter) return false;
      return true;
    }).toList();
  }

  CachedTasksState copyWith({
    List<TaskModel>? tasks,
    List<TaskCommentModel>? comments,
    Map<String, List<TaskCommentModel>>? commentsByTask,
    bool? isOffline,
    String? error,
    String? statusFilter,
    String? priorityFilter,
  }) {
    return CachedTasksState(
      tasks: tasks ?? this.tasks,
      comments: comments ?? this.comments,
      commentsByTask: commentsByTask ?? this.commentsByTask,
      isOffline: isOffline ?? this.isOffline,
      error: error,
      statusFilter: statusFilter ?? this.statusFilter,
      priorityFilter: priorityFilter ?? this.priorityFilter,
    );
  }
}

class TasksCacheNotifier extends StateNotifier<AsyncValue<CachedTasksState>> {
  static const String tasksCacheKey = 'cache_tasks_v1';
  static const String commentsCacheKeyPrefix = 'cache_task_comments_';
  final ApiClient _apiClient = ApiClient();
  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _wasOffline = false;

  TasksCacheNotifier() : super(const AsyncValue.loading()) {
    fetchTasks();
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      (results) async {
        final isOnline = results.any((r) => r != ConnectivityResult.none);
        if (!_wasOffline && !isOnline) {
          _wasOffline = true;
        } else if (_wasOffline && isOnline) {
          _wasOffline = false;
          await fetchTasks();
        }
      },
      onError: (error) {
        print('[TasksCacheNotifier] Connectivity listener error: $error');
      },
    );
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  Future<void> fetchTasks({
    String statusFilter = 'all',
    String priorityFilter = 'all',
    int page = 1,
    int limit = 20,
  }) async {
    state = const AsyncValue.loading();

    final cacheKey =
        '${tasksCacheKey}_${statusFilter}_${priorityFilter}_page_$page';

    final cachedTasks = await offlineCacheService.getCache(
      cacheKey,
      maxAge: const Duration(minutes: 15),
    );

    if (cachedTasks is List) {
      state = AsyncValue.data(CachedTasksState(
        tasks: cachedTasks
            .map((e) => TaskModel.fromJson(e as Map<String, dynamic>))
            .toList(),
        isOffline: false,
        statusFilter: statusFilter,
        priorityFilter: priorityFilter,
      ));
    }

    try {
      final response = await _apiClient.dio.get('/tasks', queryParameters: {
        'page': page,
        'limit': limit,
        if (statusFilter != 'all') 'status': statusFilter,
        if (priorityFilter != 'all') 'priority': priorityFilter,
      });

      final List<dynamic> data = response.data is List
          ? response.data
          : (response.data['data'] as List<dynamic>?) ??
              (response.data['tasks'] as List<dynamic>?) ??
              [];

      final tasks =
          data.map((e) => TaskModel.fromJson(e as Map<String, dynamic>)).toList();

      await offlineCacheService.saveCache(cacheKey, data);

      state = AsyncValue.data(CachedTasksState(
        tasks: tasks,
        isOffline: false,
        statusFilter: statusFilter,
        priorityFilter: priorityFilter,
      ));
    } catch (e, st) {
      final fallback = await offlineCacheService.getCache(cacheKey);
      if (fallback is List) {
        state = AsyncValue.data(CachedTasksState(
tasks: fallback
               .map((e) => TaskModel.fromJson(e as Map<String, dynamic>))
               .toList(),
          isOffline: true,
          error: 'Showing cached data',
          statusFilter: statusFilter,
          priorityFilter: priorityFilter,
        ));
      } else {
        state = AsyncValue.error(e, st);
      }
    }
  }

  Future<void> fetchComments(String taskId) async {
    final cacheKey = '$commentsCacheKeyPrefix$taskId';

    final cachedComments = await offlineCacheService.getCache(
      cacheKey,
      maxAge: const Duration(minutes: 30),
    );

    if (cachedComments is List) {
      final comments = cachedComments
          .map((e) => TaskCommentModel.fromJson(e as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(CachedTasksState(
        tasks: state.valueOrNull?.tasks ?? [],
        comments: comments,
        commentsByTask: {
          ...state.valueOrNull?.commentsByTask ?? {},
          taskId: comments,
        },
        isOffline: false,
      ));
    }

    try {
      final response = await _apiClient.dio.get('/tasks/$taskId/comments');
      final List<dynamic> data = response.data is List
          ? response.data
          : (response.data['data'] as List<dynamic>?) ??
              (response.data['comments'] as List<dynamic>?) ??
              [];

      final comments = data
          .map((e) => TaskCommentModel.fromJson(e as Map<String, dynamic>))
          .toList();

      await offlineCacheService.saveCache(cacheKey, data);

      state = AsyncValue.data(CachedTasksState(
        tasks: state.valueOrNull?.tasks ?? [],
        comments: comments,
        commentsByTask: {
          ...state.valueOrNull?.commentsByTask ?? {},
          taskId: comments,
        },
        isOffline: false,
      ));
    } catch (e, st) {
      final fallback = await offlineCacheService.getCache(cacheKey);
      if (fallback is List) {
        final comments = fallback
            .map((e) => TaskCommentModel.fromJson(e as Map<String, dynamic>))
            .toList();
        state = AsyncValue.data(CachedTasksState(
          tasks: state.valueOrNull?.tasks ?? [],
          comments: comments,
          commentsByTask: {
            ...state.valueOrNull?.commentsByTask ?? {},
            taskId: comments,
          },
          isOffline: true,
        ));
      } else {
        state = AsyncValue.error(e, st);
      }
    }
  }

  Future<void> createTask(Map<String, dynamic> data) async {
    try {
      await _apiClient.dio.post('/tasks', data: data);
      await offlineCacheService.invalidateCache(tasksCacheKey);
      await fetchTasks();
    } catch (e) {
      // Enqueue for offline sync
      await offlineQueue.enqueue(
        type: 'task_create',
        payload: data,
      );
      state = AsyncValue.data(CachedTasksState(
        tasks: state.valueOrNull?.tasks ?? [],
        error: 'Task queued for offline sync',
      ));
    }
  }

  Future<void> updateTask(String id, Map<String, dynamic> data) async {
    try {
      await _apiClient.dio.put('/tasks/$id', data: data);
      await offlineCacheService.invalidateCache(tasksCacheKey);
      await fetchTasks();
    } catch (e) {
      // Enqueue for offline sync
      await offlineQueue.enqueue(
        type: 'task_update',
        payload: {'id': id, ...data},
      );
      state = AsyncValue.data(CachedTasksState(
        tasks: state.valueOrNull?.tasks ?? [],
        error: 'Task update queued for offline sync',
      ));
    }
  }

  Future<void> deleteTask(String id) async {
    try {
      await _apiClient.dio.delete('/tasks/$id');
      await offlineCacheService.invalidateCache(tasksCacheKey);
      await fetchTasks();
    } catch (e) {
      // Enqueue for offline sync
      await offlineQueue.enqueue(
        type: 'task_delete',
        payload: {'id': id},
      );
      state = AsyncValue.data(CachedTasksState(
        tasks: state.valueOrNull?.tasks ?? [],
        error: 'Task deletion queued for offline sync',
      ));
    }
  }

  Future<void> refresh() async {
    final currentTasks = state.valueOrNull?.tasks ?? [];
    final statusFilter =
        currentTasks.isNotEmpty ? _deriveStatusFilter(currentTasks) : 'all';
    final priorityFilter = currentTasks.isNotEmpty
        ? _derivePriorityFilter(currentTasks)
        : 'all';
    await fetchTasks(
      statusFilter: statusFilter,
      priorityFilter: priorityFilter,
    );
  }

  String _deriveStatusFilter(List<TaskModel> tasks) {
    if (tasks.isEmpty) return 'all';
    final statuses = tasks.map((t) => t.status).toSet();
    if (statuses.length == 1) return statuses.first;
    return 'all';
  }

  String _derivePriorityFilter(List<TaskModel> tasks) {
    if (tasks.isEmpty) return 'all';
    final priorities = tasks.map((t) => t.priority).toSet();
    if (priorities.length == 1) return priorities.first;
    return 'all';
  }
}

final cachedTasksProvider = StateNotifierProvider<TasksCacheNotifier,
    AsyncValue<CachedTasksState>>((ref) {
  return TasksCacheNotifier();
});