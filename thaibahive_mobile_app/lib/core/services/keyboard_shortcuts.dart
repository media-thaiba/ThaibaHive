import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../features/search/presentation/search_bottom_sheet.dart';

class GlobalKeyboardShortcuts {
  static GlobalKey<NavigatorState>? _navigatorKey;
  static bool _handlerRegistered = false;
  static bool _isSearchOpen = false;

  static void initialize(GlobalKey<NavigatorState> navigatorKey) {
    _navigatorKey = navigatorKey;
    if (!_handlerRegistered) {
      HardwareKeyboard.instance.addHandler(_handleKeyEvent);
      _handlerRegistered = true;
    }
  }

  static void dispose() {
    if (_handlerRegistered) {
      HardwareKeyboard.instance.removeHandler(_handleKeyEvent);
      _handlerRegistered = false;
    }
  }

  static bool _handleKeyEvent(KeyEvent event) {
    if (event is! KeyDownEvent) return false;

    final isMetaOrCtrl = HardwareKeyboard.instance.isControlPressed ||
        HardwareKeyboard.instance.isMetaPressed;

    if (isMetaOrCtrl && event.logicalKey == LogicalKeyboardKey.keyK) {
      openGlobalSearch();
      return true;
    }

    return false;
  }

  static void openGlobalSearch() {
    final context = _navigatorKey?.currentContext;
    if (context != null && !_isSearchOpen) {
      _isSearchOpen = true;
      SearchBottomSheet.show(context).then((_) {
        _isSearchOpen = false;
      });
    }
  }
}
