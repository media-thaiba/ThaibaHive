import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/task_comment_model.dart';
import 'package:thaibahive_mobile/models/task_model.dart';

final tasksRepositoryProvider = Provider<TasksRepository>((ref) {
  return TasksRepository(ref.watch(dioProvider));
});

class TasksRepository {
  final Dio _client;
  TasksRepository(this._client);

  Future<List<TaskModel>> getTasks({
    String? status,
    String? priority,
    int page = 1,
    int limit = 20,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
    };
    if (status != null && status != 'all') params['status'] = status;
    if (priority != null && priority != 'all') params['priority'] = priority;

    final response = await _client.get('/tasks', queryParameters: params);
    final List<dynamic> data = response.data is List
        ? response.data
        : (response.data['data'] as List<dynamic>? ??
            response.data['tasks'] as List<dynamic>? ??
            []);
    return data
        .map((e) => TaskModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TaskModel> getTask(String id) async {
    final response = await _client.get('/tasks/$id');
    return TaskModel.fromJson(response.data);
  }

  Future<TaskModel> createTask(Map<String, dynamic> data) async {
    final response = await _client.post('/tasks', data: data);
    return TaskModel.fromJson(response.data);
  }

  Future<TaskModel> updateTask(String id, Map<String, dynamic> data) async {
    final response = await _client.put('/tasks/$id', data: data);
    return TaskModel.fromJson(response.data);
  }

  Future<void> deleteTask(String id) async {
    await _client.delete('/tasks/$id');
  }

  Future<List<TaskCommentModel>> getComments(String taskId) async {
    final response = await _client.get('/tasks/$taskId/comments');
    final List<dynamic> data = response.data is List
        ? response.data
        : (response.data['data'] as List<dynamic>? ??
            response.data['comments'] as List<dynamic>? ??
            []);
    return data
        .map((e) => TaskCommentModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TaskCommentModel> addComment(
      String taskId, String comment) async {
    final response =
        await _client.post('/tasks/$taskId/comments', data: {'comment': comment});
    return TaskCommentModel.fromJson(response.data);
  }
}
