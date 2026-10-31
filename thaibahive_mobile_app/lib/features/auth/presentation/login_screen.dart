import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:thaibahive_mobile/app/theme.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/services/logger_service.dart';
import 'package:thaibahive_mobile/core/services/passkey_service.dart';
import 'package:thaibahive_mobile/core/extensions.dart';
import 'package:thaibahive_mobile/shared/widgets/th_input.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';

enum AuthMode { signIn, signUp, google, passkey, forgotPassword }

/// Vector Painter for the authentic 4-color Google "G" logo
class _GoogleLogoPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double scale = size.width / 24.0;
    canvas.save();
    canvas.scale(scale, scale);

    // Blue
    final bluePath = Path()
      ..moveTo(23.74, 12.27)
      ..cubicTo(23.74, 11.48, 23.67, 10.73, 23.55, 10.0)
      ..lineTo(12.0, 10.0)
      ..lineTo(12.0, 14.51)
      ..lineTo(18.59, 14.51)
      ..cubicTo(18.31, 16.02, 17.45, 17.3, 16.16, 18.16)
      ..lineTo(16.16, 21.24)
      ..lineTo(20.09, 21.24)
      ..cubicTo(22.39, 19.12, 23.74, 15.99, 23.74, 12.27)
      ..close();
    canvas.drawPath(bluePath, Paint()..color = const Color(0xFF4285F4)..style = PaintingStyle.fill);

    // Green
    final greenPath = Path()
      ..moveTo(12.0, 24.0)
      ..cubicTo(15.24, 24.0, 17.96, 22.92, 19.95, 21.08)
      ..lineTo(16.02, 18.0)
      ..cubicTo(14.93, 18.73, 13.56, 19.16, 12.0, 19.16)
      ..cubicTo(8.87, 19.16, 6.22, 17.04, 5.27, 14.19)
      ..lineTo(1.22, 14.19)
      ..lineTo(1.22, 17.33)
      ..cubicTo(3.22, 21.31, 7.29, 24.0, 12.0, 24.0)
      ..close();
    canvas.drawPath(greenPath, Paint()..color = const Color(0xFF34A853)..style = PaintingStyle.fill);

    // Yellow
    final yellowPath = Path()
      ..moveTo(5.27, 14.29)
      ..cubicTo(5.03, 13.57, 4.9, 12.8, 4.9, 12.0)
      ..cubicTo(4.9, 11.2, 5.03, 10.43, 5.27, 9.71)
      ..lineTo(5.27, 6.57)
      ..lineTo(1.22, 6.57)
      ..cubicTo(0.44, 8.12, 0.0, 9.99, 0.0, 12.0)
      ..cubicTo(0.0, 14.01, 0.44, 15.88, 1.22, 17.43)
      ..lineTo(5.27, 14.29)
      ..close();
    canvas.drawPath(yellowPath, Paint()..color = const Color(0xFFFBBC05)..style = PaintingStyle.fill);

    // Red
    final redPath = Path()
      ..moveTo(12.0, 4.75)
      ..cubicTo(13.77, 4.75, 15.35, 5.36, 16.6, 6.55)
      ..lineTo(20.03, 3.12)
      ..cubicTo(17.95, 1.19, 15.23, 0.0, 12.0, 0.0)
      ..cubicTo(7.29, 0.0, 3.22, 2.69, 1.22, 6.67)
      ..lineTo(5.27, 9.81)
      ..cubicTo(6.22, 6.96, 8.87, 4.75, 12.0, 4.75)
      ..close();
    canvas.drawPath(redPath, Paint()..color = const Color(0xFFEA4335)..style = PaintingStyle.fill);

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _GoogleLogo extends StatelessWidget {
  final double size;
  const _GoogleLogo({this.size = 20});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _GoogleLogoPainter(),
      ),
    );
  }
}

