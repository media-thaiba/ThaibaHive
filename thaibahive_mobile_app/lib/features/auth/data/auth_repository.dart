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

  Future<AuthResponseModel> login(String email, String password) async {
    final response = await client.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    return AuthResponseModel.fromJson(response.data);
  }

  Future<AuthResponseModel> signup(Map<String, dynamic> data) async {
    final response = await client.post('/auth/signup', data: data);
    return AuthResponseModel.fromJson(response.data);
  }

  Future<UserModel> getProfile() async {
    final response = await client.get('/auth/me');
    return UserModel.fromJson(response.data);
  }

  Future<void> logout() async {
    await client.post('/auth/logout');
  }

  Future<String> getHandoffNonce({String? firstName, String? lastName}) async {
    final response = await client.post('/auth/mobile-handoff/nonce', data: {
      if (firstName != null) 'firstName': firstName,
      if (lastName != null) 'lastName': lastName,
    });
    return response.data['nonce'] as String;
  }
}
