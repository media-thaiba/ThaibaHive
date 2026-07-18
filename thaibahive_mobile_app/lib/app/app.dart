import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/settings/data/settings_provider.dart';
import '../shared/widgets/offline_banner.dart';
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
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: [SystemUiOverlay.bottom],
    );
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

        // Get current path to check if we should show the global top status bar border/divider
        String currentPath = '';
        try {
          currentPath = _router.routerDelegate.currentConfiguration.uri.path;
        } catch (_) {}

        final bool isImmersiveRoute = currentPath == '/' || currentPath.startsWith('/auth');
        final bool isLoginPath = currentPath == '/auth/login';

        final overlayStyle = SystemUiOverlayStyle(
          statusBarColor: Colors.transparent,
          statusBarIconBrightness: (isDarkMode || isLoginPath) ? Brightness.light : Brightness.dark,
          statusBarBrightness: (isDarkMode || isLoginPath) ? Brightness.dark : Brightness.light,
          systemNavigationBarColor: isImmersiveRoute ? const Color(0xFF0E1012) : surfaceColor,
          systemNavigationBarIconBrightness: (isDarkMode || isLoginPath) ? Brightness.light : Brightness.dark,
        );

        return AnnotatedRegion<SystemUiOverlayStyle>(
          value: overlayStyle,
          child: Column(
            children: [
              const OfflineBanner(),
              Expanded(
                child: child ?? const SizedBox.shrink(),
              ),
            ],
          ),
        );
      },
    );
  }
}