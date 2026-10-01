import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

import 'finance_models.dart';

final financeRepositoryProvider = Provider<FinanceRepository>((ref) {
  return FinanceRepository(ref.read(apiClientProvider));
});

/// API surface for the Sprint-103 finance module.
///
/// Paths are relative to `AppConstants.apiBaseUrl` (`.../api`).
class FinanceRepository {
  final ApiClient _apiClient;

  FinanceRepository(this._apiClient);

  /// Multi-stage purchase approval inbox.
  Future<List<PurchaseApprovalModel>> getPurchaseApprovals({
    int page = 1,
    int limit = 100,
    bool viewAll = true,
    String? status,
  }) async {
    final params = <String, dynamic>{
      'page': page,
      'limit': limit,
      'viewAll': viewAll ? 'true' : 'false',
    };
    if (status != null && status != 'all') params['status'] = status;

    final response = await _apiClient.get('/purchases', queryParameters: params);
    final purchases = _listField(response, 'purchases');
    return purchases
        .map((e) => PurchaseApprovalModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Record an approval/rejection decision (Merkle-chained audit log).
  Future<Map<String, dynamic>> actOnPurchaseApproval({
    required String purchaseRequestId,
    required String action,
    String? comments,
    int? tierLevel,
  }) async {
    final response = await _apiClient.post(
      '/finance/purchases/approvals',
      data: {
        'purchaseRequestId': purchaseRequestId,
        'action': action,
        if (comments != null && comments.isNotEmpty) 'comments': comments,
        if (tierLevel != null) 'tierLevel': tierLevel,
      },
    );
    return response is Map<String, dynamic> ? response : <String, dynamic>{};
  }

  /// Verify the SHA-256 Merkle chain for a purchase request's audit trail.
  Future<({AuditVerification verification, List<ApprovalLogModel> logs})>
      verifyPurchaseAuditTrail(String purchaseRequestId) async {
    final response =
        await _apiClient.get('/finance/purchases/approvals/$purchaseRequestId/verify');
    final map = response is Map<String, dynamic> ? response : const <String, dynamic>{};
    final verification = AuditVerification.fromJson(
        (map['verification'] as Map<String, dynamic>?) ?? const {});
    final logs = (map['logs'] as List<dynamic>? ?? const [])
        .map((e) => ApprovalLogModel.fromJson(e as Map<String, dynamic>))
        .toList();
    return (verification: verification, logs: logs);
  }

  Future<List<ReconciliationSessionModel>> getReconciliations() async {
    final response = await _apiClient.get('/finance/reconciliation');
    return _listField(response, 'reconciliations')
        .map((e) => ReconciliationSessionModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<
      ({
        ReconciliationSessionModel session,
        List<ReconciliationItemModel> items
      })> getReconciliation(String id) async {
    final response = await _apiClient.get('/finance/reconciliation/$id');
    final map = response is Map<String, dynamic> ? response : const <String, dynamic>{};
    final session = ReconciliationSessionModel.fromJson(
        (map['session'] as Map<String, dynamic>?) ?? const {});
    final items = (map['items'] as List<dynamic>? ?? const [])
        .map((e) => ReconciliationItemModel.fromJson(e as Map<String, dynamic>))
        .toList();
    return (session: session, items: items);
  }

  /// Manual match / override for a single reconciliation line item.
  Future<void> matchReconciliationItem({
    required String itemId,
    required String matchStatus,
    String? matchedWithId,
    double varianceAmount = 0,
    String? resolutionNotes,
  }) async {
    await _apiClient.patch(
      '/finance/reconciliation/$itemId/match',
      data: {
        'matchStatus': matchStatus,
        if (matchedWithId != null && matchedWithId.isNotEmpty)
          'matchedWithId': matchedWithId,
        'varianceAmount': varianceAmount,
        if (resolutionNotes != null && resolutionNotes.isNotEmpty)
          'resolutionNotes': resolutionNotes,
      },
    );
  }

  Future<List<PayrollRecordModel>> getPayrollRecords({
    required int year,
    required int month,
  }) async {
    final response = await _apiClient.get(
      '/finance/payroll/records',
      queryParameters: {'year': year, 'month': month},
    );
    return _listField(response, 'records')
        .map((e) => PayrollRecordModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  static List<dynamic> _listField(dynamic response, String key) {
    if (response is List) return response;
    if (response is Map<String, dynamic>) {
      return response[key] as List<dynamic>? ?? const [];
    }
    return const [];
  }
}
