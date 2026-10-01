import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/network/api_client.dart';
import 'package:thaibahive_mobile/core/services/offline_queue.dart';
import 'package:thaibahive_mobile/features/finance/data/finance_models.dart';
import 'package:thaibahive_mobile/features/finance/data/finance_provider.dart';
import 'package:thaibahive_mobile/features/finance/data/finance_repository.dart';
import 'package:thaibahive_mobile/features/finance/presentation/finance_status.dart';
import 'package:thaibahive_mobile/shared/widgets/status_badge.dart';

/// Repository stub whose mutations always fail (simulated offline device).
class _OfflineFinanceRepository extends FinanceRepository {
  _OfflineFinanceRepository() : super(ApiClient(baseUrl: 'http://127.0.0.1:1'));

  @override
  Future<List<PurchaseApprovalModel>> getPurchaseApprovals({
    int page = 1,
    int limit = 100,
    bool viewAll = true,
    String? status,
  }) async {
    return [
      const PurchaseApprovalModel(
        id: 'req-1',
        requesterId: 'staff-1',
        itemName: 'Lab chemicals',
        quantity: 4,
        estimatedCost: 12500,
        status: 'pending_tier_1',
      ),
    ];
  }

  @override
  Future<Map<String, dynamic>> actOnPurchaseApproval({
    required String purchaseRequestId,
    required String action,
    String? comments,
    int? tierLevel,
  }) async {
    throw Exception('network down');
  }

