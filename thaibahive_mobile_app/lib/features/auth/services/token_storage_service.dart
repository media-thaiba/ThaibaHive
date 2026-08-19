import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class TokenStorageService {
  static const String storageTokenKey = 'thaibahive_jwt_token';
  static const String storageRefreshTokenKey = 'thaibahive_refresh_token';
  static const String storageUserRoleKey = 'thaibahive_user_role';

  final FlutterSecureStorage _storage;

  TokenStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  Future<void> saveToken(String token) async {
    await _storage.write(key: storageTokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: storageTokenKey);
  }

  Future<void> saveRefreshToken(String refreshToken) async {
    await _storage.write(key: storageRefreshTokenKey, value: refreshToken);
  }

  Future<String?> getRefreshToken() async {
    return await _storage.read(key: storageRefreshTokenKey);
  }

  Future<void> saveUserRole(String role) async {
    await _storage.write(key: storageUserRoleKey, value: role);
  }

  Future<String?> getUserRole() async {
    return await _storage.read(key: storageUserRoleKey);
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
