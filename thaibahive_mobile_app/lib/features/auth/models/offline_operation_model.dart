/// Mobile offline sync operations model
/// Represents an operation that needs to be synchronized with the server when offline

import 'package:freezed_annotation/freezed_annotation.dart';

part 'offline_operation_model.g.dart';

@freezed
class OfflineOperation with _$OfflineOperation {
  const factory OfflineOperation({
    required String id,
    required String action,
    required String entityType,
    required Map<String, dynamic> payload,
    required String userId,
    required String institutionId,
    required String createdAt,
    required String status,
    required int retryCount,
    required bool isEncrypted,
    required String? errorMessage,
    required String? serverResponseId,
  }) = _OfflineOperation;

  factory OfflineOperation.fromJson(Map<String, dynamic> json) => _$OfflineOperationFromJson(json);
  
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
  }) => OfflineOperation(
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
