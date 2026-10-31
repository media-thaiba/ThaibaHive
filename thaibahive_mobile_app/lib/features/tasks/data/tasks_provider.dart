import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/models/task_comment_model.dart';
import 'package:thaibahive_mobile/models/task_model.dart';
import 'tasks_repository.dart';

class TasksState {
  final bool isLoading;
  final String? error;
  final List<TaskModel> tasks;
  final String statusFilter;
  final String priorityFilter;

  const TasksState({
    this.isLoading = false,
    this.error,
    this.tasks = const [],
    this.statusFilter = 'all',
    this.priorityFilter = 'all',
  });

  TasksState copyWith({
    bool? isLoading,
    String? error,
    List<TaskModel>? tasks,
    String? statusFilter,
    String? priorityFilter,
  }) {
    return TasksState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      tasks: tasks ?? this.tasks,
      statusFilter: statusFilter ?? this.statusFilter,
      priorityFilter: priorityFilter ?? this.priorityFilter,
    );
  }

  List<TaskModel> get filteredTasks {
    return tasks.where((t) {
      if (statusFilter != 'all' && t.status != statusFilter) return false;
      if (priorityFilter != 'all' && t.priority != priorityFilter) return false;
      return true;
    }).toList();
  }
}

class TasksNotifier extends StateNotifier<TasksState> {
  final TasksRepository _repository;

  TasksNotifier(this._repository) : super(const TasksState()) {
    fetchTasks();
  }

  Future<void> fetchTasks() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final tasks = await _repository.getTasks();
      state = TasksState(
        tasks: tasks,
        statusFilter: state.statusFilter,
        priorityFilter: state.priorityFilter,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to load tasks: $e',
      );
    }
  }

  void setStatusFilter(String filter) {
    state = state.copyWith(statusFilter: filter);
  }

  void setPriorityFilter(String filter) {
    state = state.copyWith(priorityFilter: filter);
  }

  Future<void> refresh() async {
    await fetchTasks();
  }

  Future<void> createTask(Map<String, dynamic> data) async {
    try {
      await _repository.createTask(data);
      await refresh();
    } catch (e) {
      state = state.copyWith(error: 'Failed to create task: $e');
    }
  }

  Future<void> updateTask(String id, Map<String, dynamic> data) async {
    final previousTasks = state.tasks;
    final updatedTasks = state.tasks.map((task) {
      if (task.id == id) {
        return task.copyWith(
          status: data['status'] as String? ?? task.status,
          priority: data['priority'] as String? ?? task.priority,
          title: data['title'] as String? ?? task.title,
          description: data['description'] as String? ?? task.description,
        );
      }
      return task;
    }).toList();

    state = state.copyWith(tasks: updatedTasks);

    try {
      await _repository.updateTask(id, data);
    } catch (e) {
      state = state.copyWith(
        tasks: previousTasks,
        error: 'Failed to update task: $e',
      );
    }
  }

  Future<void> deleteTask(String id) async {
    final previousTasks = state.tasks;
    state = state.copyWith(
      tasks: state.tasks.where((t) => t.id != id).toList(),
    );

    try {
      await _repository.deleteTask(id);
    } catch (e) {
      state = state.copyWith(
        tasks: previousTasks,
        error: 'Failed to delete task: $e',
      );
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final tasksProvider = StateNotifierProvider<TasksNotifier, TasksState>((ref) {
  return TasksNotifier(ref.watch(tasksRepositoryProvider));
});

final taskDetailProvider =
    FutureProvider.family<TaskModel, String>((ref, id) async {
  final repo = ref.watch(tasksRepositoryProvider);
  return repo.getTask(id);
});

final taskCommentsProvider =
    FutureProvider.family<List<TaskCommentModel>, String>((ref, taskId) async {
  final repo = ref.watch(tasksRepositoryProvider);
  return repo.getComments(taskId);
});
