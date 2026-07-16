import 'package:dio/dio.dart';

class AppException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  AppException({
    required this.message,
    this.statusCode,
    this.data,
  });

  factory AppException.fromDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return AppException(
          message: 'Connection timed out. Please check your internet.',
          statusCode: null,
        );
      case DioExceptionType.badResponse:
        final response = e.response;
        final statusCode = response?.statusCode;
        final body = response?.data;
        String msg = 'Something went wrong';

        if (body is Map<String, dynamic>) {
          msg = body['message'] as String? ??
              body['error'] as String? ??
              msg;
        }

        if (statusCode == 401) {
          msg = 'Session expired. Please login again.';
        } else if (statusCode == 403) {
          msg = 'You don\'t have permission to perform this action.';
        } else if (statusCode == 404) {
          msg = 'Resource not found.';
        } else if (statusCode == 422) {
          msg = body is Map<String, dynamic>
              ? (body['message'] as String? ?? 'Validation failed.')
              : 'Validation failed.';
        } else if (statusCode == 500) {
          msg = 'Server error. Please try again later.';
        }

        return AppException(
          message: msg,
          statusCode: statusCode,
          data: body,
        );
      case DioExceptionType.cancel:
        return AppException(message: 'Request was cancelled.');
      case DioExceptionType.connectionError:
        return AppException(
          message: 'No internet connection. Please check your network.',
        );
      default:
        return AppException(
          message: e.message ?? 'An unexpected error occurred.',
        );
    }
  }

  bool get isAuthError => statusCode == 401;

  bool get isForbidden => statusCode == 403;

  bool get isNotFound => statusCode == 404;

  bool get isValidationError => statusCode == 422;

  bool get isServerError => statusCode == 500;

  bool get isConnectionError => statusCode == null;

  @override
  String toString() => 'AppException: $message (status: $statusCode)';
}
