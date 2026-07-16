import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/vehicle_model.dart';

final vehiclesRepositoryProvider = Provider<VehiclesRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return VehiclesRepository(apiClient);
});

class VehiclesRepository {
  final ApiClient _apiClient;

  VehiclesRepository(this._apiClient);

  Future<List<VehicleModel>> getVehicles() async {
    final response = await _apiClient.get('/vehicles');
    final data = response;
    if (data is List) {
      return data
          .map((e) => VehicleModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => VehicleModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<VehicleBookingModel>> getBookings({int page = 1}) async {
    final response = await _apiClient.get('/vehicles/bookings',
        queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => VehicleBookingModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => VehicleBookingModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<VehicleBookingModel> createBooking(Map<String, dynamic> data) async {
    final response =
        await _apiClient.post('/vehicles/bookings', data: data);
    return VehicleBookingModel.fromJson(
        response as Map<String, dynamic>);
  }

  Future<VehicleBookingModel> updateBooking(
      String id, Map<String, dynamic> data) async {
    final response =
        await _apiClient.put('/vehicles/bookings/$id', data: data);
    return VehicleBookingModel.fromJson(
        response as Map<String, dynamic>);
  }

  Future<List<VehicleLogModel>> getLogs({int page = 1}) async {
    final response = await _apiClient.get('/vehicles/logs',
        queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => VehicleLogModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => VehicleLogModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<VehicleLogModel> createLog(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/vehicles/logs', data: data);
    return VehicleLogModel.fromJson(response as Map<String, dynamic>);
  }
}