class LoginScreen extends ConsumerStatefulWidget {
  final String? initialMode;
  final String? redirect;
  const LoginScreen({super.key, this.initialMode, this.redirect});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  // Controllers
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  // Sign up fields controllers
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _employeeIdController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // Forgot password controllers
  final _emailForgotController = TextEditingController();

  AuthMode _currentMode = AuthMode.signIn;
  bool _recoverySent = false;
  bool _rememberMe = true;
  String? _lastAuthError;
  bool _isSubmittingReset = false;

  @override
  void initState() {
    super.initState();
    if (widget.initialMode == 'signup') {
      _currentMode = AuthMode.signUp;
    } else if (widget.initialMode == 'google') {
      _currentMode = AuthMode.google;
    } else if (widget.initialMode == 'forgot') {
      _currentMode = AuthMode.forgotPassword;
    } else {
      _currentMode = AuthMode.signIn;
    }
    _loadSavedCredentials();
  }

  Future<void> _loadSavedCredentials() async {
    const storage = FlutterSecureStorage();
    final savedEmail = await storage.read(key: 'saved_email');
    final rememberMe = await storage.read(key: 'remember_me');
    if (mounted) {
      setState(() {
        if (savedEmail != null && savedEmail.isNotEmpty) {
          _emailController.text = savedEmail;
        }
        if (rememberMe != null) {
          _rememberMe = rememberMe == 'true';
        }
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _firstNameController.dispose();
    _lastNameController.dispose();
    _employeeIdController.dispose();
    _confirmPasswordController.dispose();
    _emailForgotController.dispose();
    super.dispose();
  }

  // Validators
  String? _validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) return 'Email is required';
    if (!value.trim().isEmail) return 'Enter a valid email address';
    return null;
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  }

  String? _validateRequired(String? value, String field) {
    if (value == null || value.trim().isEmpty) return '$field is required';
    return null;
  }

  // Submission Handlers
  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;
    logger.info('[LoginScreen] User submitted login credentials for: ${_emailController.text.trim()} (rememberMe: $_rememberMe)');
    await ref.read(authProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
          rememberMe: _rememberMe,
        );
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match')),
      );
      return;
    }
    logger.info('[LoginScreen] User submitted signup request for: ${_emailController.text.trim()}');
    await ref.read(authProvider.notifier).signup({
      'first_name': _firstNameController.text.trim(),
      'last_name': _lastNameController.text.trim(),
      'email': _emailController.text.trim(),
      'employee_id': _employeeIdController.text.trim(),
      'phone': null,
      'password': _passwordController.text,
    });
  }

  String _explainGoogleCode(int? code) => switch (code) {
        10 => 'DEVELOPER_ERROR (Code 10):\n'
            'Package name "com.thaiba.hive" and SHA-1 certificate fingerprint are not matched by an Android OAuth Client ID in this Google Cloud project.\n'
            'Note: If installed via Play Store, you must register the Play App Signing SHA-1, not the upload key.',
        12500 => 'SIGN_IN_FAILED (Code 12500):\n'
            'OAuth Consent Screen in Google Cloud Console is in "Testing" mode and this email is NOT listed under Test Users, or Support Email is missing in GCP, or Google Play Services needs updating.',
        12501 => 'SIGN_IN_CANCELLED (Code 12501):\n'
            'User dismissed the account picker or flow was cancelled.',
        12502 => 'SIGN_IN_CURRENTLY_IN_PROGRESS (Code 12502):\n'
            'Duplicate signIn() call already in progress.',
        7 => 'NETWORK_ERROR (Code 7):\n'
            'No network connectivity to Google authentication services.',
        8 => 'INTERNAL_ERROR (Code 8):\n'
            'Transient Google Play Services internal error.',
        _ => 'Unrecognised Google Play Services status code: $code',
      };

  Map<String, dynamic>? _decodeJwt(String jwt) {
    try {
      final p = jwt.split('.')[1];
      return jsonDecode(utf8.decode(base64Url.decode(base64Url.normalize(p))));
    } catch (_) {
      return null;
    }
  }

  String _maskEmail(String? email) {
    if (email == null || !email.contains('@')) return '***';
    final parts = email.split('@');
    final user = parts[0];
    final domain = parts[1];
    final maskedUser = user.length > 2 ? '${user[0]}***${user[user.length - 1]}' : '${user[0]}***';
    return '$maskedUser@$domain';
  }

  Future<void> _showGoogleDiag(String stage, String detail) async {
    if (!mounted) return;
    if (!kDebugMode) {
      // In production release builds, never leak internal traces/claims to end users.
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Google Sign-In was unable to complete. Please try again or use your password.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.error_outline_rounded, color: Colors.red),
            SizedBox(width: 8),
            Expanded(
              child: Text('Authentication Notice', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Something went wrong while completing Google sign-in. '
                'Please try again, or use your email and password instead.',
                style: Theme.of(ctx).textTheme.bodyMedium,
              ),
              const SizedBox(height: 12),
              Text(
                'Issue: $stage',
                style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                      color: Theme.of(ctx).colorScheme.onSurfaceVariant,
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                childrenPadding: const EdgeInsets.only(bottom: 8),
                title: Text(
                  'Technical diagnostics',
                  style: Theme.of(ctx).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                        color: Theme.of(ctx).colorScheme.onSurfaceVariant,
                      ),
                ),
                children: [
                  SelectableText(
                    detail,
                    style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.copy_rounded, size: 16),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: '[$stage]\n$detail'));
              ScaffoldMessenger.of(ctx).showSnackBar(
                const SnackBar(content: Text('Diagnostics copied to clipboard')),
              );
            },
            label: const Text('Copy'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleGoogleLogin() async {
    logger.info('[LoginScreen] User clicked "Continue with Google"');
    var stage = 'Initialization';
    if (!AppConstants.isGoogleSignInConfigured && !kDebugMode) {
      await _showGoogleDiag(stage, 'Google Sign-In is not configured for this build.');
      return;
    }
    try {
      final clientId = AppConstants.googleWebClientId;
      logger.info('[LoginScreen] Initializing GoogleSignIn with serverClientId: $clientId');
      final googleSignIn = GoogleSignIn(
        scopes: ['email', 'profile'],
        serverClientId: clientId.isNotEmpty ? clientId : null,
      );
      try {
        await googleSignIn.signOut();
      } catch (_) {}

      stage = 'Stage 1: Google Account Picker';
      logger.info('[LoginScreen] Displaying Google Account Picker...');
      final account = await googleSignIn.signIn();
      if (account == null) {
        logger.info('[LoginScreen] Google Sign-In was cancelled or dismissed by user.');
        return;
      }

      stage = 'Stage 2: Fetch Tokens';
      logger.info('[LoginScreen] Google account chosen: ${_maskEmail(account.email)}. Fetching auth tokens...');
      final authDetails = await account.authentication;
      final idToken = authDetails.idToken;
      if (idToken == null || idToken.isEmpty) {
        logger.error('[LoginScreen] Google Sign-In returned null or empty idToken.');
        await _showGoogleDiag(
          stage,
          'idToken is null or empty.\n'
          'Account: ${_maskEmail(account.email)}\n'
          'Possible Cause: Android OAuth client SHA-1 does not match the active APK signing key, or serverClientId is incorrect.',
        );
        return;
      }

      final claims = _decodeJwt(idToken);
      logger.info('[LoginScreen] Obtained Google ID token. aud=${claims?['aud']}, azp=${claims?['azp']}, email=${_maskEmail(claims?['email'])}');

      stage = 'Stage 3: Backend Authentication (/api/auth/google)';
      _lastAuthError = null;
      logger.info('[LoginScreen] Federating token with backend...');
      await ref.read(authProvider.notifier).loginWithGoogle(idToken);

      final authState = ref.read(authProvider);
      if (authState.status == AuthStatus.error) {
        await _showGoogleDiag(
          stage,
          'Backend returned error: ${authState.errorMessage ?? _lastAuthError ?? "Authentication failed"}\n\n'
          'Token Claims:\n'
          'aud: ${claims?['aud']}\n'
          'azp: ${claims?['azp']}\n'
          'email: ${claims?['email']}\n'
          'email_verified: ${claims?['email_verified']}\n'
          'hd (Workspace Domain): ${claims?['hd']}',
        );
      }
    } on PlatformException catch (e, stack) {
      logger.error('[LoginScreen] Google Sign-In PlatformException at $stage: $e', e, stack);
      final m = RegExp(r'ApiException:\s*(\d+)').firstMatch('${e.message}');
      final code = m != null ? int.tryParse(m.group(1)!) : null;
      final explanation = _explainGoogleCode(code);
      await _showGoogleDiag(
        stage,
        'PlatformException:\n'
        'code: ${e.code}\n'
        'message: ${e.message}\n'
        'details: ${e.details}\n\n'
        '→ $explanation\n\n'
        'Raw: $e',
      );
    } catch (e, stack) {
      logger.error('[LoginScreen] Google Sign-In exception at $stage: $e', e, stack);
      await _showGoogleDiag(
        stage,
        'Exception:\n$e\n\nStack:\n$stack',
      );
    }
  }

  Future<void> _handlePasskeyLogin() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      logger.warning('[LoginScreen] User tapped passkey without entering email.');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your email above before using Passkey.'),
          backgroundColor: Colors.amber,
        ),
      );
      return;
    }
    logger.info('[LoginScreen] Checking passkey availability for $email...');
    final passkeyService = PasskeyService();
    final available = await passkeyService.isAvailable();
    if (!available) {
      logger.warning('[LoginScreen] Passkey hardware/service is not available on this device.');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Passkey is not available on this device. Use password or Google Sign-In.'),
            backgroundColor: Colors.amber,
          ),
        );
      }
      return;
    }
    logger.info('[LoginScreen] Initiating loginWithPasskey for $email...');
    await ref.read(authProvider.notifier).loginWithPasskey(email);
  }

  Future<void> _handleForgotPassword() async {
    if (_isSubmittingReset) return;
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _recoverySent = false;
      _isSubmittingReset = true;
    });
    try {
      await ref
          .read(authProvider.notifier)
          .requestPasswordReset(_emailForgotController.text.trim());
      if (mounted) {
        setState(() {
          _recoverySent = true;
          _isSubmittingReset = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmittingReset = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to send reset link: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  void _changeMode(AuthMode mode) {
    if (ref.read(authProvider).status == AuthStatus.loading || _isSubmittingReset) return;
    setState(() {
      if (mode == AuthMode.forgotPassword &&
          _emailForgotController.text.trim().isEmpty &&
          _emailController.text.trim().isNotEmpty) {
        _emailForgotController.text = _emailController.text.trim();
      }
      _currentMode = mode;
      _recoverySent = false;
      _formKey.currentState?.reset();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;

    ref.listen<AuthState>(authProvider, (previous, next) {
      if (next.status == AuthStatus.authenticated) {
        final dest = widget.redirect;
        if (dest != null && dest.isNotEmpty && dest.startsWith('/')) {
          context.go(dest);
        } else {
          context.go('/today');
        }
      } else if (next.status == AuthStatus.error && next.errorMessage != null) {
        _lastAuthError = next.errorMessage;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(next.errorMessage!),
            backgroundColor: theme.colorScheme.error,
          ),
        );
        ref.read(authProvider.notifier).clearError();
      }
    });

    // Card Colors & Dimensions
    final cardBg = isDark ? const Color(0xFF1E2633) : Colors.white;
    final cardBorder = isDark ? const Color(0xFF334155).withValues(alpha: 0.5) : const Color(0xFFE2E8F0);
    final titleColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subtitleColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    return Scaffold(
      body: Container(
        width: double.infinity,
        height: double.infinity,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: isDark
                ? const [
                    Color(0xFF0F172A),
                    Color(0xFF131D31),
                    Color(0xFF0A0F1D),
                  ]
                : const [
                    Color(0xFFE8F1FC),
                    Color(0xFFF3F7FC),
                    Color(0xFFF8FAFD),
                  ],
          ),
        ),
        child: SafeArea(
          child: Stack(
            children: [
              // Discreet Top Diagnostics Link
              Positioned(
                top: 8,
                right: 12,
                child: IconButton(
                  icon: Icon(
                    Icons.analytics_outlined,
                    color: isDark ? Colors.white38 : const Color(0xFF94A3B8),
                    size: 20,
                  ),
                  tooltip: 'Diagnostics & Logs',
                  onPressed: () => context.push('/auth/diagnostics'),
                ),
              ),

              // Scrollable Centered Content
              Center(
                child: SingleChildScrollView(
                  physics: const ClampingScrollPhysics(),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // MediaHive Benchmark Top Branding
                      Image.asset(
                        'assets/images/thl_logo_3d.png',
                        width: 76,
                        height: 76,
                        fit: BoxFit.contain,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'ThaibaHive',
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontSize: 28,
                          fontWeight: FontWeight.w800,
                          letterSpacing: -0.5,
                          color: isDark ? Colors.white : const Color(0xFF1E293B),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'SECURE COMMAND CENTER',
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 2.2,
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Floating Card (MediaHive standard 24dp radius + diffuse shadow)
                      Container(
                        width: double.infinity,
                        constraints: const BoxConstraints(maxWidth: 420),
                        decoration: BoxDecoration(
                          color: cardBg,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: cardBorder, width: 1.0),
                          boxShadow: AppShadows.card(Colors.black),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
                        child: Form(
                          key: _formKey,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Card Inner Header
                              Text(
                                _getCardTitle(),
                                style: TextStyle(
                                  fontFamily: 'PlusJakartaSans',
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: titleColor,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _getCardSubtitle(),
                                style: TextStyle(
                                  fontFamily: 'PlusJakartaSans',
                                  fontSize: 13,
                                  color: subtitleColor,
                                ),
                              ),
                              const SizedBox(height: 22),

                              // Form Contents
                              AnimatedSwitcher(
                                duration: const Duration(milliseconds: 250),
                                switchInCurve: Curves.easeIn,
                                switchOutCurve: Curves.easeOut,
                                transitionBuilder: (Widget child, Animation<double> animation) {
                                  return FadeTransition(
                                    opacity: animation,
                                    child: SlideTransition(
                                      position: Tween<Offset>(
                                        begin: const Offset(0.04, 0.0),
                                        end: Offset.zero,
                                      ).animate(animation),
                                      child: child,
                                    ),
                                  );
                                },
                                child: _buildActiveForm(context, isLoading, isDark),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Outside Card: Registration Switch & Tagline
                      const SizedBox(height: 20),
                      _buildBottomSwitch(isDark, isLoading),
                      const SizedBox(height: 28),
                      Text(
                        'POWERED BY THAIBA GARDEN MEDIA & IT DEPARTMENT',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _getCardTitle() {
    switch (_currentMode) {
      case AuthMode.signIn:
        return 'Sign In';
      case AuthMode.signUp:
        return 'Create Profile';
      case AuthMode.google:
        return 'Google Federation';
      case AuthMode.passkey:
        return 'Passkey Authentication';
      case AuthMode.forgotPassword:
        return 'Password Assistance';
    }
  }

  String _getCardSubtitle() {
    switch (_currentMode) {
      case AuthMode.signIn:
        return 'Enter your credentials to continue';
      case AuthMode.signUp:
        return 'Enter your staff details to activate your account';
      case AuthMode.google:
        return 'Authenticate with your verified Google account';
      case AuthMode.passkey:
        return 'Authenticate via biometric sensor or screen lock';
      case AuthMode.forgotPassword:
        return 'Enter your registered email for password recovery';
    }
  }

  Widget _buildBottomSwitch(bool isDark, bool isLoading) {
    if (_currentMode == AuthMode.signIn) {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'New User? ',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          GestureDetector(
            onTap: isLoading ? null : () => _changeMode(AuthMode.signUp),
            child: const Text(
              'Register Now',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1D72FE),
              ),
            ),
          ),
        ],
      );
    } else {
      return Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            'Already have an account? ',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          GestureDetector(
            onTap: isLoading ? null : () => _changeMode(AuthMode.signIn),
            child: const Text(
              'Sign In',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1D72FE),
              ),
            ),
          ),
        ],
      );
    }
  }

  Widget _buildActiveForm(BuildContext context, bool isLoading, bool isDark) {
    const brandBlue = Color(0xFF1D72FE);
    final titleColor = isDark ? Colors.white : const Color(0xFF0F172A);
    final subtitleColor = isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B);

    switch (_currentMode) {
      case AuthMode.signIn:
        return Column(
          key: const ValueKey('signInForm'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Email Input
            ThInput(
              label: 'EMAIL ADDRESS',
              hint: 'admin@thaibagarden.org',
              controller: _emailController,
              prefixIcon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: _validateEmail,
              accentColor: brandBlue,
            ),
            const SizedBox(height: 14),

            // Password Input
            ThInput(
              label: 'PASSWORD',
              hint: '••••••••••••',
              controller: _passwordController,
              prefixIcon: Icons.lock_outline_rounded,
              isPassword: true,
              textInputAction: TextInputAction.done,
              validator: _validatePassword,
              accentColor: brandBlue,
              onFieldSubmitted: (_) => _handleLogin(),
            ),
            const SizedBox(height: 14),

            // Remember Me & Forgot Password Row
            Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _rememberMe = !_rememberMe),
                  child: Row(
                    children: [
                      Container(
                        width: 18,
                        height: 18,
                        decoration: BoxDecoration(
                          color: _rememberMe ? brandBlue : Colors.transparent,
                          border: Border.all(
                            color: _rememberMe
                                ? brandBlue
                                : (isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1)),
                            width: 1.5,
                          ),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: _rememberMe
                            ? const Icon(
                                Icons.check_rounded,
                                size: 13,
                                color: Colors.white,
                              )
                            : null,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'REMEMBER ME',
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: isLoading ? null : () => _changeMode(AuthMode.forgotPassword),
                  child: const Text(
                    'Forgot Password?',
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
                      color: brandBlue,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Vibrant SIGN IN Button (MediaHive standard height 50, radius 14)
            Container(
              height: 50,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFF1D72FE), Color(0xFF2563EB)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: brandBlue.withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: isLoading ? null : _handleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: EdgeInsets.zero,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isLoading ? 'SIGNING IN...' : 'SIGN IN',
                      style: const TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        fontWeight: FontWeight.w800,
                        fontSize: 14.0,
                        letterSpacing: 0.8,
                        color: Colors.white,
                      ),
                    ),
                    if (!isLoading) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),

            // Centered OR Divider
            Row(
              children: [
                Expanded(
                  child: Divider(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    thickness: 1,
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Text(
                    'OR',
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                      fontSize: 11.0,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),
                Expanded(
                  child: Divider(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    thickness: 1,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // CONTINUE WITH GOOGLE Button
            Container(
              height: 50,
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A222F) : Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  width: 1.2,
                ),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: isLoading ? null : _handleGoogleLogin,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const _GoogleLogo(size: 20),
                    const SizedBox(width: 10),
                    Text(
                      'CONTINUE WITH GOOGLE',
                      style: TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        fontSize: 13.0,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.6,
                        color: isDark ? Colors.white : const Color(0xFF1E293B),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Passkey Authentication Option
            Container(
              height: 46,
              decoration: BoxDecoration(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155).withValues(alpha: 0.7) : const Color(0xFFE2E8F0),
                  width: 1.0,
                ),
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(14),
                onTap: isLoading ? null : () => _changeMode(AuthMode.passkey),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.fingerprint_rounded, size: 20, color: Color(0xFF7C4DFF)),
                    const SizedBox(width: 8),
                    Text(
                      'SIGN IN WITH PASSKEY',
                      style: TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                        color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        );

      case AuthMode.signUp:
        return Column(
          key: const ValueKey('signUpForm'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: ThInput(
                    label: 'FIRST NAME',
                    hint: 'First name',
                    controller: _firstNameController,
                    prefixIcon: Icons.person_outline,
                    textInputAction: TextInputAction.next,
                    validator: (v) => _validateRequired(v, 'First name'),
                    accentColor: brandBlue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ThInput(
                    label: 'LAST NAME',
                    hint: 'Last name',
                    controller: _lastNameController,
                    prefixIcon: Icons.person_outline,
                    textInputAction: TextInputAction.next,
                    validator: (v) => _validateRequired(v, 'Last name'),
                    accentColor: brandBlue,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            ThInput(
              label: 'EMAIL ADDRESS',
              hint: 'you@thaibagarden.org',
              controller: _emailController,
              prefixIcon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: _validateEmail,
              accentColor: brandBlue,
            ),
            const SizedBox(height: 14),

            ThInput(
              label: 'EMPLOYEE ID',
              hint: 'e.g. TG-042',
              controller: _employeeIdController,
              prefixIcon: Icons.badge_outlined,
              textInputAction: TextInputAction.next,
              validator: (v) => _validateRequired(v, 'Employee ID'),
              accentColor: brandBlue,
            ),
            const SizedBox(height: 14),

            Row(
              children: [
                Expanded(
                  child: ThInput(
                    label: 'PASSWORD',
                    hint: 'Password',
                    controller: _passwordController,
                    prefixIcon: Icons.lock_outline_rounded,
                    isPassword: true,
                    textInputAction: TextInputAction.next,
                    validator: _validatePassword,
                    accentColor: brandBlue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ThInput(
                    label: 'CONFIRM',
                    hint: 'Confirm',
                    controller: _confirmPasswordController,
                    prefixIcon: Icons.lock_outline_rounded,
                    isPassword: true,
                    textInputAction: TextInputAction.done,
                    validator: (v) {
                      if (v != _passwordController.text) return 'Mismatch';
                      return null;
                    },
                    accentColor: brandBlue,
                    onFieldSubmitted: (_) => _handleSignup(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),

            Container(
              height: 50,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFF1D72FE), Color(0xFF2563EB)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: brandBlue.withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: isLoading ? null : _handleSignup,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: EdgeInsets.zero,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isLoading ? 'REGISTERING...' : 'REGISTER & SIGN IN',
                      style: const TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        fontWeight: FontWeight.w800,
                        fontSize: 14.0,
                        letterSpacing: 0.8,
                        color: Colors.white,
                      ),
                    ),
                    if (!isLoading) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            TextButton(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.signIn),
              child: Text(
                'Already have an account? Sign In',
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                ),
              ),
            ),
          ],
        );

      case AuthMode.google:
        return Column(
          key: const ValueKey('googleForm'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A222F) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Column(
                children: [
                  const _GoogleLogo(size: 40),
                  const SizedBox(height: 14),
                  Text(
                    'Authenticate your Google account securely without typing credentials.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      fontSize: 12.5,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            Container(
              height: 50,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFF1D72FE), Color(0xFF2563EB)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: brandBlue.withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: isLoading ? null : _handleGoogleLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: EdgeInsets.zero,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isLoading ? 'CONNECTING...' : 'CONTINUE WITH GOOGLE',
                      style: const TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        fontWeight: FontWeight.w800,
                        fontSize: 14.0,
                        letterSpacing: 0.8,
                        color: Colors.white,
                      ),
                    ),
                    if (!isLoading) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            TextButton(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.signIn),
              child: Text(
                'Back to Password Sign In',
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                ),
              ),
            ),
          ],
        );

      case AuthMode.passkey:
        return Column(
          key: const ValueKey('passkeyForm'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1A222F) : const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                ),
              ),
              child: Column(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C4DFF).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.fingerprint_rounded, color: Color(0xFF7C4DFF), size: 30),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Sign in instantly using fingerprint, face unlock, or device PIN.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      fontSize: 12.5,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            ThInput(
              label: 'CAMPUS EMAIL',
              hint: 'admin@thaibagarden.org',
              controller: _emailController,
              prefixIcon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              validator: _validateEmail,
              accentColor: const Color(0xFF7C4DFF),
              onFieldSubmitted: (_) => _handlePasskeyLogin(),
            ),
            const SizedBox(height: 20),

            Container(
              height: 50,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                gradient: const LinearGradient(
                  colors: [Color(0xFF7C4DFF), Color(0xFF6200EA)],
                ),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF7C4DFF).withValues(alpha: 0.35),
                    blurRadius: 12,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: ElevatedButton(
                onPressed: isLoading ? null : _handlePasskeyLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.transparent,
                  shadowColor: Colors.transparent,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  padding: EdgeInsets.zero,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isLoading ? 'AUTHENTICATING...' : 'AUTHENTICATE PASSKEY',
                      style: const TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        fontWeight: FontWeight.w800,
                        fontSize: 14.0,
                        letterSpacing: 0.8,
                        color: Colors.white,
                      ),
                    ),
                    if (!isLoading) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.fingerprint_rounded, size: 18, color: Colors.white),
                    ],
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            TextButton(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.signIn),
              child: Text(
                'Back to Password Sign In',
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                ),
              ),
            ),
          ],
        );

      case AuthMode.forgotPassword:
        return Column(
          key: const ValueKey('forgotForm'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (!_recoverySent) ...[
              ThInput(
                label: 'CAMPUS EMAIL',
                hint: 'admin@thaibagarden.org',
                controller: _emailForgotController,
                prefixIcon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                validator: _validateEmail,
                accentColor: brandBlue,
                onFieldSubmitted: (_) => _handleForgotPassword(),
              ),
              const SizedBox(height: 20),

              Container(
                height: 50,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  gradient: const LinearGradient(
                    colors: [Color(0xFF1D72FE), Color(0xFF2563EB)],
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: brandBlue.withValues(alpha: 0.35),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: isLoading ? null : _handleForgotPassword,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: EdgeInsets.zero,
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        isLoading ? 'SENDING LINK...' : 'SEND RECOVERY LINK',
                        style: const TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          fontWeight: FontWeight.w800,
                          fontSize: 14.0,
                          letterSpacing: 0.8,
                          color: Colors.white,
                        ),
                      ),
                      if (!isLoading) ...[
                        const SizedBox(width: 8),
                        const Icon(Icons.arrow_forward_rounded, size: 16, color: Colors.white),
                      ],
                    ],
                  ),
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1A222F) : const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.amber.withValues(alpha: 0.15),
                        border: Border.all(color: Colors.amber.withValues(alpha: 0.4)),
                      ),
                      child: const Icon(Icons.mark_email_read_rounded, color: Colors.amber, size: 26),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'RECOVERY LINK DISPATCHED',
                      style: TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        color: titleColor,
                        fontWeight: FontWeight.w800,
                        fontSize: 14,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Please check your campus inbox for instructions to reset your password.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontFamily: 'PlusJakartaSans',
                        color: subtitleColor,
                        fontSize: 12.5,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),

            TextButton(
              onPressed: isLoading
                  ? null
                  : () {
                      setState(() => _recoverySent = false);
                      _changeMode(AuthMode.signIn);
                    },
              child: Text(
                'Return to Sign In',
                style: TextStyle(
                  fontFamily: 'PlusJakartaSans',
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                  color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
                ),
              ),
            ),
          ],
        );
    }
  }
}
