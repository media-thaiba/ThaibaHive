class FinancialTransactionModel {
  final String id;
  final String type;
  final String category;
  final double amount;
  final String? description;
  final DateTime transactionDate;
  final String? referenceNumber;
  final String userId;
  final String? userName;
  final DateTime createdAt;

  const FinancialTransactionModel({
    required this.id,
    required this.type,
    required this.category,
    required this.amount,
    this.description,
    required this.transactionDate,
    this.referenceNumber,
    required this.userId,
    this.userName,
    required this.createdAt,
  });

  factory FinancialTransactionModel.fromJson(Map<String, dynamic> json) =>
      FinancialTransactionModel(
        id: json['id'] as String,
        type: json['type'] as String,
        category: json['category'] as String,
        amount: (json['amount'] as num).toDouble(),
        description: json['description'] as String?,
        transactionDate: DateTime.parse(json['transaction_date'] as String),
        referenceNumber: json['reference_number'] as String?,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type,
        'category': category,
        'amount': amount,
        'description': description,
        'transaction_date': transactionDate.toIso8601String(),
        'reference_number': referenceNumber,
        'user_id': userId,
        'user_name': userName,
        'created_at': createdAt.toIso8601String(),
      };
}
