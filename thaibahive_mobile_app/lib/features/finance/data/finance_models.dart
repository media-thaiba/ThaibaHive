/// Finance domain models (Sprint-103) mapped from the web API payloads.
///
/// All API rows are Drizzle camelCase objects; timestamps are ISO-8601 text.

DateTime? _parseDate(dynamic value) {
  if (value is! String || value.isEmpty) return null;
  return DateTime.tryParse(value);
}

double _toDouble(dynamic value) => value == null ? 0 : (value as num).toDouble();

int _toInt(dynamic value) => value == null ? 0 : (value as num).toInt();

class PurchaseApprovalModel {
  final String id;
  final String requesterId;
  final String itemName;
  final int quantity;
  final double estimatedCost;
  final String? justification;
  final String status;
  final String? notes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const PurchaseApprovalModel({
    required this.id,
    required this.requesterId,
    required this.itemName,
    required this.quantity,
    required this.estimatedCost,
    this.justification,
    required this.status,
    this.notes,
    this.createdAt,
    this.updatedAt,
  });

  factory PurchaseApprovalModel.fromJson(Map<String, dynamic> json) =>
      PurchaseApprovalModel(
        id: json['id'] as String? ?? '',
        requesterId: json['requesterId'] as String? ?? '',
        itemName: json['itemName'] as String? ?? 'Purchase request',
        quantity: _toInt(json['quantity']).clamp(1, 1 << 31),
        estimatedCost: _toDouble(json['estimatedCost']),
        justification: json['justification'] as String?,
        status: json['status'] as String? ?? 'draft',
        notes: json['notes'] as String?,
        createdAt: _parseDate(json['createdAt']),
        updatedAt: _parseDate(json['updatedAt']),
      );

  bool get isTerminal => status == 'approved' || status == 'rejected';
  bool get isPending => status.startsWith('pending');
}

class ApprovalLogModel {
  final String id;
  final int tierLevel;
  final String approverId;
  final String action;
  final String? comments;
  final String merkleAuditHash;
  final String? prevAuditHash;
  final DateTime? actionTimestamp;

  const ApprovalLogModel({
    required this.id,
    required this.tierLevel,
    required this.approverId,
    required this.action,
    this.comments,
    required this.merkleAuditHash,
    this.prevAuditHash,
    this.actionTimestamp,
  });

  factory ApprovalLogModel.fromJson(Map<String, dynamic> json) => ApprovalLogModel(
        id: json['id'] as String? ?? '',
        tierLevel: _toInt(json['tierLevel']),
        approverId: json['approverId'] as String? ?? '',
        action: json['action'] as String? ?? '',
        comments: json['comments'] as String?,
        merkleAuditHash: json['merkleAuditHash'] as String? ?? '',
        prevAuditHash: json['prevAuditHash'] as String?,
        actionTimestamp: _parseDate(json['actionTimestamp']),
      );
}

class AuditVerification {
  final bool isValid;
  final String? tamperedAt;
  final int totalLogs;

  const AuditVerification({
    required this.isValid,
    this.tamperedAt,
    required this.totalLogs,
  });

  factory AuditVerification.fromJson(Map<String, dynamic> json) => AuditVerification(
        isValid: json['isValid'] as bool? ?? false,
        tamperedAt: json['tamperedAt'] as String?,
        totalLogs: _toInt(json['totalLogs']),
      );
}

class ReconciliationSessionModel {
  final String id;
  final String periodStart;
  final String periodEnd;
  final double totalFeeLedgerAmount;
  final double totalExpenseLedgerAmount;
  final double totalBankStatementAmount;
  final double unreconciledVariance;
  final int matchedItemCount;
  final int unmatchedItemCount;
  final String status;
  final String? auditHash;
  final String? notes;
  final DateTime? createdAt;

