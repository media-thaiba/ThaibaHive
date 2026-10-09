import 'package:flutter/foundation.dart';

enum EntityRouteStrategy {
  native,
  handoff,
}

const Map<String, EntityRouteStrategy> kEntityRouteStrategyMap = {
  'students': EntityRouteStrategy.native,
  'staff': EntityRouteStrategy.native,
  'tasks': EntityRouteStrategy.native,
  'events': EntityRouteStrategy.native,
  'announcements': EntityRouteStrategy.native,
  'daily-reports': EntityRouteStrategy.native,
  'circulars': EntityRouteStrategy.native,
  'polls': EntityRouteStrategy.native,
  'purchase-requests': EntityRouteStrategy.handoff,
  'expense-claims': EntityRouteStrategy.handoff,
  'fee-receipts': EntityRouteStrategy.handoff,
  'help-desk-tickets': EntityRouteStrategy.native,
  'bookings': EntityRouteStrategy.native,
  'recognition': EntityRouteStrategy.native,
  'comments': EntityRouteStrategy.native,
  'asset-inventory': EntityRouteStrategy.native,
  'media-assets': EntityRouteStrategy.native,
};

const List<String> kSearchableEntityTypes = [
  'students',
  'staff',
  'tasks',
  'events',
  'announcements',
  'daily-reports',
  'purchase-requests',
  'help-desk-tickets',
  'recognition',
  'asset-inventory',
  'circulars',
  'bookings',
  'polls',
  'comments',
  'media-assets',
];

@immutable
class SearchResult {
  final String id;
  final String entityType;
  final String title;
  final String? subtitle;
  final String? avatarUrl;
  final String? initials;
  final String? badge;
  final String nativeRoute;
  final String webRoute;
  final String? targetPath;
  final bool isWebOnly;
  final double? score;
  final Map<String, dynamic>? metadata;

  const SearchResult({
    required this.id,
    required this.entityType,
    required this.title,
    this.subtitle,
    this.avatarUrl,
    this.initials,
    this.badge,
    required this.nativeRoute,
    required this.webRoute,
    this.targetPath,
    this.isWebOnly = false,
    this.score,
    this.metadata,
  });

  EntityRouteStrategy get routeStrategy {
    if (isWebOnly) return EntityRouteStrategy.handoff;
    return kEntityRouteStrategyMap[entityType] ?? EntityRouteStrategy.native;
  }

  factory SearchResult.fromJson(Map<String, dynamic> json) {
    return SearchResult(
      id: json['id']?.toString() ?? '',
      entityType: json['entityType']?.toString() ?? json['entity_type']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      subtitle: json['subtitle']?.toString(),
      avatarUrl: json['avatarUrl']?.toString() ?? json['avatar_url']?.toString(),
      initials: json['initials']?.toString(),
      badge: json['badge']?.toString(),
      nativeRoute: json['nativeRoute']?.toString() ?? json['native_route']?.toString() ?? '',
      webRoute: json['webRoute']?.toString() ?? json['web_route']?.toString() ?? '',
      targetPath: json['targetPath']?.toString() ?? json['target_path']?.toString(),
      isWebOnly: json['isWebOnly'] == true || json['is_web_only'] == true,
      score: json['score'] != null ? (json['score'] as num).toDouble() : null,
      metadata: json['metadata'] is Map<String, dynamic> ? json['metadata'] as Map<String, dynamic> : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'entityType': entityType,
      'title': title,
      if (subtitle != null) 'subtitle': subtitle,
      if (avatarUrl != null) 'avatarUrl': avatarUrl,
      if (initials != null) 'initials': initials,
      if (badge != null) 'badge': badge,
      'nativeRoute': nativeRoute,
      'webRoute': webRoute,
      if (targetPath != null) 'targetPath': targetPath,
      'isWebOnly': isWebOnly,
      if (score != null) 'score': score,
      if (metadata != null) 'metadata': metadata,
    };
  }

  SearchResult copyWith({
    String? id,
    String? entityType,
    String? title,
    String? subtitle,
    String? avatarUrl,
    String? initials,
    String? badge,
    String? nativeRoute,
    String? webRoute,
    String? targetPath,
    bool? isWebOnly,
    double? score,
    Map<String, dynamic>? metadata,
  }) {
    return SearchResult(
      id: id ?? this.id,
      entityType: entityType ?? this.entityType,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      initials: initials ?? this.initials,
      badge: badge ?? this.badge,
      nativeRoute: nativeRoute ?? this.nativeRoute,
      webRoute: webRoute ?? this.webRoute,
      targetPath: targetPath ?? this.targetPath,
      isWebOnly: isWebOnly ?? this.isWebOnly,
      score: score ?? this.score,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is SearchResult &&
          runtimeType == other.runtimeType &&
          id == other.id &&
          entityType == other.entityType;

  @override
  int get hashCode => id.hashCode ^ entityType.hashCode;
}

@immutable
class GlobalSearchResponse {
  final String query;
  final int total;
  final List<SearchResult> results;
  final Map<String, List<SearchResult>> grouped;

  const GlobalSearchResponse({
    required this.query,
    required this.total,
    required this.results,
    required this.grouped,
  });

  factory GlobalSearchResponse.fromJson(Map<String, dynamic> json, {String query = ''}) {
    final rawData = json['data'] is Map<String, dynamic> ? json['data'] as Map<String, dynamic> : json;
    final List<SearchResult> allResults = [];
    final Map<String, List<SearchResult>> groupedMap = {};

    for (final entityType in kSearchableEntityTypes) {
      final items = rawData[entityType] ?? rawData[_snakeCase(entityType)];
      if (items is List) {
        final list = items
            .whereType<Map<String, dynamic>>()
            .map((item) => SearchResult.fromJson(item))
            .toList();
        if (list.isNotEmpty) {
          groupedMap[entityType] = list;
          allResults.addAll(list);
        }
      }
    }

    final totalCount = rawData['totalResults'] as int? ??
        rawData['total_results'] as int? ??
        (json['pagination'] is Map ? (json['pagination']['totalResults'] ?? json['pagination']['total_results']) : null) ??
        allResults.length;

    return GlobalSearchResponse(
      query: query,
      total: totalCount,
      results: allResults,
      grouped: groupedMap,
    );
  }

  static String _snakeCase(String input) {
    return input.replaceAll('-', '_');
  }
}
