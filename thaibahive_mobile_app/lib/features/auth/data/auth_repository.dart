import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';
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
    });
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
    return UserModel.fromJson(response.data);
  }

  Future<void> logout() async {
    await client.post('/auth/logout');
  }

  Future<AuthResponseModel> loginWithGoogle(String idToken) async {
    final response = await client.post('/auth/google', data: {
      'idToken': idToken,
    });
    return AuthResponseModel.fromJson(response.data);
  }

  Future<String> getHandoffNonce({String? firstName, String? lastName}) async {
    final response = await client.post('/auth/mobile-handoff/nonce', data: {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
    });
    return response.data['nonce'] as String;
  }
}
