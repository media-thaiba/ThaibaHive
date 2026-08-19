import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../lib/features/approvals/screens/approval_list_screen.dart';
import '../lib/features/examinations/screens/hall_ticket_screen.dart';
import '../lib/features/parent_portal/screens/parent_dashboard_screen.dart';

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
      await tester.pumpAndSettle();

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
      await tester.pumpAndSettle();

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
      await tester.pumpAndSettle();

      expect(find.text('Enrolled Children'), findsOneWidget);
      expect(find.text('Parent Quick Actions'), findsOneWidget);
    });
  });
}
