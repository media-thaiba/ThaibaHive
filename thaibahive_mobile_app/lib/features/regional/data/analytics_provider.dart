import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/core/network/providers.dart';

class AnalyticsState {
  final bool isLoading;
  final String? error;
  final Map<String, dynamic>? data;
  final String activeType;

  const AnalyticsState({
    this.isLoading = false,
    this.error,
    this.data,
    this.activeType = 'attendance',
  });

  AnalyticsState copyWith({
    bool? isLoading,
    String? error,
    Map<String, dynamic>? data,
    String? activeType,
  }) {
    return AnalyticsState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      data: data ?? this.data,
      activeType: activeType ?? this.activeType,
    );
  }
}

class AnalyticsNotifier extends StateNotifier<AnalyticsState> {
  final Dio _client;
  static const String _cacheBoxName = 'mobile_analytics_cache';

  AnalyticsNotifier(this._client) : super(const AnalyticsState()) {
    _loadCached();
    fetchAnalytics('attendance');
  }

  Future<void> _loadCached() async {
    try {
      final box = await Hive.openBox<String>(_cacheBoxName);
      final cached = box.get('analytics_${state.activeType}');
      if (cached != null && state.data == null) {
        final data = jsonDecode(cached) as Map<String, dynamic>;
        state = state.copyWith(data: data);
      }
    } catch (_) {}
  }

  Future<void> fetchAnalytics(String type) async {
    // Attempt offline loading first
    try {
      final box = await Hive.openBox<String>(_cacheBoxName);
      final cached = box.get('analytics_$type');
      if (cached != null) {
        final data = jsonDecode(cached) as Map<String, dynamic>;
        state = state.copyWith(data: data, activeType: type);
      }
    } catch (_) {}

    state = state.copyWith(isLoading: true, error: null, activeType: type);
    try {
      final response = await _client.get('/analytics', queryParameters: {
        'type': type,
      });

      if (response.data != null && response.data is Map<String, dynamic>) {
        final Map<String, dynamic> responseMap = response.data as Map<String, dynamic>;
        final Map<String, dynamic>? dataContent = responseMap['data'] as Map<String, dynamic>?;
        
        final resolvedData = dataContent ?? responseMap;
        
        state = state.copyWith(
          isLoading: false,
          data: resolvedData,
        );

        // Cache the parsed response map
        final box = await Hive.openBox<String>(_cacheBoxName);
        await box.put('analytics_$type', jsonEncode(resolvedData));
      } else {
        throw Exception('Invalid response format');
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to retrieve analytics data: $e',
      );
    }
  }

  // FCM push events integration
  Future<void> onPushNotificationReceived(Map<String, dynamic> payload) async {
    final String? eventType = payload['eventType'] as String?;
    final String? targetType = payload['analyticsType'] as String?; // e.g. "attendance", "finance", "academics"

    if (eventType == 'ANALYTICS_CACHE_INVALIDATED') {
      final box = await Hive.openBox<String>(_cacheBoxName);
      if (targetType != null) {
        await box.delete('analytics_$targetType');
        if (state.activeType == targetType) {
          fetchAnalytics(targetType);
        }
      } else {
        await box.clear();
        fetchAnalytics(state.activeType);
      }
    }
  }
}

final analyticsStateProvider =
    StateNotifierProvider<AnalyticsNotifier, AnalyticsState>((ref) {
  return AnalyticsNotifier(ref.watch(dioProvider));
});
