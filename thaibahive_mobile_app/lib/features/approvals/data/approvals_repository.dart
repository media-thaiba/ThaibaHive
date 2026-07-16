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
        // API returns { approvals: [...] }
        final list = (json is Map ? (json['approvals'] ?? json['data']) : json)
            as List<dynamic>? ?? [];
        return list
            .map((e) =>
                ApprovalItemModel.fromJson(e as Map<String, dynamic>))
            .toList();
      },
    );
    return data;
  }

  /// API: PATCH /approvals with body { type, id, action: "approve"|"reject", notes? }
  Future<void> updateApproval(
    String type,
    String id, {
    required String action, // "approve" or "reject"
    String? notes,
  }) async {
    await _api.patch(
      '/approvals',
      data: {
        'type': type,
        'id': id,
        'action': action,
        if (notes != null) 'notes': notes,
      },
    );
  }
}
