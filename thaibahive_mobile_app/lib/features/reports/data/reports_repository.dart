import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/daily_report_model.dart';

final reportsRepositoryProvider = Provider<ReportsRepository>((ref) {
  return ReportsRepository(ref.watch(apiClientProvider));
});

class ReportsRepository {
  final ApiClient _api;

  ReportsRepository(this._api);

  Future<List<DailyReportModel>> getReports({int page = 1}) async {
    final data = await _api.get(
      '/reports',
      queryParameters: {'page': page},
      fromJson: (json) {
        final list = (json is Map ? (json['reports'] ?? json['data'] ?? json) : json)
            as List<dynamic>? ?? [];
        return list
            .map((e) =>
                DailyReportModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<DailyReportModel> createReport(Map<String, dynamic> data) async {
    return _api.post(
      '/reports',
      data: data,
      fromJson: (json) =>
          DailyReportModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<DailyReportModel> getReportById(String id) async {
    return _api.get(
      '/reports/$id',
      fromJson: (json) =>
          DailyReportModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<DailyReportModel> updateReport(
    String id,
    Map<String, dynamic> data,
  ) async {
    return _api.put(
      '/reports/$id',
      data: data,
      fromJson: (json) =>
          DailyReportModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> deleteReport(String id) async {
    await _api.delete('/reports/$id');
  }
}
