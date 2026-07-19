import 'user_model.dart';

class AuthResponseModel {
  final String token;
  final String? refreshToken;
  final UserModel user;

  const AuthResponseModel({required this.token, this.refreshToken, required this.user});

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) => AuthResponseModel(
        token: json['token'] as String,
        refreshToken: json['refreshToken'] as String?,
        user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      );

  Map<String, dynamic> toJson() => {
        'token': token,
        'refreshToken': refreshToken,
        'user': user.toJson(),
      };

  AuthResponseModel copyWith({String? token, String? refreshToken, UserModel? user}) => AuthResponseModel(
        token: token ?? this.token,
        refreshToken: refreshToken ?? this.refreshToken,
        user: user ?? this.user,
      );
}
