import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:thaibahive_mobile/core/services/keyboard_shortcuts.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('GlobalKeyboardShortcuts Unit Tests', () {
    test('initializes and disposes cleanly', () {
      final navKey = GlobalKey<NavigatorState>();
      GlobalKeyboardShortcuts.initialize(navKey);
      GlobalKeyboardShortcuts.dispose();
    });

    test('openGlobalSearch does not crash when navigator context is null', () {
      final navKey = GlobalKey<NavigatorState>();
      GlobalKeyboardShortcuts.initialize(navKey);
      expect(() => GlobalKeyboardShortcuts.openGlobalSearch(), returnsNormally);
      GlobalKeyboardShortcuts.dispose();
    });
  });
}
