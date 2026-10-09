import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:hive/hive.dart';
import 'package:thaibahive_mobile/features/search/data/recent_searches_service.dart';

void main() {
  late Directory tempDir;
  late RecentSearchesService service;

  setUp(() async {
    tempDir = await Directory.systemTemp.createTemp('recent_searches_test_');
    service = RecentSearchesService();
    await service.init(hiveHomePath: tempDir.path);
  });

  tearDown(() async {
    await Hive.close();
    if (await tempDir.exists()) {
      await tempDir.delete(recursive: true);
    }
  });

  test('starts with empty recent searches', () {
    expect(service.getRecentSearches(), isEmpty);
  });

  test('adds query to front of recent searches', () async {
    await service.addSearch('John');
    await service.addSearch('Biology');

    final recents = service.getRecentSearches();
    expect(recents, equals(['Biology', 'John']));
  });

  test('deduplicates case-insensitively and moves to top', () async {
    await service.addSearch('John');
    await service.addSearch('Physics');
    await service.addSearch('john');

    final recents = service.getRecentSearches();
    expect(recents, equals(['john', 'Physics']));
  });

  test('caps at 10 items FIFO', () async {
    for (int i = 1; i <= 15; i++) {
      await service.addSearch('Query $i');
    }

    final recents = service.getRecentSearches();
    expect(recents.length, equals(10));
    expect(recents.first, equals('Query 15'));
    expect(recents.last, equals('Query 6'));
  });

  test('removes specific query', () async {
    await service.addSearch('Math');
    await service.addSearch('Science');
    await service.removeSearch('Math');

    final recents = service.getRecentSearches();
    expect(recents, equals(['Science']));
  });

  test('clears all recent searches', () async {
    await service.addSearch('Math');
    await service.addSearch('Science');
    await service.clearRecentSearches();

    expect(service.getRecentSearches(), isEmpty);
  });
}
