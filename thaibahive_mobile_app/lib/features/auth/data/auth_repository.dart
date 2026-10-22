import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
import 'package:thaibahive_mobile/core/services/passkey_service.dart';
import 'package:thaibahive_mobile/models/auth_response_model.dart';
import 'package:thaibahive_mobile/models/user_model.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioProvider));
});

class AuthRepository {
  final Dio client;
  AuthRepository(this.client);

  Future<AuthResponseModel> login(String email, String password, {bool rememberMe = false}) async {
    final response = await client.post('/auth/login', data: {
      'email': email,
      'password': password,
      'rememberMe': rememberMe,
    }, options: Options(headers: {'X-Client-Platform': 'mobile'}));
    return AuthResponseModel.fromJson(response.data);
  }

  Future<AuthResponseModel> signup(Map<String, dynamic> data) async {
    final camelCaseData = {
      'firstName': data['first_name'] ?? data['firstName'],
      'lastName': data['last_name'] ?? data['lastName'],
      'email': data['email'],
      'employeeId': data['employee_id'] ?? data['employeeId'],
      'phone': data['phone'],
      'password': data['password'],
    };
    final response = await client.post('/auth/signup', data: camelCaseData);
    return AuthResponseModel.fromJson(response.data);
  }

  Future<UserModel> getProfile() async {
    final response = await client.get('/auth/me');
    final data = response.data is Map
        ? (response.data['staff'] ?? response.data['user'] ?? response.data)
        : response.data;
    return UserModel.fromJson(data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    await client.post('/auth/logout');
  }

  Future<AuthResponseModel> refreshAccessToken(String refreshToken) async {
    final response = await client.post('/auth/refresh', data: {
      'refreshToken': refreshToken,
    });
    return AuthResponseModel.fromJson(response.data);
  }

  Future<AuthResponseModel> loginWithGoogle(String idToken) async {
    final response = await client.post('/auth/google', data: {
      'idToken': idToken,
    }, options: Options(headers: {'X-Client-Platform': 'mobile'}));
    return AuthResponseModel.fromJson(response.data);
  }

  /// Passkey (WebAuthn via Android Credential Manager) login flow.
  /// Step 1: request challenge from server.
  /// Step 2: prompt user for passkey via PasskeyService.getKey().
  /// Step 3: submit assertion to server; on success returns session token (mobile header set).
  Future<AuthResponseModel> loginWithPasskey(String email) async {
    final passkeyService = PasskeyService();

    final beginResponse = await client.post('/auth/webauthn/login/begin', data: {
      'email': email,
    }, options: Options(headers: {'X-Client-Platform': 'mobile'}));

    final beginData = beginResponse.data;
    final challenge = beginData['challenge'] as String?;
    final rpId = beginData['rpId'] as String?;
    final allowCredentials = (beginData['allowCredentials'] as List<dynamic>?)
        ?.map((c) => c['id'] as String?)
        .whereType<String>()
        .toList() ?? const <String>[];

    if (challenge == null || rpId == null) {
      throw Exception('Passkey challenge not available from server');
    }

    // Prompt user via Android Credential Manager
    final assertion = await passkeyService.getKey(
      challenge: challenge,
      rpId: rpId,
      allowCredentials: allowCredentials,
    );

    final completeResponse = await client.post('/auth/webauthn/login/complete', data: assertion, options: Options(headers: {'X-Client-Platform': 'mobile'}));

    final completeData = completeResponse.data;
    if (completeData['verified'] != true) {
      throw Exception(completeData['error'] ?? 'Passkey verification failed');
    }

    // Backend returns token in body for mobile clients (x-client-platform header)
    final token = completeData['token'] as String?;
    final userData = completeData['user'] as Map<String, dynamic>?;

    if (token == null || token.isEmpty) {
      throw Exception('No session token returned from server');
    }

    final user = userData != null ? UserModel.fromJson(userData) : null;
    return AuthResponseModel.fromJson({
      'token': token,
      'user': user?.toJson() ?? {'email': email},
    });
  }

  /// Begin passkey registration (requires authenticated session).
  Future<Map<String, dynamic>> registerPasskeyBegin({
    required String username,
    required String displayName,
    required String userId,
  }) async {
    final response = await client.post('/auth/webauthn/register/begin', data: {
      'username': username,
      'displayName': displayName,
      'userId': userId,
    }, options: Options(headers: {'X-Client-Platform': 'mobile'}));
    return response.data as Map<String, dynamic>;
  }

  /// Complete passkey registration (requires authenticated session).
  /// Sends the attestation payload from PasskeyService.createKey() to the server.
  Future<Map<String, dynamic>> registerPasskeyComplete(Map<String, dynamic> attestation) async {
    final response = await client.post('/auth/webauthn/register/complete', data: attestation, options: Options(headers: {'X-Client-Platform': 'mobile'}));
    return response.data as Map<String, dynamic>;
  }

  Future<String> getHandoffNonce({String? firstName, String? lastName}) async {
    final response = await client.post('/auth/mobile-handoff/nonce', data: {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
    });
    return response.data['nonce'] as String;
  }

  Future<void> requestPasswordReset(String email) async {
    await client.post('/auth/forgot-password', data: {
      'email': email,
    });
  }
}
