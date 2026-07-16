class PaginatedResponse<T> {
  final List<T> data;
  final int total;
  final int page;
  final int limit;
  final int totalPages;

  const PaginatedResponse({
    required this.data,
    required this.total,
    required this.page,
    required this.limit,
    required this.totalPages,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) =>
      PaginatedResponse(
        data: (json['data'] as List<dynamic>)
            .map((e) => fromJsonT(e as Map<String, dynamic>))
            .toList(),
        total: json['total'] as int,
        page: json['page'] as int,
        limit: json['limit'] as int,
        totalPages: json['total_pages'] as int,
      );

  Map<String, dynamic> toJson(Map<String, dynamic> Function(T) toJsonT) => {
        'data': data.map((e) => toJsonT(e)).toList(),
        'total': total,
        'page': page,
        'limit': limit,
        'total_pages': totalPages,
      };

  PaginatedResponse<T> copyWith({
    List<T>? data,
    int? total,
    int? page,
    int? limit,
    int? totalPages,
  }) =>
      PaginatedResponse(
        data: data ?? this.data,
        total: total ?? this.total,
        page: page ?? this.page,
        limit: limit ?? this.limit,
        totalPages: totalPages ?? this.totalPages,
      );
}
