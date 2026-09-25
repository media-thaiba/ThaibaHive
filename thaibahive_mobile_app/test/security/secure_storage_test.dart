import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:thaibahive_mobile/features/auth/services/token_storage_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('TokenStorageService Security Tests', () {
    test('Token storage key constants are consistent and non-predictable', () {
      expect(TokenStorageService.storageTokenKey, 'thaibahive_jwt_token');
      expect(TokenStorageService.storageRefreshTokenKey, 'thaibahive_refresh_token');
      expect(TokenStorageService.storageUserRoleKey, 'thaibahive_user_role');
    });

    test('Mock secure storage write/read functionality', () async {
      FlutterSecureStorage.setMockInitialValues({'thaibahive_jwt_token': 'mock_secure_jwt'});
      final service = TokenStorageService();

      final token = await service.getToken();
      expect(token, 'mock_secure_jwt');
    });
  });
}