  const ReconciliationSessionModel({
    required this.id,
    required this.periodStart,
    required this.periodEnd,
    required this.totalFeeLedgerAmount,
    required this.totalExpenseLedgerAmount,
    required this.totalBankStatementAmount,
    required this.unreconciledVariance,
    required this.matchedItemCount,
    required this.unmatchedItemCount,
    required this.status,
    this.auditHash,
    this.notes,
    this.createdAt,
  });

  factory ReconciliationSessionModel.fromJson(Map<String, dynamic> json) =>
      ReconciliationSessionModel(
        id: json['id'] as String? ?? '',
        periodStart: json['periodStart'] as String? ?? '',
        periodEnd: json['periodEnd'] as String? ?? '',
        totalFeeLedgerAmount: _toDouble(json['totalFeeLedgerAmount']),
        totalExpenseLedgerAmount: _toDouble(json['totalExpenseLedgerAmount']),
        totalBankStatementAmount: _toDouble(json['totalBankStatementAmount']),
        unreconciledVariance: _toDouble(json['unreconciledVariance']),
        matchedItemCount: _toInt(json['matchedItemCount']),
        unmatchedItemCount: _toInt(json['unmatchedItemCount']),
        status: json['status'] as String? ?? 'draft',
        auditHash: json['auditHash'] as String?,
        notes: json['notes'] as String?,
        createdAt: _parseDate(json['createdAt']),
      );

  bool get hasVariance => unreconciledVariance.abs() >= 0.01;
}

class ReconciliationItemModel {
  final String id;
  final String sourceType;
  final String sourceReferenceId;
  final String transactionDate;
  final double amount;
  final String matchStatus;
  final String? matchedWithId;
  final double varianceAmount;
  final String? resolutionNotes;

  const ReconciliationItemModel({
    required this.id,
    required this.sourceType,
    required this.sourceReferenceId,
    required this.transactionDate,
    required this.amount,
    required this.matchStatus,
    this.matchedWithId,
    required this.varianceAmount,
    this.resolutionNotes,
  });

  factory ReconciliationItemModel.fromJson(Map<String, dynamic> json) =>
      ReconciliationItemModel(
        id: json['id'] as String? ?? '',
        sourceType: json['sourceType'] as String? ?? '',
        sourceReferenceId: json['sourceReferenceId'] as String? ?? '',
        transactionDate: json['transactionDate'] as String? ?? '',
        amount: _toDouble(json['amount']),
        matchStatus: json['matchStatus'] as String? ?? 'unmatched',
        matchedWithId: json['matchedWithId'] as String?,
        varianceAmount: _toDouble(json['varianceAmount']),
        resolutionNotes: json['resolutionNotes'] as String?,
      );
}

class PayrollRecordModel {
  final String id;
  final String staffId;
  final int payPeriodMonth;
  final int payPeriodYear;
  final double grossEarnings;
  final double totalDeductions;
  final double taxDeduction;
  final double netPayable;
  final String status;
  final String? paymentReference;

  const PayrollRecordModel({
    required this.id,
    required this.staffId,
    required this.payPeriodMonth,
    required this.payPeriodYear,
    required this.grossEarnings,
    required this.totalDeductions,
    required this.taxDeduction,
    required this.netPayable,
    required this.status,
    this.paymentReference,
  });

  factory PayrollRecordModel.fromJson(Map<String, dynamic> json) => PayrollRecordModel(
        id: json['id'] as String? ?? '',
        staffId: json['staffId'] as String? ?? '',
        payPeriodMonth: _toInt(json['payPeriodMonth']),
        payPeriodYear: _toInt(json['payPeriodYear']),
        grossEarnings: _toDouble(json['grossEarnings']),
        totalDeductions: _toDouble(json['totalDeductions']),
        taxDeduction: _toDouble(json['taxDeduction']),
        netPayable: _toDouble(json['netPayable']),
        status: json['status'] as String? ?? 'draft',
        paymentReference: json['paymentReference'] as String?,
      );
}
