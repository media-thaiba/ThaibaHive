import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/sync/conflict_resolver.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('MOB-004: Conflict Resolution & Last-Write-Wins E2E Tests', () {
    late ConflictResolver resolver;

    setUp(() {
      resolver = ConflictResolver();
    });

    test('LWW merges favoring newer local timestamp when local is newer', () {
      final localData = {
        'id': 'stf_001',
        'status': 'PRESENT',
        'checkInTime': '2026-08-19T08:30:00.000Z',
        'notes': 'Checked in via NFC card',
      };

      final serverData = {
        'id': 'stf_001',
        'status': 'ABSENT',
        'checkInTime': '2026-08-19T08:00:00.000Z',
        'notes': 'Default morning status',
      };

      final merged = resolver.mergeLWW(
        localData: localData,
        serverData: serverData,
        localTimestamp: '2026-08-19T08:30:00.000Z',
        serverTimestamp: '2026-08-19T08:00:00.000Z',
      );

      expect(merged['status'], equals('PRESENT'));
      expect(merged['notes'], equals('Checked in via NFC card'));
    });

    test('LWW merges favoring newer server timestamp when server is newer', () {
      final localData = {
        'id': 'vch_999',
        'approvalStatus': 'PENDING_HOD',
        'amount': 5000,
      };

      final serverData = {
        'id': 'vch_999',
        'approvalStatus': 'REJECTED',
        'amount': 5000,
        'rejectionReason': 'Exceeds budget cap',
      };

      final merged = resolver.mergeLWW(
        localData: localData,
        serverData: serverData,
        localTimestamp: '2026-08-19T09:00:00.000Z',
        serverTimestamp: '2026-08-19T09:15:00.000Z',
      );

      expect(merged['approvalStatus'], equals('REJECTED'));
      expect(merged['rejectionReason'], equals('Exceeds budget cap'));
    });

    test('LWW handles identical timestamps by prioritizing local state', () {
      final localData = {'val': 'local'};
      final serverData = {'val': 'server'};

      final merged = resolver.mergeLWW(
        localData: localData,
        serverData: serverData,
        localTimestamp: '2026-08-19T10:00:00.000Z',
        serverTimestamp: '2026-08-19T10:00:00.000Z',
      );

      expect(merged['val'], equals('local'));
    });
  });
}
