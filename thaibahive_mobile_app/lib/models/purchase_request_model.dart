class PurchaseItem {
  final String name;
  final int quantity;
  final double estimatedCost;

  const PurchaseItem({
    required this.name,
    required this.quantity,
    required this.estimatedCost,
  });

  factory PurchaseItem.fromJson(Map<String, dynamic> json) => PurchaseItem(
        name: json['name'] as String,
        quantity: json['quantity'] as int,
        estimatedCost: (json['estimated_cost'] as num).toDouble(),
      );

  Map<String, dynamic> toJson() => {
        'name': name,
        'quantity': quantity,
        'estimated_cost': estimatedCost,
      };
}

class PurchaseRequestModel {
  final String id;
  final String title;
  final String? description;
  final List<PurchaseItem> items;
  final String status;
  final double totalEstimatedCost;
  final String? rejectionReason;
  final String userId;
  final String? userName;
  final DateTime createdAt;
  final DateTime updatedAt;

  const PurchaseRequestModel({
    required this.id,
    required this.title,
    this.description,
    required this.items,
    required this.status,
    required this.totalEstimatedCost,
    this.rejectionReason,
    required this.userId,
    this.userName,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PurchaseRequestModel.fromJson(Map<String, dynamic> json) =>
      PurchaseRequestModel(
        id: json['id'] as String,
        title: json['title'] as String,
        description: json['description'] as String?,
        items: (json['items'] as List<dynamic>?)
                ?.map(
                    (e) => PurchaseItem.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        status: json['status'] as String,
        totalEstimatedCost: (json['total_estimated_cost'] as num).toDouble(),
        rejectionReason: json['rejection_reason'] as String?,
        userId: json['user_id'] as String,
        userName: json['user_name'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'items': items.map((e) => e.toJson()).toList(),
        'status': status,
        'total_estimated_cost': totalEstimatedCost,
        'rejection_reason': rejectionReason,
        'user_id': userId,
        'user_name': userName,
        'created_at': createdAt.toIso8601String(),
        'updated_at': updatedAt.toIso8601String(),
      };
}
