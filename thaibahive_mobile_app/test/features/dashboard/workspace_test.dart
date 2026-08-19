import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/material.dart';
import 'package:thaibahive_mobile/features/dashboard/data/workspace_provider.dart';
import 'package:thaibahive_mobile/features/dashboard/presentation/screens/principal_workspace_screen.dart';
import 'package:thaibahive_mobile/features/dashboard/presentation/screens/teacher_workspace_screen.dart';
import 'package:thaibahive_mobile/features/dashboard/presentation/screens/cashier_workspace_screen.dart';
import 'package:thaibahive_mobile/features/dashboard/presentation/screens/parent_workspace_screen.dart';

class FakeWorkspaceNotifier extends WorkspaceNotifier {
  FakeWorkspaceNotifier(super.ref, WorkspaceState fakeState) {
    state = fakeState;
  }

  @override
  Future<void> fetchWorkspaceData() async {
    // No-op for tests to prevent actual HTTP queries
  }
}

void main() {
  group('WorkspaceState Unit Tests', () {
    test('initial state has isLoading false and null properties', () {
      const state = WorkspaceState();
      expect(state.isLoading, false);
      expect(state.data, null);
      expect(state.error, null);
    });

    test('copyWith correctly updates state fields', () {
      const state = WorkspaceState();
      final updated = state.copyWith(isLoading: true, error: 'Connection Error');
      expect(updated.isLoading, true);
      expect(updated.error, 'Connection Error');
      expect(updated.data, null);
    });
  });

  group('Workspace Screens UI Component Tests', () {
    testWidgets('PrincipalWorkspaceScreen renders title and loading state', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workspaceStateProvider.overrideWith(
              (ref) => FakeWorkspaceNotifier(ref, const WorkspaceState(isLoading: true)),
            ),
          ],
          child: const MaterialApp(
            home: PrincipalWorkspaceScreen(),
          ),
        ),
      );

      expect(find.text('Principal Workspace'), findsOneWidget);
      expect(find.byType(RefreshIndicator), findsOneWidget);
    });

    testWidgets('TeacherWorkspaceScreen renders correct title', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workspaceStateProvider.overrideWith(
              (ref) => FakeWorkspaceNotifier(ref, const WorkspaceState(isLoading: false)),
            ),
          ],
          child: const MaterialApp(
            home: TeacherWorkspaceScreen(),
          ),
        ),
      );

      expect(find.text('Teacher Workspace'), findsOneWidget);
    });

    testWidgets('CashierWorkspaceScreen renders correct title', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workspaceStateProvider.overrideWith(
              (ref) => FakeWorkspaceNotifier(ref, const WorkspaceState(isLoading: false)),
            ),
          ],
          child: const MaterialApp(
            home: CashierWorkspaceScreen(),
          ),
        ),
      );

      expect(find.text('Cashier Workspace'), findsOneWidget);
    });

    testWidgets('ParentWorkspaceScreen renders correct title', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            workspaceStateProvider.overrideWith(
              (ref) => FakeWorkspaceNotifier(ref, const WorkspaceState(isLoading: false)),
            ),
          ],
          child: const MaterialApp(
            home: ParentWorkspaceScreen(),
          ),
        ),
      );

      expect(find.text('Parent Workspace'), findsOneWidget);
    });
  });
}
