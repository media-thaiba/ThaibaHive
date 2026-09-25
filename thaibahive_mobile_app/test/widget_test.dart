import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/features/approvals/screens/approval_list_screen.dart';
import 'package:thaibahive_mobile/features/examinations/screens/hall_ticket_screen.dart';
import 'package:thaibahive_mobile/features/parent_portal/screens/parent_dashboard_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Mobile Companion App Widget Tests', () {
    testWidgets('ApprovalListScreen renders title correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ApprovalListScreen(),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Pending Approvals'), findsOneWidget);
    });

    testWidgets('HallTicketScreen renders title correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: HallTicketScreen(),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Examination Hall Ticket'), findsOneWidget);
    });

    testWidgets('ParentDashboardScreen renders enrolled children label', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ParentDashboardScreen(),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 50));

      expect(find.text('Enrolled Children'), findsOneWidget);
      expect(find.text('Parent Quick Actions'), findsOneWidget);
    });
  });
}
