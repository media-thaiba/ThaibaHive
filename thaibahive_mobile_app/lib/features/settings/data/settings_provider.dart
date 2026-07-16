import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/constants.dart';
import '../../../models/user_model.dart';
import 'settings_repository.dart';

final _storage = const FlutterSecureStorage();

final currentUserProvider = StateNotifierProvider<CurrentUserNotifier, UserModel?>(
  (ref) => CurrentUserNotifier(),
);

class CurrentUserNotifier extends StateNotifier<UserModel?> {
  CurrentUserNotifier() : super(null) {
    _loadUser();
  }

  Future<void> _loadUser() async {
    final data = await _storage.read(key: AppConstants.storageUserProfileKey);
    if (data != null) {
      state = UserModel.fromJson(jsonDecode(data) as Map<String, dynamic>);
    }
  }

  Future<void> updateUser(UserModel user) async {
    state = user;
    await _storage.write(
      key: AppConstants.storageUserProfileKey,
      value: jsonEncode(user.toJson()),
    );
  }

  Future<void> clear() async {
    state = null;
    await _storage.delete(key: AppConstants.storageUserProfileKey);
    await _storage.delete(key: AppConstants.storageTokenKey);
    await _storage.delete(key: AppConstants.storageRefreshTokenKey);
  }
}

final darkModeProvider = StateProvider<bool>((ref) => false);

final notificationsEnabledProvider =
    StateProvider<bool>((ref) => true);
