/// Authentication models for mobile app
/// Contains token storage, nonce exchange, and authentication response models

import 'dart:convert';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'auth_models.g.dart';

@freezed
class AuthToken with _$AuthToken {
  const factory AuthToken({
    required String accessToken,
    required String refreshToken,
    required String tokenType,
    required int expiresIn,
    required String scope,
    required String idToken,
    required String deviceId,
    required DateTime issuedAt,
    required DateTime expiresAt,
    required bool isRevoked,
  }) = _AuthToken;

  factory AuthToken.fromJson(Map<String, dynamic> json) => _$AuthTokenFromJson(json);
}

@freezed
class AuthNonceRequest with _$AuthNonceRequest {
  const factory AuthNonceRequest({
    required String targetUrl,
    required String deviceId,
  }) = _AuthNonceRequest;

  factory AuthNonceRequest.fromJson(Map<String, dynamic> json) => _$AuthNonceRequestFromJson(json);
}

@freezed
class AuthNonceResponse with _$AuthNonceResponse {
  const factory AuthNonceResponse({
    required bool success,
    required String nonce,
    required String expiresAt,
    required String redirectUrl,
    required String deviceId,
    required DateTime issuedAt,
  }) = _AuthNonceResponse;

  factory AuthNonceResponse.fromJson(Map<String, dynamic> json) => _$AuthNonceResponseFromJson(json);
}

@freezed
class AuthExchangeRequest with _$AuthExchangeRequest {
  const factory AuthExchangeRequest({
    required String nonce,
    required String deviceId,
    required String userId,
    required String institutionId,
  }) = _AuthExchangeRequest;

  factory AuthExchangeRequest.fromJson(Map<String, dynamic> json) => _$AuthExchangeRequestFromJson(json);
}

@freezed
class AuthExchangeResponse with _$AuthExchangeResponse {
  const factory AuthExchangeResponse({
    required bool success,
    required String sessionToken,
    required String refreshToken,
    required String expiresAt,
    required String userId,
    required String institutionId,
    required Map<String, dynamic> userInfo,
    required List<String> permissions,
    required DateTime issuedAt,
  }) = _AuthExchangeResponse;

  factory AuthExchangeResponse.fromJson(Map<String, dynamic> json) => _$AuthExchangeResponseFromJson(json);
}
