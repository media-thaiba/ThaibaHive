import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/meal_model.dart';

final canteenRepositoryProvider = Provider<CanteenRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return CanteenRepository(apiClient);
});

class CanteenRepository {
  final ApiClient _apiClient;

  CanteenRepository(this._apiClient);

  Future<List<MealNotificationModel>> getMeals({String? date}) async {
    final params = <String, dynamic>{};
    if (date != null) params['date'] = date;
    final response =
        await _apiClient.get('/canteen/meals', queryParameters: params);
    final data = response;
    if (data is List) {
      return data
          .map((e) => MealNotificationModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => MealNotificationModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<MealNotificationModel> createMeal(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/canteen/meals', data: data);
    return MealNotificationModel.fromJson(
        response as Map<String, dynamic>);
  }

  Future<MealNotificationModel> updateMeal(
      String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/canteen/meals/$id', data: data);
    return MealNotificationModel.fromJson(
        response as Map<String, dynamic>);
  }
}
