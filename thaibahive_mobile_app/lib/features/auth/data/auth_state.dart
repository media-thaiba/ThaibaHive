import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/network/api_exception.dart';
import 'package:thaibahive_mobile/core/services/fcm_service.dart';
import 'package:thaibahive_mobile/models/user_model.dart';
import 'auth_repository.dart';

enum AuthStatus { initial, authenticated, unauthenticated, loading, error }

class AuthState {
  final AuthStatus status;
  final UserModel? user;
  final String? token;
  final String? errorMessage;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.token,
    this.errorMessage,
  });

  AuthState copyWith({AuthStatus? status, UserModel? user, String? token, String? errorMessage}) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      token: token ?? this.token,
      errorMessage: errorMessage,
    );
  }

  bool get isAuthenticated => status == AuthStatus.authenticated && token != null;
}

class AuthNotifier extends StateNotifier<AuthState> {
  final AuthRepository _repository;
  final FlutterSecureStorage _storage;

  AuthNotifier(this._repository, this._storage) : super(const AuthState()) {
    _checkExistingToken();
  }

  Future<void> _checkExistingToken() async {
    // Only clear the session when the user explicitly chose NOT to be remembered.
    // null means the key was never written (fresh install / first launch) — treat as remembered.
    final rememberMe = await _storage.read(key: 'remember_me');
    if (rememberMe == 'false') {
      // User explicitly unchecked "Keep me logged in" — honour that and wipe the session.
      await _storage.delete(key: AppConstants.storageTokenKey);
      await _storage.delete(key: AppConstants.storageRefreshTokenKey);
      await _storage.delete(key: 'remember_me');
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    final token = await _storage.read(key: AppConstants.storageTokenKey);
    if (token != null && token.isNotEmpty) {
      state = state.copyWith(status: AuthStatus.loading);
      _repository.client.options.headers['Authorization'] = 'Bearer $token';
      try {
        final user = await _repository.getProfile();
        await _storage.write(
          key: AppConstants.storageUserProfileKey,
          value: jsonEncode(user.toJson()),
        );
        state = AuthState(
          status: AuthStatus.authenticated,
          user: user,
          token: token,
        );
        // Re-register FCM token for silently-restored sessions.
        await _onLoginSuccess();
      } catch (e) {
        final isUnauthorized = e is DioException && e.response?.statusCode == 401;
        if (isUnauthorized) {
          // Token is explicitly rejected by backend (401 Unauthorized) — clear session.
          await _storage.delete(key: AppConstants.storageTokenKey);
          await _storage.delete(key: AppConstants.storageRefreshTokenKey);
          state = const AuthState(status: AuthStatus.unauthenticated);
        } else {
          // Network error / timeout / 5xx error. Try loading cached user profile if available.
          final cachedProfileJson = await _storage.read(key: AppConstants.storageUserProfileKey);
          UserModel? cachedUser;
          if (cachedProfileJson != null) {
            try {
              cachedUser = UserModel.fromJson(jsonDecode(cachedProfileJson));
            } catch (_) {}
          }
          state = AuthState(
            status: AuthStatus.authenticated,
            user: cachedUser,
            token: token,
          );
        }
      }
    } else {
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login(String email, String password, {bool rememberMe = false}) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _repository.login(email, password, rememberMe: rememberMe);
      await _storage.write(key: AppConstants.storageTokenKey, value: response.token);
      if (response.refreshToken != null) {
        await _storage.write(key: AppConstants.storageRefreshTokenKey, value: response.refreshToken);
      }
      await _storage.write(key: 'remember_me', value: rememberMe ? 'true' : 'false');
      if (rememberMe) {
        await _storage.write(key: 'saved_email', value: email);
      } else {
        await _storage.delete(key: 'saved_email');
      }
      await _storage.write(
        key: AppConstants.storageUserProfileKey,
        value: jsonEncode(response.user.toJson()),
      );
      _repository.client.options.headers['Authorization'] = 'Bearer ${response.token}';
      state = AuthState(
        status: AuthStatus.authenticated,
        user: response.user,
        token: response.token,
      );
      await _onLoginSuccess();
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    } on DioException catch (e) {
      final appEx = AppException.fromDioException(e);
      state = state.copyWith(status: AuthStatus.error, errorMessage: appEx.message);
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: 'Login failed: $e');
    }
  }

  Future<void> _onLoginSuccess() async {
    try {
      await FCMService().onUserLogin();
    } catch (e) {
      if (kDebugMode) print('[AuthNotifier] FCM onUserLogin failed: $e');
    }
  }

  Future<void> loginWithGoogle(String idToken) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _repository.loginWithGoogle(idToken);
      await _storage.write(key: AppConstants.storageTokenKey, value: response.token);
      if (response.refreshToken != null) {
        await _storage.write(key: AppConstants.storageRefreshTokenKey, value: response.refreshToken);
      }
      await _storage.write(key: 'remember_me', value: 'true');
      _repository.client.options.headers['Authorization'] = 'Bearer ${response.token}';
      state = AuthState(
        status: AuthStatus.authenticated,
        user: response.user,
        token: response.token,
      );
      await _onLoginSuccess();
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    } on DioException catch (e) {
      final appEx = AppException.fromDioException(e);
      state = state.copyWith(status: AuthStatus.error, errorMessage: appEx.message);
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: 'Google login failed: $e');
    }
  }


  Future<void> signup(Map<String, dynamic> data) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _repository.signup(data);
      await _storage.write(key: AppConstants.storageTokenKey, value: response.token);
      if (response.refreshToken != null) {
        await _storage.write(key: AppConstants.storageRefreshTokenKey, value: response.refreshToken);
      }
      await _storage.write(key: 'remember_me', value: 'true'); // signup defaults to keeping signed in
      _repository.client.options.headers['Authorization'] = 'Bearer ${response.token}';
      state = AuthState(
        status: AuthStatus.authenticated,
        user: response.user,
        token: response.token,
      );
      await _onLoginSuccess();
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    } on DioException catch (e) {
      final appEx = AppException.fromDioException(e);
      state = state.copyWith(status: AuthStatus.error, errorMessage: appEx.message);
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: 'Signup failed: $e');
    }
  }

  Future<void> logout() async {
    try {
      await _repository.logout();
    } catch (_) {}
    await _storage.delete(key: AppConstants.storageTokenKey);
    await _storage.delete(key: AppConstants.storageRefreshTokenKey);
    await _storage.delete(key: 'remember_me');
    _repository.client.options.headers.remove('Authorization');
    state = const AuthState(status: AuthStatus.unauthenticated);
    await FCMService().onUserLogout();
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }

  void updateUser(UserModel user) {
    state = state.copyWith(user: user);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  const storage = FlutterSecureStorage();
  return AuthNotifier(repository, storage);
});
