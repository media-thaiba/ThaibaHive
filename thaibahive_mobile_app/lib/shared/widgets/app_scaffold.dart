import 'package:flutter/material.dart';

import 'custom_app_bar.dart';
import 'error_widget.dart';
import 'loading_widget.dart';

class AppScaffold extends StatelessWidget {
  final String? title;
  final Widget body;
  final bool isLoading;
  final String? error;
  final VoidCallback? onRetry;
  final List<Widget>? actions;
  final bool showBack;
  final bool showNotification;
  final int notificationCount;
  final bool showSearch;
  final VoidCallback? onNotificationTap;
  final VoidCallback? onSearchTap;
  final Widget? floatingActionButton;
  final bool resizeToAvoidBottomInset;
  final Color? backgroundColor;
  final Widget? bottomNavigationBar;
  final Widget? drawer;
  final PreferredSizeWidget? bottom;

  const AppScaffold({
    super.key,
    this.title,
    required this.body,
    this.isLoading = false,
    this.error,
    this.onRetry,
    this.actions,
    this.showBack = true,
    this.showNotification = false,
    this.notificationCount = 0,
    this.showSearch = false,
    this.onNotificationTap,
    this.onSearchTap,
    this.floatingActionButton,
    this.resizeToAvoidBottomInset = true,
    this.backgroundColor,
    this.bottomNavigationBar,
    this.drawer,
    this.bottom,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget content;
    if (isLoading) {
      content = const PageShimmer();
    } else if (error != null) {
      content = AppErrorWidget(
        message: error!,
        onRetry: onRetry,
      );
    } else {
      content = body;
    }

    return Scaffold(
      backgroundColor: backgroundColor ?? theme.scaffoldBackgroundColor,
      appBar: title != null || showBack
          ? CustomAppBar(
              title: title,
              actions: actions,
              showBack: showBack,
              showNotification: showNotification,
              notificationCount: notificationCount,
              showSearch: showSearch,
              onNotificationTap: onNotificationTap,
              onSearchTap: onSearchTap,
              backgroundColor: theme.appBarTheme.backgroundColor,
              foregroundColor: theme.appBarTheme.foregroundColor,
              bottom: bottom,
            )
          : null,
      body: SafeArea(
        child: content,
      ),
      floatingActionButton: floatingActionButton,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
      bottomNavigationBar: bottomNavigationBar,
      drawer: drawer,
    );
  }
}
