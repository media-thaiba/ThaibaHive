import 'dart:io';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants.dart';
import '../services/logger_service.dart';
import 'api_exception.dart';

class ApiClient {
  late final Dio _dio;
  late final FlutterSecureStorage _storage;

  ApiClient({
    String? baseUrl,
  }) {
    _storage = const FlutterSecureStorage();
    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl ?? AppConstants.apiBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        sendTimeout: const Duration(seconds: 30),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    if (kDebugMode) {
      _dio.httpClientAdapter = IOHttpClientAdapter(
        createHttpClient: () {
          final client = HttpClient();
          client.badCertificateCallback =
              (X509Certificate cert, String host, int port) => true;
          return client;
        },
      );
    }

    _dio.interceptors.addAll([
      _authInterceptor(),
      _errorInterceptor(),
      _normalizationInterceptor(),
      _loggerInterceptor(),
      if (kDebugMode)
        LogInterceptor(
          requestBody: true,
          responseBody: true,
          error: true,
          logPrint: (object) {
            String logStr = object.toString();
            // Redact Authorization headers and sensitive data
            logStr = logStr.replaceAll(
              RegExp(r'Bearer\s+[^\s"]+'),
              'Bearer [REDACTED]',
            );
            logStr = logStr.replaceAll(
              RegExp(r'"password"\s*:\s*"[^"]*"'),
              '"password": "[REDACTED]"',
            );
            logStr = logStr.replaceAll(
              RegExp(r'"token"\s*:\s*"[^"]*"'),
              '"token": "[REDACTED]"',
            );
            debugPrint(logStr);
          },
        ),
    ]);
  }

  InterceptorsWrapper _authInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(
          key: AppConstants.storageTokenKey,
        );
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
    );
  }

  InterceptorsWrapper _errorInterceptor() {
    return InterceptorsWrapper(
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          await _storage.delete(key: AppConstants.storageTokenKey);
          await _storage.delete(key: AppConstants.storageRefreshTokenKey);
          await _storage.delete(key: AppConstants.storageUserProfileKey);
        }
        handler.next(error);
      },
    );
  }

  InterceptorsWrapper _normalizationInterceptor() {
    return InterceptorsWrapper(
      onResponse: (response, handler) {
        if (response.data != null) {
          response.data = _normalizeJson(response.data);
        }
        handler.next(response);
      },
    );
  }

  InterceptorsWrapper _loggerInterceptor() {
    return InterceptorsWrapper(
      onRequest: (options, handler) {
        final path = options.path;
        final method = options.method;
        logger.info('HTTP REQUEST: $method ${options.baseUrl}$path');
        if (options.data != null) {
          String body = options.data.toString();
          body = body.replaceAll(RegExp(r'password\s*:\s*[^\s,]+'), 'password: ***');
          body = body.replaceAll(RegExp(r'"password"\s*:\s*"[^"]*"'), '"password": "***"');
          logger.info('HTTP REQUEST BODY: $body');
        }
        handler.next(options);
      },
      onResponse: (response, handler) {
        final statusCode = response.statusCode;
        final path = response.requestOptions.path;
        logger.info('HTTP RESPONSE: $statusCode for $path');
        handler.next(response);
      },
      onError: (error, handler) {
        final path = error.requestOptions.path;
        final statusCode = error.response?.statusCode;
        final message = error.message;
        final errorData = error.response?.data;
        logger.error('HTTP ERROR: $statusCode for $path | Message: $message | Response: $errorData');
        handler.next(error);
      },
    );
  }

  dynamic _normalizeJson(dynamic json) {
    if (json is List) {
      return json.map(_normalizeJson).toList();
    }
    if (json is Map) {
      final Map<String, dynamic> normalized = {};
      json.forEach((k, v) {
        final key = k.toString();
        final normalizedValue = _normalizeJson(v);
        normalized[key] = normalizedValue;
        
        final snakeKey = _camelToSnake(key);
        if (snakeKey != key) {
          normalized[snakeKey] = normalizedValue;
        }
      });
      return normalized;
    }
    return json;
  }

  String _camelToSnake(String input) {
    if (input.isEmpty) return input;
    final RegExp camelCaseExp = RegExp(r'(?<=[a-z0-9])([A-Z])');
    return input.replaceAllMapped(camelCaseExp, (Match m) => '_${m.group(0)!.toLowerCase()}').toLowerCase();
  }

  Dio get dio => _dio;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
      );
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    }
  }

  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.post(path, data: data);
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    }
  }

  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.put(path, data: data);
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    }
  }

  Future<T> delete<T>(
    String path, {
    dynamic data,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.delete(path, data: data);
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    }
  }

  Future<T> patch<T>(
    String path, {
    dynamic data,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.patch(path, data: data);
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    }
  }

  Future<T> upload<T>(
    String path, {
    required FormData formData,
    void Function(int, int)? onSendProgress,
    T Function(dynamic json)? fromJson,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: formData,
        onSendProgress: onSendProgress,
      );
      return _handleResponse(response, fromJson);
    } on DioException catch (e) {
      throw AppException.fromDioException(e);
    }
  }

  T _handleResponse<T>(
    Response response,
    T Function(dynamic json)? fromJson,
  ) {
    final data = response.data;

    if (fromJson != null) {
      return fromJson(data);
    }

    if (data is T) {
      return data;
    }

    return data as T;
  }
}
