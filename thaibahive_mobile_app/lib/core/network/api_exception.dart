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
        String? serverMsg;

        if (body is Map<String, dynamic>) {
          serverMsg = body['error'] as String? ?? body['message'] as String?;
        }

        String msg = serverMsg ?? 'Something went wrong';

        if (statusCode == 401) {
          msg = serverMsg ?? 'Session expired. Please login again.';
        } else if (statusCode == 403) {
          msg = serverMsg ?? 'You don\'t have permission to perform this action.';
        } else if (statusCode == 404) {
          msg = serverMsg ?? 'Resource not found.';
        } else if (statusCode == 409) {
          msg = serverMsg ?? 'Conflict error occurred.';
        } else if (statusCode == 422) {
          msg = serverMsg ?? 'Validation failed.';
        } else if (statusCode == 500) {
          msg = serverMsg ?? 'Server error. Please try again later.';
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
