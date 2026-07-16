class ExpenseClaimModel {
  final String id;
  final String title;
  final String category;
  final double amount;
  final String? description;
  final String status;
  final String? receiptUrl;
  final String userId;
  final String? userName;
  final DateTime createdAt;
  final DateTime updatedAt;

  const ExpenseClaimModel({
    required this.id,
    required this.title,
    required this.category,
    required this.amount,
    this.description,
    required this.status,
    this.receiptUrl,
    required this.userId,
    this.userName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ExpenseClaimModel.fromJson(Map<String, dynamic> json) =>
      ExpenseClaimModel(
        id: json['id'] as String,
        title: json['title'] as String,
        category: json['category'] as String,
        amount: (json['amount'] as num).toDouble(),
        description: json['description'] as String?,
        status: json['status'] as String,
        receiptUrl: json['receipt_url'] as String?,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'category': category,
        'amount': amount,
        'description': description,
        'status': status,
        'receipt_url': receiptUrl,
        'user_id': userId,
        'user_name': userName,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}
