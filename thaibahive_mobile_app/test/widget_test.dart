import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:thaibahive_mobile/app/app.dart';

void main() {
  testWidgets('App renders and mounts successfully smoke test', (WidgetTester tester) async {
    // Build our app wrapped in ProviderScope and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: ThaibaHiveApp(),
      ),
    );

    // Verify that the main ThaibaHiveApp widget is mounted successfully.
    expect(find.byType(ThaibaHiveApp), findsOneWidget);
  });
}
