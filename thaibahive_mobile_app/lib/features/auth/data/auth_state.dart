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

  Future<void> login(String email, String password) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _repository.login(email, password);
      await _storage.write(key: AppConstants.storageTokenKey, value: response.token);
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

  Future<void> signup(Map<String, dynamic> data) async {
    state = state.copyWith(status: AuthStatus.loading, errorMessage: null);
    try {
      final response = await _repository.signup(data);
      await _storage.write(key: AppConstants.storageTokenKey, value: response.token);
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
