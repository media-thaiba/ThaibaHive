import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/approval_item_model.dart';

final approvalsRepositoryProvider = Provider<ApprovalsRepository>((ref) {
  return ApprovalsRepository(ref.watch(apiClientProvider));
});

class ApprovalsRepository {
  final ApiClient _api;

  ApprovalsRepository(this._api);

  Future<List<ApprovalItemModel>> getApprovals({int page = 1}) async {
    final data = await _api.get(
      '/approvals',
      queryParameters: {'page': page},
      fromJson: (json) {
        final list = json['data'] as List<dynamic>;
        return list
            .map((e) =>
                ApprovalItemModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  Future<void> updateApproval(
    String type,
    String id, {
    required String status,
    String? notes,
  }) async {
    await _api.put(
      '/approvals/$type/$id',
      data: {'status': status, 'notes': notes},
    );
  }
}
