import 'package:flutter/foundation.dart';
import 'package:hive_flutter/hive_flutter.dart';

class RecentSearchesService {
  static const String boxName = 'recent_searches';
  static const String _searchesKey = 'queries';
  static const int maxRecentSearches = 10;

  Box? _box;

  RecentSearchesService({Box? box}) : _box = box;

  bool get isInitialized => _box != null;

  Future<void> init({String? hiveHomePath, Box? injectedBox}) async {
    if (injectedBox != null) {
      _box = injectedBox;
      return;
    }
    if (_box != null) return;

    if (hiveHomePath != null) {
      Hive.init(hiveHomePath);
    } else {
      await Hive.initFlutter();
    }
    _box = await Hive.openBox(boxName);
  }

  List<String> getRecentSearches() {
    if (_box == null) return const [];
    final list = _box!.get(_searchesKey);
    if (list is List) {
      return list.map((e) => e.toString()).toList();
    }
    return const [];
  }

  Future<void> addSearch(String query) async {
    final trimmed = query.trim();
    if (trimmed.isEmpty) return;

    if (_box == null) await init();

    final current = getRecentSearches().toList();
    current.removeWhere((item) => item.toLowerCase() == trimmed.toLowerCase());
    current.insert(0, trimmed);

    if (current.length > maxRecentSearches) {
      current.removeRange(maxRecentSearches, current.length);
    }

    await _box!.put(_searchesKey, current);
  }

  Future<void> removeSearch(String query) async {
    if (_box == null) return;
    final current = getRecentSearches().toList();
    current.removeWhere((item) => item.toLowerCase() == query.trim().toLowerCase());
    await _box!.put(_searchesKey, current);
  }

  Future<void> clearRecentSearches() async {
    if (_box == null) return;
    await _box!.delete(_searchesKey);
  }
}

final recentSearchesService = RecentSearchesService();
