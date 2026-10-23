import 'dart:async';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import '../network/api_exception.dart';

/// Domain-specific exceptions that carry user-friendly, UI-ready messages
class AuthDomainException implements Exception {
  final String code;
  final String uiMessage;
  const AuthDomainException({required this.code, required this.uiMessage});

  @override
  String toString() => 'AuthDomainException($code): $uiMessage';
}

class SessionExpiredException extends AuthDomainException {
  const SessionExpiredException()
      : super(
          code: 'SESSION_EXPIRED',
          uiMessage: 'Your session has expired. Please sign in again.',
        );
}

class NetworkConnectionException extends AuthDomainException {
  const NetworkConnectionException({String? customMessage})
      : super(
          code: 'NETWORK_FAILURE',
          uiMessage: customMessage ?? 'Unable to reach the server. Please check your internet connection.',
        );
}

class InvalidCredentialsException extends AuthDomainException {
  const InvalidCredentialsException({String? detail})
      : super(
          code: 'INVALID_CREDENTIALS',
          uiMessage: detail ?? 'Invalid email or password. Please check your credentials.',
        );
}

class RateLimitedException extends AuthDomainException {
  const RateLimitedException()
      : super(
          code: 'RATE_LIMITED',
          uiMessage: 'Too many login attempts. Please wait a moment and try again.',
        );
}

class GoogleSignInException extends AuthDomainException {
  final int? errorCode;
  const GoogleSignInException({required String message, this.errorCode})
      : super(
          code: 'GOOGLE_SIGN_IN_FAILED',
          uiMessage: message,
        );
}

/// Centralized mapper that converts raw errors, Dio exceptions, and platform exceptions
/// into clean, typed domain exceptions matching MediaHive standards.
class AuthErrorMapper {
  static AuthDomainException map(dynamic error) {
    if (error is AuthDomainException) return error;

    if (error is AppException) {
      if (error.statusCode == 401) {
        return const SessionExpiredException();
      }
      if (error.statusCode == 403) {
        return const InvalidCredentialsException(detail: 'Access denied. Account is inactive or unauthorized.');
      }
      if (error.statusCode == 429) {
        return const RateLimitedException();
      }
      if (error.isConnectionError) {
        return NetworkConnectionException(customMessage: error.message);
      }
      return AuthDomainException(code: 'API_ERROR', uiMessage: error.message);
    }

    if (error is DioException) {
      final appEx = AppException.fromDioException(error);
      return map(appEx);
    }

    if (error is SocketException) {
      return const NetworkConnectionException();
    }

    if (error is TimeoutException) {
      return const NetworkConnectionException(customMessage: 'Connection timed out. Please try again.');
    }

    if (error is PlatformException) {
      final code = error.code.toLowerCase();
      final message = error.message ?? '';
      if (code == 'sign_in_failed' || code.contains('10')) {
        return const GoogleSignInException(
          message: 'Google Sign-In configuration error (Code 10). Keystore SHA-1 must be registered in Google Cloud Console.',
          errorCode: 10,
        );
      }
      if (code == 'sign_in_canceled' || code == 'canceled') {
        return const GoogleSignInException(message: 'Google Sign-In was cancelled.');
      }
      return GoogleSignInException(message: message.isNotEmpty ? message : 'Authentication failed (${error.code})');
    }

    final str = error.toString().toLowerCase();
    if (str.contains('invalid credentials') || str.contains('invalid_credentials') || str.contains('invalid password')) {
      return const InvalidCredentialsException();
    }
    if (str.contains('network') || str.contains('socketexception') || str.contains('failed host lookup')) {
      return const NetworkConnectionException();
    }
    if (str.contains('developer_error') || str.contains('code 10') || str.contains('sign_in_failed')) {
      return const GoogleSignInException(
        message: 'Google configuration error (Code 10). Ensure OAuth SHA-1 is registered in Google Cloud Console.',
        errorCode: 10,
      );
    }

    return AuthDomainException(
      code: 'UNKNOWN',
      uiMessage: error is Exception ? error.toString().replaceFirst('Exception: ', '') : 'An unexpected error occurred. Please try again.',
    );
  }
}
