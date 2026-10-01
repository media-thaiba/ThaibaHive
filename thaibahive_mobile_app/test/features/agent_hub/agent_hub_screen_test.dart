import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/features/agent_hub/presentation/agent_hub_screen.dart';

void main() {
  group('AgentHubScreen Widget Tests (MOB-009)', () {
    testWidgets('renders tabs, app bar title, and domain agent cards', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: AgentHubScreen(),
          ),
        ),
      );

      // Verify App Bar Title & Tab headers
      expect(find.text('AIGENT-OS Cockpit'), findsOneWidget);
      expect(find.text('Approvals'), findsOneWidget);
      expect(find.text('Domain Fleet'), findsOneWidget);
      expect(find.text('Workflow Runs'), findsOneWidget);

      // Switch to Domain Fleet tab
      await tester.tap(find.text('Domain Fleet'));
      await tester.pumpAndSettle();

      expect(find.text('Autonomous Domain Agents'), findsOneWidget);
      expect(find.text('Academic Orchestrator'), findsOneWidget);
      expect(find.text('Finance Reconciliation'), findsOneWidget);
      expect(find.text('Perimeter Safety Agent'), findsOneWidget);
    });
  });
}
