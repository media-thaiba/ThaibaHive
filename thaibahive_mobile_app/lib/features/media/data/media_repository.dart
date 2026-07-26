import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

class MediaAssetModel {
  final String id;
  final String name;
  final String mimeType;
  final String fileType;
  final int fileSize;
  final String? thumbnailUrl;
  final String? fileUrl;

  MediaAssetModel({
    required this.id,
    required this.name,
    required this.mimeType,
    required this.fileType,
    required this.fileSize,
    this.thumbnailUrl,
    this.fileUrl,
  });

  factory MediaAssetModel.fromJson(Map<String, dynamic> json) {
    return MediaAssetModel(
      id: json['id'] as String,
      name: json['name'] as String,
      mimeType: json['mimeType'] as String? ?? 'application/octet-stream',
      fileType: json['fileType'] as String? ?? 'document',
      fileSize: json['fileSize'] as int? ?? 0,
      thumbnailUrl: json['thumbnailUrl'] as String?,
      fileUrl: json['fileUrl'] as String?,
    );
  }
}

class MediaFolderModel {
  final String id;
  final String name;
  final String? parentId;

  MediaFolderModel({
    required this.id,
    required this.name,
    this.parentId,
  });

  factory MediaFolderModel.fromJson(Map<String, dynamic> json) {
    return MediaFolderModel(
      id: json['id'] as String,
      name: json['name'] as String,
      parentId: json['parentId'] as String?,
    );
  }
}

final mediaRepositoryProvider = Provider<MediaRepository>((ref) {
  final apiClient = ref.read(apiClientProvider);
  return MediaRepository(apiClient);
});

class MediaRepository {
  final ApiClient _apiClient;

  MediaRepository(this._apiClient);

  Future<List<MediaFolderModel>> getFolders({String? parentId}) async {
    final params = <String, dynamic>{};
    if (parentId != null) params['parentId'] = parentId;

    final response = await _apiClient.get('/media/folders', queryParameters: params);
    if (response is Map && response['folders'] is List) {
      return (response['folders'] as List)
          .map((e) => MediaFolderModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }

  Future<List<MediaAssetModel>> getAssets({String? folderId, String? fileType, String? search}) async {
    final params = <String, dynamic>{};
    if (folderId != null) params['folderId'] = folderId;
    if (fileType != null) params['fileType'] = fileType;
    if (search != null) params['search'] = search;

    final response = await _apiClient.get('/media/assets', queryParameters: params);
    if (response is Map && response['assets'] is List) {
      return (response['assets'] as List)
          .map((e) => MediaAssetModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }
    return [];
  }
}
