library leaves_model;

typealias LeavesHTTPResponse = Map<String, dynamic>;

class LeaveRequestModel {
  final String id;
  final String staffId;
  final int amount;
  final String category;
  final String description;
  final String? receiptUrl;
  final String status;
  final String createdAt;
  final String? reviewedAt;
  final String? reviewerId;
  final String? reviewerComment;
  final String? institutionName;
  final String? staffName;

  LeaveRequestModel({
    required this.id,
    required this.staffId,
    required this.amount,
    required this.category,
    required this.description,
    this.receiptUrl,
    required this.status,
    required this.createdAt,
    this.reviewedAt,
    this.reviewerId,
    this.reviewerComment,
    this.institutionName,
    this.staffName,
  });

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    return LeaveRequestModel(
      id: json['id'] as String,
      staffId: json['staffId'] as String,
      amount: json['amount'] as int,
      category: json['category'] as String,
      description: json['description'] as String,
      receiptUrl: json['receiptUrl'] as String?,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      reviewedAt: json['reviewedAt'] as String?,
      reviewerId: json['reviewerId'] as String?,
      reviewerComment: json['reviewerComment'] as String?,
      institutionName: json['institutionName'] as String?,
      staffName: json['staffName'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'staffId': staffId,
      'amount': amount,
      'category': category,
      'description': description,
      'receiptUrl': receiptUrl,
      'status': status,
      'createdAt': createdAt,
      'reviewedAt': reviewedAt,
      'reviewerId': reviewerId,
      'reviewerComment': reviewerComment,
      'institutionName': institutionName,
      'staffName': staffName,
    };
  }

  LeaveRequestModel copyWith({
    String? id,
    String? staffId,
    int? amount,
    String? category,
    String? description,
    String? receiptUrl,
    String? status,
    String? createdAt,
    String? reviewedAt,
    String? reviewerId,
    String? reviewerComment,
    String? institutionName,
    String? staffName,
  }) {
    return LeaveRequestModel(
      id: id ?? this.id,
      staffId: staffId ?? this.staffId,
      amount: amount ?? this.amount,
      category: category ?? this.category,
      description: description ?? this.description,
      receiptUrl: receiptUrl ?? this.receiptUrl,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      reviewedAt: reviewedAt ?? this.reviewedAt,
      reviewerId: reviewerId ?? this.reviewerId,
      reviewerComment: reviewerComment ?? this.reviewerComment,
      institutionName: institutionName ?? this.institutionName,
      staffName: staffName ?? this.staffName,
    );n  }
}