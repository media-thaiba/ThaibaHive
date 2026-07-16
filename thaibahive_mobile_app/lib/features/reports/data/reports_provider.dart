import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../models/daily_report_model.dart';
import 'reports_repository.dart';

final reportsListProvider =
    AsyncNotifierProvider<ReportsListNotifier, List<DailyReportModel>>(
  ReportsListNotifier.new,
);

class ReportsListNotifier extends AsyncNotifier<List<DailyReportModel>> {
  @override
  Future<List<DailyReportModel>> build() async {
    final repo = ref.watch(reportsRepositoryProvider);
    return repo.getReports();
  }

  Future<void> refresh() async {
    final repo = ref.watch(reportsRepositoryProvider);
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => repo.getReports());
  }

  Future<void> createReport(Map<String, dynamic> data) async {
    final repo = ref.watch(reportsRepositoryProvider);
    await repo.createReport(data);
    await refresh();
  }

  Future<void> updateReport(String id, Map<String, dynamic> data) async {
    final repo = ref.watch(reportsRepositoryProvider);
    await repo.updateReport(id, data);
    await refresh();
  }

  Future<void> deleteReport(String id) async {
    final repo = ref.watch(reportsRepositoryProvider);
    await repo.deleteReport(id);
    await refresh();
  }
}
