/// Authentication models for mobile app
/// Contains token storage, nonce exchange, and authentication response models

class AuthToken {
  final String accessToken;
  final String refreshToken;
  final String tokenType;
  final int expiresIn;
  final String scope;
  final String idToken;
  final String deviceId;
  final DateTime issuedAt;
  final DateTime expiresAt;
  final bool isRevoked;

  const AuthToken({
    required this.accessToken,
    required this.refreshToken,
    required this.tokenType,
    required this.expiresIn,
    required this.scope,
    required this.idToken,
    required this.deviceId,
    required this.issuedAt,
    required this.expiresAt,
    required this.isRevoked,
  });

  factory AuthToken.fromJson(Map<String, dynamic> json) => AuthToken(
        accessToken: json['accessToken'] as String? ?? '',
        refreshToken: json['refreshToken'] as String? ?? '',
        tokenType: json['tokenType'] as String? ?? 'Bearer',
        expiresIn: (json['expiresIn'] as num?)?.toInt() ?? 0,
        scope: json['scope'] as String? ?? '',
        idToken: json['idToken'] as String? ?? '',
        deviceId: json['deviceId'] as String? ?? '',
        issuedAt: json['issuedAt'] != null
            ? DateTime.tryParse(json['issuedAt'] as String) ?? DateTime.now()
            : DateTime.now(),
        expiresAt: json['expiresAt'] != null
            ? DateTime.tryParse(json['expiresAt'] as String) ?? DateTime.now()
            : DateTime.now(),
        isRevoked: json['isRevoked'] as bool? ?? false,
      );

  Map<String, dynamic> toJson() => {
        'accessToken': accessToken,
        'refreshToken': refreshToken,
        'tokenType': tokenType,
        'expiresIn': expiresIn,
        'scope': scope,
        'idToken': idToken,
        'deviceId': deviceId,
        'issuedAt': issuedAt.toIso8601String(),
        'expiresAt': expiresAt.toIso8601String(),
        'isRevoked': isRevoked,
      };
}

class AuthNonceRequest {
  final String targetUrl;
  final String deviceId;

  const AuthNonceRequest({
    required this.targetUrl,
    required this.deviceId,
  });

  factory AuthNonceRequest.fromJson(Map<String, dynamic> json) => AuthNonceRequest(
        targetUrl: json['targetUrl'] as String? ?? '',
        deviceId: json['deviceId'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'targetUrl': targetUrl,
        'deviceId': deviceId,
      };
}

class AuthNonceResponse {
  final bool success;
  final String nonce;
  final String expiresAt;
  final String redirectUrl;
  final String deviceId;
  final DateTime issuedAt;

  const AuthNonceResponse({
    required this.success,
    required this.nonce,
    required this.expiresAt,
    required this.redirectUrl,
    required this.deviceId,
    required this.issuedAt,
  });

  factory AuthNonceResponse.fromJson(Map<String, dynamic> json) => AuthNonceResponse(
        success: json['success'] as bool? ?? false,
        nonce: json['nonce'] as String? ?? '',
        expiresAt: json['expiresAt'] as String? ?? '',
        redirectUrl: json['redirectUrl'] as String? ?? '',
        deviceId: json['deviceId'] as String? ?? '',
        issuedAt: json['issuedAt'] != null
            ? DateTime.tryParse(json['issuedAt'] as String) ?? DateTime.now()
            : DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'success': success,
        'nonce': nonce,
        'expiresAt': expiresAt,
        'redirectUrl': redirectUrl,
        'deviceId': deviceId,
        'issuedAt': issuedAt.toIso8601String(),
      };
}

class AuthExchangeRequest {
  final String nonce;
  final String deviceId;
  final String userId;
  final String institutionId;

  const AuthExchangeRequest({
    required this.nonce,
    required this.deviceId,
    required this.userId,
    required this.institutionId,
  });

  factory AuthExchangeRequest.fromJson(Map<String, dynamic> json) => AuthExchangeRequest(
        nonce: json['nonce'] as String? ?? '',
        deviceId: json['deviceId'] as String? ?? '',
        userId: json['userId'] as String? ?? '',
        institutionId: json['institutionId'] as String? ?? '',
      );

  Map<String, dynamic> toJson() => {
        'nonce': nonce,
        'deviceId': deviceId,
        'userId': userId,
        'institutionId': institutionId,
      };
}

class AuthExchangeResponse {
  final bool success;
  final String sessionToken;
  final String refreshToken;
  final String expiresAt;
  final String userId;
  final String institutionId;
  final Map<String, dynamic> userInfo;
  final List<String> permissions;
  final DateTime issuedAt;

  const AuthExchangeResponse({
    required this.success,
    required this.sessionToken,
    required this.refreshToken,
    required this.expiresAt,
    required this.userId,
    required this.institutionId,
    required this.userInfo,
    required this.permissions,
    required this.issuedAt,
  });

  factory AuthExchangeResponse.fromJson(Map<String, dynamic> json) => AuthExchangeResponse(
        success: json['success'] as bool? ?? false,
        sessionToken: json['sessionToken'] as String? ?? '',
        refreshToken: json['refreshToken'] as String? ?? '',
        expiresAt: json['expiresAt'] as String? ?? '',
        userId: json['userId'] as String? ?? '',
        institutionId: json['institutionId'] as String? ?? '',
        userInfo: (json['userInfo'] as Map<String, dynamic>?) ?? {},
        permissions: (json['permissions'] as List<dynamic>?)
                ?.map((e) => e.toString())
                .toList() ??
            [],
        issuedAt: json['issuedAt'] != null
            ? DateTime.tryParse(json['issuedAt'] as String) ?? DateTime.now()
            : DateTime.now(),
      );

  Map<String, dynamic> toJson() => {
        'success': success,
        'sessionToken': sessionToken,
        'refreshToken': refreshToken,
        'expiresAt': expiresAt,
        'userId': userId,
        'institutionId': institutionId,
        'userInfo': userInfo,
        'permissions': permissions,
        'issuedAt': issuedAt.toIso8601String(),
      };
}
