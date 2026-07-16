import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/models/dashboard_model.dart';

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(dioProvider));
});

class DashboardRepository {
  final Dio _client;
  DashboardRepository(this._client);

  Future<DashboardStatsModel> getStats() async {
    final response = await _client.get('/dashboard/stats');
    return DashboardStatsModel.fromJson(response.data);
  }
}
