import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

class UploadedFile {
  final String url;
  final String filename;
  final int size;
  final String type;

  const UploadedFile({
    required this.url,
    required this.filename,
    required this.size,
    required this.type,
  });

  factory UploadedFile.fromJson(Map<String, dynamic> json) => UploadedFile(
        url: json['url'] as String,
        filename: json['filename'] as String,
        size: json['size'] as int,
        type: json['type'] as String,
      );
}

final fileUploadServiceProvider = Provider<FileUploadService>((ref) {
  return FileUploadService(ref.watch(dioProvider));
});

class FileUploadService {
  final Dio _client;
  FileUploadService(this._client);

  Future<UploadedFile> uploadFile(File file, {String path = '/upload'}) async {
    final fileName = file.path.split('/').last;
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(file.path, filename: fileName),
    });

    final response = await _client.post(
      path,
      data: formData,
      options: Options(headers: {'Content-Type': 'multipart/form-data'}),
    );

    return UploadedFile.fromJson(response.data as Map<String, dynamic>);
  }

  Future<List<UploadedFile>> uploadFiles(
    List<File> files, {
    String path = '/upload',
  }) async {
    final results = <UploadedFile>[];
    for (final file in files) {
      results.add(await uploadFile(file, path: path));
    }
    return results;
  }
}
