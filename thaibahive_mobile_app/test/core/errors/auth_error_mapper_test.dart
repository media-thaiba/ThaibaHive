import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/errors/auth_error_mapper.dart';
import 'package:thaibahive_mobile/core/network/api_exception.dart';

void main() {
  group('AuthErrorMapper Tests', () {
    test('maps 401 AppException to SessionExpiredException', () {
      final appEx = AppException(message: 'Unauthorized', statusCode: 401);
      final mapped = AuthErrorMapper.map(appEx);
      expect(mapped, isA<SessionExpiredException>());
      expect(mapped.uiMessage, contains('session has expired'));
    });

    test('maps 403 AppException to InvalidCredentialsException with access denied message', () {
      final appEx = AppException(message: 'Forbidden', statusCode: 403);
      final mapped = AuthErrorMapper.map(appEx);
      expect(mapped, isA<InvalidCredentialsException>());
      expect(mapped.uiMessage, contains('Access denied'));
    });

    test('maps 429 AppException to RateLimitedException', () {
      final appEx = AppException(message: 'Too Many Requests', statusCode: 429);
      final mapped = AuthErrorMapper.map(appEx);
      expect(mapped, isA<RateLimitedException>());
      expect(mapped.uiMessage, contains('Too many login attempts'));
    });

    test('maps SocketException to NetworkConnectionException', () {
      const socketEx = SocketException('Failed host lookup');
      final mapped = AuthErrorMapper.map(socketEx);
      expect(mapped, isA<NetworkConnectionException>());
      expect(mapped.uiMessage, contains('Unable to reach the server'));
    });

    test('maps Google Sign-In Code 10 PlatformException to GoogleSignInException with actionable guidance', () {
      final platformEx = PlatformException(code: 'sign_in_failed', message: '10: ');
      final mapped = AuthErrorMapper.map(platformEx);
      expect(mapped, isA<GoogleSignInException>());
      expect(mapped.uiMessage, contains('Google Sign-In configuration error (Code 10)'));
    });
  });
}
