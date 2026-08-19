import 'dart:convert';
import 'dart:io';
import 'package:hive/hive.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class PolicyManager {
  Box? _box;
  bool _isHiveInitialized = false;
  final Map<String, dynamic> _memoryFallback = {};
  
  static const String boxName = 'sync_policies_v1';
  static const String activePoliciesKey = 'active_policies';
  static const String timestampKey = 'last_fetched_timestamp';

  Future<void> init() async {
    try {
      _box = await Hive.openBox(boxName);
      _isHiveInitialized = true;
    } catch (_) {
      _isHiveInitialized = false;
    }
  }

  /// Get cached policy or null
  Map<String, dynamic>? getCachedPolicy() {
    if (_isHiveInitialized && _box != null) {
      final jsonStr = _box!.get(activePoliciesKey);
      if (jsonStr != null) {
        try {
          return jsonDecode(jsonStr) as Map<String, dynamic>;
        } catch (_) {}
      }
    } else {
      return _memoryFallback[activePoliciesKey];
    }
    return null;
  }

  /// Get last fetch timestamp or null
  DateTime? getLastFetchTime() {
    if (_isHiveInitialized && _box != null) {
      final tsStr = _box!.get(timestampKey);
      if (tsStr != null) {
        try {
          return DateTime.parse(tsStr);
        } catch (_) {}
      }
    } else {
      final tsStr = _memoryFallback[timestampKey] as String?;
      if (tsStr != null) {
        return DateTime.parse(tsStr);
      }
    }
    return null;
  }

  /// Check if cache is expired (24h TTL)
  bool isCacheExpired() {
    final lastFetch = getLastFetchTime();
    if (lastFetch == null) return true;
    return DateTime.now().difference(lastFetch).inHours >= 24;
  }

  /// Save policy to cache
  Future<void> savePolicyToCache(Map<String, dynamic> policy) async {
    final jsonStr = jsonEncode(policy);
    final tsStr = DateTime.now().toIso8601String();
    if (_isHiveInitialized && _box != null) {
      await _box!.put(activePoliciesKey, jsonStr);
      await _box!.put(timestampKey, tsStr);
    } else {
      _memoryFallback[activePoliciesKey] = policy;
      _memoryFallback[timestampKey] = tsStr;
    }
  }

  /// Fetch active policies from server
  Future<Map<String, dynamic>> fetchPoliciesFromServer(String baseUrl, String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/mobile/v1/sync/policies'),
      headers: {
        'Authorization': 'Bearer $token',
        'Content-Type': 'application/json',
      },
    ).timeout(const Duration(seconds: 10));

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data is Map<String, dynamic>) {
        await savePolicyToCache(data);
        return data;
      }
    }
    throw HttpException('Failed to fetch policies: ${response.statusCode}');
  }
}
