import '../domain/academic_schedule_model.dart';
import '../services/schedule_cache_service.dart';

class AcademicSyncRepository {
  final ScheduleCacheService _cacheService;

  AcademicSyncRepository({ScheduleCacheService? cacheService})
      : _cacheService = cacheService ?? ScheduleCacheService();

  Future<List<MobileTimetableSlot>> syncSchedule({String? institutionId}) async {
    // Return sample timetable slots with substitution
    final slots = [
      const MobileTimetableSlot(
        slotId: 'slot-1',
        dayOfWeek: 1,
        slotOrder: 1,
        startTime: '09:00 AM',
        endTime: '09:50 AM',
        subjectName: 'Data Structures & Algorithms',
        teacherName: 'Prof. Zakariyya',
        roomNumber: 'Room 204',
      ),
      const MobileTimetableSlot(
        slotId: 'slot-2',
        dayOfWeek: 1,
        slotOrder: 2,
        startTime: '09:50 AM',
        endTime: '10:40 AM',
        subjectName: 'Computer Architecture',
        teacherName: 'Prof. Ameen (Substitute)',
        roomNumber: 'Room 204',
        isSubstitution: true,
        substituteTeacherName: 'Prof. Ameen',
      ),
      const MobileTimetableSlot(
        slotId: 'slot-3',
        dayOfWeek: 1,
        slotOrder: 3,
        startTime: '11:00 AM',
        endTime: '11:50 AM',
        subjectName: 'Database Systems',
        teacherName: 'Dr. Sarah',
        roomNumber: 'Lab 1',
      ),
    ];

    await _cacheService.cacheTimetable(slots);
    return slots;
  }

  Future<List<MobileTimetableSlot>> getCachedSchedule() async {
    return _cacheService.getCachedTimetable();
  }
}
