/// Mobile offline sync operations model
/// Represents an operation that needs to be synchronized with the server when offline

class OfflineOperation {
  final String id;
  final String action;
  final String entityType;
  final Map<String, dynamic> payload;
  final String userId;
  final String institutionId;
  final String createdAt;
  final String status;
  final int retryCount;
  final bool isEncrypted;
  final String? errorMessage;
  final String? serverResponseId;

  const OfflineOperation({
    required this.id,
    required this.action,
    required this.entityType,
    required this.payload,
    required this.userId,
    required this.institutionId,
    required this.createdAt,
    required this.status,
    required this.retryCount,
    required this.isEncrypted,
    this.errorMessage,
    this.serverResponseId,
  });

  factory OfflineOperation.fromJson(Map<String, dynamic> json) => OfflineOperation(
        id: json['id'] as String? ?? '',
        action: json['action'] as String? ?? '',
        entityType: json['entityType'] as String? ?? '',
        payload: (json['payload'] as Map<String, dynamic>?) ?? {},
        userId: json['userId'] as String? ?? '',
        institutionId: json['institutionId'] as String? ?? '',
        createdAt: json['createdAt'] as String? ?? DateTime.now().toIso8601String(),
        status: json['status'] as String? ?? 'pending',
        retryCount: (json['retryCount'] as num?)?.toInt() ?? 0,
        isEncrypted: json['isEncrypted'] as bool? ?? false,
        errorMessage: json['errorMessage'] as String?,
        serverResponseId: json['serverResponseId'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'action': action,
        'entityType': entityType,
        'payload': payload,
        'userId': userId,
        'institutionId': institutionId,
        'createdAt': createdAt,
        'status': status,
        'retryCount': retryCount,
        'isEncrypted': isEncrypted,
        'errorMessage': errorMessage,
        'serverResponseId': serverResponseId,
      };

  OfflineOperation copyWith({
    String? id,
    String? action,
    String? entityType,
    Map<String, dynamic>? payload,
    String? userId,
    String? institutionId,
    String? createdAt,
    String? status,
    int? retryCount,
    bool? isEncrypted,
    String? errorMessage,
    String? serverResponseId,
  }) =>
      OfflineOperation(
        id: id ?? this.id,
        action: action ?? this.action,
        entityType: entityType ?? this.entityType,
        payload: payload ?? this.payload,
        userId: userId ?? this.userId,
        institutionId: institutionId ?? this.institutionId,
        createdAt: createdAt ?? this.createdAt,
        status: status ?? this.status,
        retryCount: retryCount ?? this.retryCount,
        isEncrypted: isEncrypted ?? this.isEncrypted,
        errorMessage: errorMessage ?? this.errorMessage,
        serverResponseId: serverResponseId ?? this.serverResponseId,
      );
}
