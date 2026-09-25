// Fee Models for Flutter Mobile Fee Hub (FEE-020)

class MobileFeeInstallment {
  final String id;
  final int installmentNumber;
  final String title;
  final String dueDate;
  final int gracePeriodDays;
  final double amount;
  final double paidAmount;
  final double balanceAmount;
  final String status; // 'pending' | 'partially_paid' | 'paid' | 'overdue'

  const MobileFeeInstallment({
    required this.id,
    required this.installmentNumber,
    required this.title,
    required this.dueDate,
    required this.gracePeriodDays,
    required this.amount,
    required this.paidAmount,
    required this.balanceAmount,
    required this.status,
  });

  factory MobileFeeInstallment.fromJson(Map<String, dynamic> json) {
    return MobileFeeInstallment(
      id: json['id'] ?? '',
      installmentNumber: (json['installmentNumber'] as num?)?.toInt() ?? 1,
      title: json['title'] ?? 'Installment',
      dueDate: json['dueDate'] ?? '',
      gracePeriodDays: (json['gracePeriodDays'] as num?)?.toInt() ?? 7,
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0.0,
      balanceAmount: (json['balanceAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'pending',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'installmentNumber': installmentNumber,
      'title': title,
      'dueDate': dueDate,
      'gracePeriodDays': gracePeriodDays,
      'amount': amount,
      'paidAmount': paidAmount,
      'balanceAmount': balanceAmount,
      'status': status,
    };
  }
}

class MobileFeeAllocation {
  final String id;
  final String studentId;
  final String academicYear;
  final double baseAmount;
  final double concessionAmount;
  final double netPayableAmount;
  final double paidAmount;
  final double balanceAmount;
  final String status;
  final List<MobileFeeInstallment> installments;

  const MobileFeeAllocation({
    required this.id,
    required this.studentId,
    required this.academicYear,
    required this.baseAmount,
    required this.concessionAmount,
    required this.netPayableAmount,
    required this.paidAmount,
    required this.balanceAmount,
    required this.status,
    required this.installments,
  });

  factory MobileFeeAllocation.fromJson(Map<String, dynamic> json) {
    var list = json['installments'] as List<dynamic>? ?? [];
    List<MobileFeeInstallment> insts = list
        .map((i) => MobileFeeInstallment.fromJson(i as Map<String, dynamic>))
        .toList();

    return MobileFeeAllocation(
      id: json['id'] ?? '',
      studentId: json['studentId'] ?? '',
      academicYear: json['academicYear'] ?? '2026-2027',
      baseAmount: (json['baseAmount'] as num?)?.toDouble() ?? 0.0,
      concessionAmount: (json['concessionAmount'] as num?)?.toDouble() ?? 0.0,
      netPayableAmount: (json['netPayableAmount'] as num?)?.toDouble() ?? 0.0,
      paidAmount: (json['paidAmount'] as num?)?.toDouble() ?? 0.0,
      balanceAmount: (json['balanceAmount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'unpaid',
      installments: insts,
    );
  }
}

class MobileFeeReceipt {
  final String receiptNumber;
  final String paymentId;
  final String studentId;
  final double amount;
  final String paymentMethod;
  final String receiptHash;
  final String issuedAt;

  const MobileFeeReceipt({
    required this.receiptNumber,
    required this.paymentId,
    required this.studentId,
    required this.amount,
    required this.paymentMethod,
    required this.receiptHash,
    required this.issuedAt,
  });

  factory MobileFeeReceipt.fromJson(Map<String, dynamic> json) {
    return MobileFeeReceipt(
      receiptNumber: json['receiptNumber'] ?? '',
      paymentId: json['paymentId'] ?? '',
      studentId: json['studentId'] ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod'] ?? 'upi',
      receiptHash: json['receiptHash'] ?? '',
      issuedAt: json['issuedAt'] ?? '',
    );
  }
}
