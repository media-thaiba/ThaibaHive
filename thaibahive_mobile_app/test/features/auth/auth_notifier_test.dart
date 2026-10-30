import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_repository.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';
import 'package:thaibahive_mobile/models/user_model.dart';

class FakeAuthRepository extends AuthRepository {
  FakeAuthRepository() : super(Dio());

  UserModel? profileToReturn;
  Object? profileError;
  bool logoutCalled = false;

  @override
  Future<UserModel> getProfile() async {
    if (profileError != null) {
      throw profileError!;
    }
    return profileToReturn!;
  }

  @override
  Future<void> logout() async {
    logoutCalled = true;
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final testUser = UserModel(
    id: 'staff_123',
    email: 'staff@thaiba.com',
    employeeId: 'EMP001',
    firstName: 'Ahmed',
    lastName: 'Khan',
    role: 'staff',
    isActive: true,
    isFirstLogin: false,
    createdAt: DateTime(2026, 1, 1),
    updatedAt: DateTime(2026, 1, 1),
  );

  group('AuthNotifier Session Restore Tests', () {
    test('Successful online session restoration', () async {
      FlutterSecureStorage.setMockInitialValues({
        AppConstants.storageTokenKey: 'valid_jwt_token',
        'remember_me': 'true',
      });
      const storage = FlutterSecureStorage();
      final repo = FakeAuthRepository()..profileToReturn = testUser;

      final notifier = AuthNotifier(repo, storage);

      // Wait for async _checkExistingToken to settle
      await pumpEventQueue();

      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.token, 'valid_jwt_token');
      expect(notifier.state.user?.email, 'staff@thaiba.com');
      expect(repo.logoutCalled, isFalse);

      final cachedProfile = await storage.read(key: AppConstants.storageUserProfileKey);
      expect(cachedProfile, isNotNull);
      expect(jsonDecode(cachedProfile!)['email'], 'staff@thaiba.com');
    });

    test('Offline fallback: network timeout restores cached profile without logout', () async {
      FlutterSecureStorage.setMockInitialValues({
        AppConstants.storageTokenKey: 'valid_jwt_token',
        'remember_me': 'true',
        AppConstants.storageUserProfileKey: jsonEncode(testUser.toJson()),
      });
      const storage = FlutterSecureStorage();
      final repo = FakeAuthRepository()
        ..profileError = DioException(
          requestOptions: RequestOptions(path: '/auth/me'),
          type: DioExceptionType.connectionTimeout,
          error: 'Connection timed out',
        );

      final notifier = AuthNotifier(repo, storage);

      await pumpEventQueue();

      // Crucial: Must stay authenticated in offline mode, NOT logged out!
      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.token, 'valid_jwt_token');
      expect(notifier.state.user?.email, 'staff@thaiba.com');
      expect(repo.logoutCalled, isFalse);

      // Storage token must NOT have been wiped
      final tokenAfter = await storage.read(key: AppConstants.storageTokenKey);
      expect(tokenAfter, 'valid_jwt_token');
    });

    test('Offline fallback: server 500 error preserves cached profile without logout', () async {
      FlutterSecureStorage.setMockInitialValues({
        AppConstants.storageTokenKey: 'valid_jwt_token',
        'remember_me': 'true',
        AppConstants.storageUserProfileKey: jsonEncode(testUser.toJson()),
      });
      const storage = FlutterSecureStorage();
      final repo = FakeAuthRepository()
        ..profileError = DioException(
          requestOptions: RequestOptions(path: '/auth/me'),
          response: Response(
            requestOptions: RequestOptions(path: '/auth/me'),
            statusCode: 500,
          ),
          type: DioExceptionType.badResponse,
        );

      final notifier = AuthNotifier(repo, storage);

      await pumpEventQueue();

      expect(notifier.state.status, AuthStatus.authenticated);
      expect(notifier.state.user?.email, 'staff@thaiba.com');
      expect(repo.logoutCalled, isFalse);

      final tokenAfter = await storage.read(key: AppConstants.storageTokenKey);
      expect(tokenAfter, 'valid_jwt_token');
    });

    test('401 Unauthorized: token revocation triggers clean logout', () async {
      FlutterSecureStorage.setMockInitialValues({
        AppConstants.storageTokenKey: 'revoked_token',
        'remember_me': 'true',
        AppConstants.storageUserProfileKey: jsonEncode(testUser.toJson()),
      });
      const storage = FlutterSecureStorage();
      final repo = FakeAuthRepository()
        ..profileError = DioException(
          requestOptions: RequestOptions(path: '/auth/me'),
          response: Response(
            requestOptions: RequestOptions(path: '/auth/me'),
            statusCode: 401,
          ),
          type: DioExceptionType.badResponse,
        );

      final notifier = AuthNotifier(repo, storage);

      await pumpEventQueue();

      // Must be unauthenticated
      expect(notifier.state.status, AuthStatus.unauthenticated);
      expect(notifier.state.token, isNull);
      expect(repo.logoutCalled, isTrue);

      // Token and remember_me should be deleted from storage
      final token = await storage.read(key: AppConstants.storageTokenKey);
      expect(token, isNull);
      final rememberMe = await storage.read(key: 'remember_me');
      expect(rememberMe, isNull);
    });

    test('Explicit remember_me == false wipes session on launch', () async {
      FlutterSecureStorage.setMockInitialValues({
        AppConstants.storageTokenKey: 'token_to_discard',
        'remember_me': 'false',
      });
      const storage = FlutterSecureStorage();
      final repo = FakeAuthRepository()..profileToReturn = testUser;

      final notifier = AuthNotifier(repo, storage);

      await pumpEventQueue();

      expect(notifier.state.status, AuthStatus.unauthenticated);
      final token = await storage.read(key: AppConstants.storageTokenKey);
      expect(token, isNull);
      final rememberMe = await storage.read(key: 'remember_me');
      expect(rememberMe, isNull);
    });
  });
}
