import 'package:flutter/material.dart';
import 'package:thaibahive_mobile/shared/screens/webview_handoff_screen.dart';

/// EmbeddedWorkspaceWebView - Displays a specific workspace URL in an embedded WebView
/// using the secure nonce-based auth handoff from WebViewHandoffScreen.
/// 
/// Rule 53: Uses /auth/mobile-handoff/nonce for token exchange.
/// Rule 94: Reads tokens from secure hardware storage via WebViewHandoffScreen.
class EmbeddedWorkspaceWebView extends StatelessWidget {
  final String role;
  final String? title;

  const EmbeddedWorkspaceWebView({
    super.key,
    required this.role,
    this.title,
  });

  String get _workspacePath => '/workspace/$role';

  @override
  Widget build(BuildContext context) {
    return WebViewHandoffScreen(
      targetPath: _workspacePath,
      title: title ?? _workspaceTitle,
    );
  }

  String get _workspaceTitle {
    switch (role) {
      case 'principal': return 'Principal Workspace';
      case 'teacher': return 'Teacher Workspace';
      case 'cashier': return 'Cashier Workspace';
      case 'parent': return 'Parent Workspace';
      default: return 'Workspace';
    }
  }
}
