import 'user_model.dart';

class AuthResponseModel {
  final String token;
  final String? refreshToken;
  final UserModel user;
  final bool needsOnboarding;

  const AuthResponseModel({
    required this.token,
    this.refreshToken,
    required this.user,
    this.needsOnboarding = false,
  });

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) => AuthResponseModel(
        token: json['token'] as String,
        refreshToken: json['refreshToken'] as String?,
        user: UserModel.fromJson((json['user'] ?? json['staff'] ?? json) as Map<String, dynamic>),
        needsOnboarding: (json['needsOnboarding'] ?? json['user']['isFirstLogin'] ?? false) as bool,
      );

  Map<String, dynamic> toJson() => {
        'token': token,
        'refreshToken': refreshToken,
        'user': user.toJson(),
        'needsOnboarding': needsOnboarding,
      };

  AuthResponseModel copyWith({
    String? token,
    String? refreshToken,
    UserModel? user,
    bool? needsOnboarding,
  }) => AuthResponseModel(
        token: token ?? this.token,
        refreshToken: refreshToken ?? this.refreshToken,
        user: user ?? this.user,
        needsOnboarding: needsOnboarding ?? this.needsOnboarding,
      );
}
