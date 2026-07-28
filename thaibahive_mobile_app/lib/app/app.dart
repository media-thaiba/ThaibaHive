import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/data/auth_state.dart';
import '../features/auth/data/biometric_provider.dart';
import '../features/auth/presentation/biometric_lock_screen.dart';
import '../features/settings/data/settings_provider.dart';
import '../core/services/fcm_service.dart';
import '../shared/widgets/offline_banner.dart';
import 'router.dart';
import 'theme.dart';

class ThaibaHiveApp extends ConsumerStatefulWidget {
  const ThaibaHiveApp({super.key});

  @override
  ConsumerState<ThaibaHiveApp> createState() => _ThaibaHiveAppState();
}

class _ThaibaHiveAppState extends ConsumerState<ThaibaHiveApp> with WidgetsBindingObserver {
  late final GoRouter _router;
  bool _routeFlushed = false;
  ProviderSubscription<AuthState>? _deepLinkAuthListener;

  @visibleForTesting
  GoRouter get router => _router;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    SystemChrome.setEnabledSystemUIMode(
      SystemUiMode.manual,
      overlays: [SystemUiOverlay.bottom],
    );
    _router = buildRouter();
    _router.routerDelegate.addListener(_onRouteChange);

    // Flush any persisted deep-link route from a cold-start notification tap.
    // Fires once per session on first AuthStatus.authenticated transition.
    // The nested addPostFrameCallback ensures the _authGuard redirect has
    // already settled before we navigate to the notification target.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _deepLinkAuthListener = ref.listenManual<AuthState>(authProvider, (prev, next) {
        if (!_routeFlushed && next.status == AuthStatus.authenticated) {
          _routeFlushed = true;
          FCMService.flushBufferedRoute(_router);
        }
      });
      // Catch the case where auth is ALREADY authenticated by the time we subscribe
      // (fast local-storage restore) — listenManual won't fire for this.
      if (!_routeFlushed && ref.read(authProvider).status == AuthStatus.authenticated) {
        _routeFlushed = true;
        FCMService.flushBufferedRoute(_router);
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      ref.read(biometricLockProvider.notifier).onAppPaused();
    } else if (state == AppLifecycleState.resumed) {
      ref.read(biometricLockProvider.notifier).onAppResumed();
    }
  }

  void _onRouteChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _deepLinkAuthListener?.close();
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

        return Stack(
          children: [
            AnnotatedRegion<SystemUiOverlayStyle>(
              value: overlayStyle,
              child: Column(
                children: [
                  const OfflineBanner(),
                  Expanded(
                    child: child ?? const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
            Consumer(
              builder: (context, ref, _) {
                final isLocked = ref.watch(biometricLockProvider.select((s) => s.isLocked));
                if (!isLocked) return const SizedBox.shrink();
                return const BiometricLockScreenOverlay();
              },
            ),
          ],
        );
      },
    );
  }
}