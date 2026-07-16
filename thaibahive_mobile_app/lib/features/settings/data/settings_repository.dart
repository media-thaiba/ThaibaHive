import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/providers.dart';
import '../../../models/user_model.dart';

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  return SettingsRepository(ref.watch(apiClientProvider));
});

class SettingsRepository {
  final ApiClient _api;

  SettingsRepository(this._api);

  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    return _api.put(
      '/settings/profile',
      data: data,
      fromJson: (json) => UserModel.fromJson(json as Map<String, dynamic>),
    );
  }

  Future<void> changePassword(Map<String, dynamic> data) async {
    await _api.put('/settings/password', data: data);
  }
}