  @override
  Future<void> matchReconciliationItem({
    required String itemId,
    required String matchStatus,
    String? matchedWithId,
    double varianceAmount = 0,
    String? resolutionNotes,
  }) async {
    throw Exception('network down');
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(
      const MethodChannel('plugins.flutter.io/path_provider'),
      (MethodCall methodCall) async => '.',
    );
  });

  group('Sprint-103 finance models', () {
    test('PurchaseApprovalModel parses camelCase API rows', () {
      final model = PurchaseApprovalModel.fromJson({
        'id': 'req-9',
        'requesterId': 'staff-9',
        'itemName': 'Projector lamp',
        'quantity': 2,
        'estimatedCost': 8999.5,
        'justification': 'Auditorium',
        'status': 'pending_tier_2',
        'createdAt': '2026-10-01T10:00:00.000Z',
        'updatedAt': '2026-10-01T11:00:00.000Z',
      });

      expect(model.itemName, 'Projector lamp');
      expect(model.estimatedCost, 8999.5);
      expect(model.isPending, isTrue);
      expect(model.isTerminal, isFalse);
      expect(model.createdAt, isNotNull);
    });

    test('PurchaseApprovalModel tolerates missing optional fields', () {
      final model =
          PurchaseApprovalModel.fromJson({'id': 'req-1', 'status': 'approved'});

      expect(model.itemName, 'Purchase request');
      expect(model.quantity, 1);
      expect(model.estimatedCost, 0);
      expect(model.isTerminal, isTrue);
    });

    test('ReconciliationSessionModel flags material variance', () {
      final clean = ReconciliationSessionModel.fromJson({
        'id': 'recon-1',
        'periodStart': '2026-10-01',
        'periodEnd': '2026-10-31',
        'totalFeeLedgerAmount': 1000,
        'totalExpenseLedgerAmount': 400,
        'totalBankStatementAmount': 600,
        'unreconciledVariance': 0,
        'status': 'reconciled',
        'matchedItemCount': 5,
        'unmatchedItemCount': 0,
      });
      final flagged = ReconciliationSessionModel.fromJson({
        'id': 'recon-2',
        'periodStart': '2026-10-01',
        'periodEnd': '2026-10-31',
        'unreconciledVariance': -150.75,
        'status': 'flagged_variance',
        'matchedItemCount': 2,
        'unmatchedItemCount': 3,
      });

      expect(clean.hasVariance, isFalse);
      expect(flagged.hasVariance, isTrue);
      expect(flagged.unreconciledVariance, -150.75);
    });

    test('ReconciliationItemModel parses match state', () {
      final item = ReconciliationItemModel.fromJson({
        'id': 'item-1',
        'sourceType': 'bank_statement',
        'sourceReferenceId': 'NEFT-001',
        'transactionDate': '2026-10-05',
        'amount': -250,
        'matchStatus': 'matched',
        'matchedWithId': 'NEFT-001',
        'varianceAmount': 0,
      });

      expect(item.sourceType, 'bank_statement');
      expect(item.amount, -250);
      expect(item.matchStatus, 'matched');
      expect(item.matchedWithId, 'NEFT-001');
    });

    test('AuditVerification and ApprovalLogModel parse chain payloads', () {
      final verification =
          AuditVerification.fromJson({'isValid': true, 'totalLogs': 3});
      final log = ApprovalLogModel.fromJson({
        'id': 'log-1',
        'tierLevel': 1,
        'approverId': 'staff-2',
        'action': 'approved',
        'merkleAuditHash': 'a' * 64,
        'prevAuditHash': 'b' * 64,
        'actionTimestamp': '2026-10-01T09:00:00.000Z',
      });

      expect(verification.isValid, isTrue);
      expect(verification.totalLogs, 3);
      expect(verification.tamperedAt, isNull);
      expect(log.tierLevel, 1);
      expect(log.merkleAuditHash.length, 64);
      expect(log.actionTimestamp, isNotNull);
    });
  });

  group('Sprint-103 finance status helpers', () {
    test('maps approval statuses to badges and labels', () {
      expect(badgeForStatus('pending_tier_1'), StatusBadgeVariant.warning);
      expect(badgeForStatus('approved'), StatusBadgeVariant.success);
      expect(badgeForStatus('rejected'), StatusBadgeVariant.destructive);
      expect(labelForStatus('pending_tier_3'), 'TIER 3');
      expect(labelForStatus('flagged_variance'), 'VARIANCE');
      expect(labelForStatus('manual_override'), 'MANUAL OVERRIDE');
    });
  });

  group('Sprint-103 offline mutation fallback', () {
    test('purchase approval decision is queued when the device is offline',
        () async {
      final container = ProviderContainer(overrides: [
        financeRepositoryProvider.overrideWithValue(_OfflineFinanceRepository()),
      ]);
      addTearDown(container.dispose);

      final notifier = container.read(financeApprovalsProvider.notifier);
      await notifier.load();

      expect(container.read(financeApprovalsProvider).approvals, hasLength(1));

      await notifier.act(id: 'req-1', action: 'approve', comments: 'urgent');

      final queued = offlineQueue
          .getPendingEvents()
          .where((e) =>
              e.type == 'finance_purchase_action' &&
              e.payload['purchaseRequestId'] == 'req-1')
          .toList();

      expect(queued, hasLength(1));
      expect(queued.first.payload['action'], 'approve');
      expect(container.read(financeApprovalsProvider).notice, contains('Offline'));
      expect(
        container.read(financeApprovalsProvider).approvals.first.status,
        'approved',
      );
    });

    test('reconciliation match is queued when the device is offline',
        () async {
      final container = ProviderContainer(overrides: [
        financeRepositoryProvider.overrideWithValue(_OfflineFinanceRepository()),
      ]);
      addTearDown(container.dispose);

      final notifier = container.read(financeReconciliationProvider.notifier);

      await notifier.matchItem(
        item: const ReconciliationItemModel(
          id: 'item-7',
          sourceType: 'fee_transaction',
          sourceReferenceId: 'TX-7',
          transactionDate: '2026-10-02',
          amount: 500,
          matchStatus: 'unmatched',
          varianceAmount: 0,
        ),
        matchStatus: 'manual_override',
        matchedWithId: 'NEFT-77',
        resolutionNotes: 'Phone confirmation',
      );

      final queued = offlineQueue
          .getPendingEvents()
          .where((e) =>
              e.type == 'finance_reconciliation_match' &&
              e.payload['itemId'] == 'item-7')
          .toList();

      expect(queued, hasLength(1));
      expect(queued.first.payload['matchStatus'], 'manual_override');
      expect(queued.first.payload['matchedWithId'], 'NEFT-77');
      expect(
        container.read(financeReconciliationProvider).notice,
        contains('Offline'),
      );
    });
  });
}
