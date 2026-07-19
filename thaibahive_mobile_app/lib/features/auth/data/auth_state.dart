import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/network/api_exception.dart';
import 'package:thaibahive_mobile/models/auth_response_model.dart';
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
    final rememberMe = await _storage.read(key: 'remember_me');
    if (rememberMe == 'false') {
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
        state = AuthState(
          status: AuthStatus.authenticated,
          user: user,
          token: token,
        );
      } catch (e) {
        state = const AuthState(status: AuthStatus.unauthenticated);
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
      _repository.client.options.headers['Authorization'] = 'Bearer ${response.token}';
      state = AuthState(
        status: AuthStatus.authenticated,
        user: response.user,
        token: response.token,
      );
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
    } catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: 'Login failed: $e');
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
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
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
    } on AppException catch (e) {
      state = state.copyWith(status: AuthStatus.error, errorMessage: e.message);
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
  }

  void clearError() {
    state = state.copyWith(errorMessage: null);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final repository = ref.watch(authRepositoryProvider);
  final storage = const FlutterSecureStorage();
  return AuthNotifier(repository, storage);
});
