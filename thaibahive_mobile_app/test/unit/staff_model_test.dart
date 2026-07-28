import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/models/staff_model.dart';

void main() {
  group('StaffModel.fromJson Tests', () {
    test('parses snake_case JSON format correctly', () {
      final json = {
        'id': 'staff-123',
        'email': 'john.doe@example.com',
        'employee_id': 'EMP001',
        'first_name': 'John',
        'last_name': 'Doe',
        'phone': '+1234567890',
        'designation': 'Senior Developer',
        'role': 'staff',
        'avatar_url': 'https://example.com/avatar.jpg',
        'is_active': true,
        'departments': [],
        'created_at': '2026-01-15T10:30:00.000Z',
        'updated_at': '2026-01-15T10:30:00.000Z',
      };

      final staff = StaffModel.fromJson(json);

      expect(staff.id, equals('staff-123'));
      expect(staff.email, equals('john.doe@example.com'));
      expect(staff.employeeId, equals('EMP001'));
      expect(staff.firstName, equals('John'));
      expect(staff.lastName, equals('Doe'));
      expect(staff.fullName, equals('John Doe'));
      expect(staff.initials, equals('JD'));
      expect(staff.isActive, isTrue);
    });

    test('parses camelCase JSON format correctly', () {
      final json = {
        'id': 'staff-456',
        'email': 'jane.smith@example.com',
        'employeeId': 'EMP002',
        'firstName': 'Jane',
        'lastName': 'Smith',
        'role': 'admin',
        'isActive': true,
        'departments': [],
        'createdAt': '2026-02-20T12:00:00.000Z',
        'updatedAt': '2026-02-20T12:00:00.000Z',
      };

      final staff = StaffModel.fromJson(json);

      expect(staff.id, equals('staff-456'));
      expect(staff.email, equals('jane.smith@example.com'));
      expect(staff.employeeId, equals('EMP002'));
      expect(staff.firstName, equals('Jane'));
      expect(staff.lastName, equals('Smith'));
      expect(staff.fullName, equals('Jane Smith'));
      expect(staff.role, equals('admin'));
    });

    test('handles missing optional fields and null dates gracefully', () {
      final json = <String, dynamic>{
        'id': 'staff-789',
        'email': 'test@example.com',
      };

      final staff = StaffModel.fromJson(json);

      expect(staff.id, equals('staff-789'));
      expect(staff.email, equals('test@example.com'));
      expect(staff.employeeId, isEmpty);
      expect(staff.firstName, isEmpty);
      expect(staff.lastName, isEmpty);
      expect(staff.role, equals('staff'));
      expect(staff.isActive, isTrue);
      expect(staff.createdAt, isA<DateTime>());
      expect(staff.updatedAt, isA<DateTime>());
    });
  });
}
