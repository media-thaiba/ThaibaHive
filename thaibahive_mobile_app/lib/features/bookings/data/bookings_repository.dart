import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/booking_model.dart';
import 'package:thaibahive_mobile/models/booking_resource_model.dart';

final bookingsRepositoryProvider = Provider<BookingsRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return BookingsRepository(apiClient);
});

class BookingsRepository {
  final ApiClient _apiClient;

  BookingsRepository(this._apiClient);

  Future<List<BookingResourceModel>> getResources() async {
    final response = await _apiClient.get('/bookings/resources');
    final data = response;
    if (data is List) {
      return data
          .map((e) => BookingResourceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => BookingResourceModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<BookingModel>> getBookings({int page = 1}) async {
    final response = await _apiClient.get('/bookings', queryParameters: {'page': page});
    final data = response;
    if (data is List) {
      return data
          .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    if (data is Map && data['data'] is List) {
      return (data['data'] as List)
          .map((e) => BookingModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<BookingModel> createBooking(Map<String, dynamic> data) async {
    final response = await _apiClient.post('/bookings', data: data);
    return BookingModel.fromJson(response as Map<String, dynamic>);
  }

  Future<BookingModel> updateBooking(String id, Map<String, dynamic> data) async {
    final response = await _apiClient.put('/bookings/$id', data: data);
    return BookingModel.fromJson(response as Map<String, dynamic>);
  }
}
