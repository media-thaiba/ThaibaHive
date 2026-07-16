import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/settings/data/settings_provider.dart';
import 'router.dart';
import 'theme.dart';

class ThaibaHiveApp extends ConsumerStatefulWidget {
  const ThaibaHiveApp({super.key});

  @override
  ConsumerState<ThaibaHiveApp> createState() => _ThaibaHiveAppState();
}

class _ThaibaHiveAppState extends ConsumerState<ThaibaHiveApp> {
  late final GoRouter _router;

  @override
  void initState() {
    super.initState();
    _router = buildRouter();
    _router.routerDelegate.addListener(_onRouteChange);
  }

  void _onRouteChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _router.routerDelegate.removeListener(_onRouteChange);
    _router.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = ref.watch(darkModeProvider);

    return MaterialApp.router(
      title: 'ThaibaHive',
      debugShowCheckedModeBanner: false,
      theme: ThaibaHiveTheme.light,
      darkTheme: ThaibaHiveTheme.dark,
      themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
      routerConfig: _router,
      builder: (context, child) {
        final theme = Theme.of(context);
        final isDarkMode = theme.brightness == Brightness.dark;
        final surfaceColor = theme.colorScheme.surface;
        final dividerColor = theme.dividerTheme.color ?? theme.dividerColor;

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: isDarkMode ? Brightness.light : Brightness.dark,
            statusBarBrightness: isDarkMode ? Brightness.dark : Brightness.light,
          ),
          child: Column(
            children: [
              Container(
                color: surfaceColor,
                child: SafeArea(
                  bottom: false,
                  child: const SizedBox.shrink(),
                ),
              ),
              Container(
                height: 1,
                color: dividerColor,
              ),
              Expanded(child: child ?? const SizedBox.shrink()),
            ],
          ),
        );
      },
    );
  }
}