import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/availability_model.dart';

final availabilityRepositoryProvider = Provider<AvailabilityRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return AvailabilityRepository(apiClient);
});

class AvailabilityRepository {
  final ApiClient _apiClient;

  AvailabilityRepository(this._apiClient);

  Future<List<StaffAvailabilityModel>> getAvailability() async {
    final response = await _apiClient.get('/availability');
    final data = response;
    if (data is List) {
      return data
          .map((e) =>
              StaffAvailabilityModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) =>
              StaffAvailabilityModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<StaffAvailabilityModel> updateAvailability(
      Map<String, dynamic> data) async {
    final response = await _apiClient.put('/availability', data: data);
    return StaffAvailabilityModel.fromJson(
        response as Map<String, dynamic>);
  }
}
