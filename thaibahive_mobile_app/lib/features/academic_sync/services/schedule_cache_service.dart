import 'dart:convert';
import '../domain/academic_schedule_model.dart';

class ScheduleCacheService {
  final Map<String, dynamic> _localMemoryCache = {};

  Future<void> cacheTimetable(List<MobileTimetableSlot> slots) async {
    final listJson = slots.map((s) => s.toJson()).toList();
    _localMemoryCache['cached_timetable'] = jsonEncode(listJson);
    _localMemoryCache['last_sync_time'] = DateTime.now().toIso8601String();
  }

  Future<List<MobileTimetableSlot>> getCachedTimetable() async {
    final raw = _localMemoryCache['cached_timetable'];
    if (raw == null) return [];
    final List decoded = jsonDecode(raw);
    return decoded.map((e) => MobileTimetableSlot.fromJson(e)).toList();
  }

  Future<String?> getLastSyncTime() async {
    return _localMemoryCache['last_sync_time'] as String?;
  }
}
