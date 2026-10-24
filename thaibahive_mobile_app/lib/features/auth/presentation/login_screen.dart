import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:thaibahive_mobile/core/constants.dart';
import 'package:thaibahive_mobile/core/services/logger_service.dart';
import 'package:thaibahive_mobile/core/services/passkey_service.dart';
import 'package:thaibahive_mobile/core/extensions.dart';
import 'package:thaibahive_mobile/shared/widgets/th_input.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';

enum AuthMode { signIn, signUp, google, passkey, forgotPassword }

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
  bool _obscurePassword = true;
  bool _recoverySent = false;
  bool _rememberMe = true; // Default to true — users expect to stay logged in
  String? _lastAuthError;

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
    if (value == null || value.isEmpty) return 'Email is required';
    if (!value.isEmail) return 'Enter a valid email address';
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

  Future<void> _showGoogleDiag(String stage, String detail) async {
    if (!mounted) return;
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.error_outline_rounded, color: Colors.red),
            const SizedBox(width: 8),
            Expanded(child: Text('Sign-in Failed: $stage', style: const TextStyle(fontSize: 16))),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SelectableText(
                detail,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
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
                const SnackBar(content: Text('Diagnostic trace copied to clipboard!')),
              );
            },
            label: const Text('Copy Error'),
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
      logger.info('[LoginScreen] Google account chosen: ${account.email}. Fetching auth tokens...');
      final authDetails = await account.authentication;
      final idToken = authDetails.idToken;
      if (idToken == null || idToken.isEmpty) {
        logger.error('[LoginScreen] Google Sign-In returned null or empty idToken.');
        await _showGoogleDiag(
          stage,
          'idToken is null or empty.\n'
          'Account: ${account.email}\n'
          'Possible Cause: Android OAuth client SHA-1 does not match the active APK signing key, or serverClientId is incorrect.',
        );
        return;
      }

      final claims = _decodeJwt(idToken);
      logger.info('[LoginScreen] Obtained Google ID token. aud=${claims?['aud']}, azp=${claims?['azp']}, email=${claims?['email']}');

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

  bool _isSubmittingReset = false;

  Future<void> _handlePasskeyLogin() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      logger.warning('[LoginScreen] User tapped passkey without entering email.');
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please enter your email before using Passkey.'),
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

    // Theme values based on mode
    Color accentColor;
    String subtitleText;
    String descriptionText;

    switch (_currentMode) {
      case AuthMode.signIn:
        accentColor = const Color(0xFF2EA44F); // Brand Green
        subtitleText = 'CONNECTING TO THAIBAHIVE SECURE NODE';
        descriptionText = 'Please verify your credentials or create a new developer profile to deploy your workspace node.';
        break;
      case AuthMode.signUp:
        accentColor = const Color(0xFF8BC34A); // Lime/Chartreuse
        subtitleText = 'ENROLLING SECURE USER NODE';
        descriptionText = 'Create your credentials and link your employee profile to register as a network operator.';
        break;
      case AuthMode.google:
        accentColor = const Color(0xFF4285F4); // Google Blue
        subtitleText = 'SYNCHRONIZING SECURE IDENTITY PROVIDER';
        descriptionText = 'Authorize your Thaiba Garden workspace nodes using Google OAuth secure session handoff.';
        break;
      case AuthMode.passkey:
        accentColor = const Color(0xFF7C4DFF); // Violet
        subtitleText = 'ANDROID CREDENTIAL MANAGER / PASSKEY';
        descriptionText = 'Authenticate using your device passkey (fingerprint, face, or screen lock) via Google Password Manager.';
        break;
      case AuthMode.forgotPassword:
        accentColor = const Color(0xFFF59E0B); // Orange/Amber
        subtitleText = 'RECOVERING SECURE NODE KEYS';
        descriptionText = 'Request an automated recovery token to reset your password and redeploy your workspace node keys.';
        break;
    }

    // Dynamic ring sizes and opacity
    final double green1Size = _currentMode == AuthMode.signIn ? 640.0 : 600.0;
    final double green2Size = _currentMode == AuthMode.signUp ? 520.0 : 480.0;
    final double limeSize = _currentMode == AuthMode.google ? 400.0 : 360.0;
    final double amberSize = _currentMode == AuthMode.forgotPassword ? 280.0 : 240.0;
    final double violetSize = _currentMode == AuthMode.passkey ? 380.0 : 340.0;

    final double green1Opacity = _currentMode == AuthMode.signIn ? 1.0 : 0.45;
    final double green2Opacity = _currentMode == AuthMode.signUp ? 1.0 : 0.45;
    final double limeOpacity = _currentMode == AuthMode.google ? 1.0 : 0.45;
    final double amberOpacity = _currentMode == AuthMode.forgotPassword ? 1.0 : 0.45;
    final double violetOpacity = _currentMode == AuthMode.passkey ? 1.0 : 0.45;

    return Scaffold(
      backgroundColor: const Color(0xFF0E1012),
      body: Stack(
        children: [
          // Concentric Circles Top-Right Accent
          Positioned(
            top: -410,
            right: -410,
            child: SizedBox(
              width: 700,
              height: 700,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOutCubic,
                    width: green1Size,
                    height: green1Size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF14532D).withOpacity(green1Opacity),
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOutCubic,
                    width: green2Size,
                    height: green2Size,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF2EA44F).withOpacity(green2Opacity),
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOutCubic,
                    width: limeSize,
                    height: limeSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF8BC34A).withOpacity(limeOpacity),
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOutCubic,
                    width: amberSize,
                    height: amberSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFFF59E0B).withOpacity(amberOpacity),
                    ),
                  ),
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    curve: Curves.easeInOutCubic,
                    width: violetSize,
                    height: violetSize,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF7C4DFF).withOpacity(violetOpacity),
                    ),
                  ),
                  Container(
                    width: 128,
                    height: 128,
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: Color(0xFF0E1012),
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Floating Diagnostics & Logs Button
          Positioned(
            top: 16,
            left: 16,
            child: SafeArea(
              child: IconButton(
                icon: const Icon(Icons.analytics_outlined, color: Colors.white70, size: 24),
                tooltip: 'Diagnostics & Logs',
                onPressed: () => context.push('/auth/diagnostics'),
              ),
            ),
          ),

          // Form Content
          SafeArea(
            child: Center(
              child: SingleChildScrollView(
                physics: const ClampingScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                child: Container(
                  width: double.infinity,
                  constraints: const BoxConstraints(maxWidth: 400),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Header
                        Text(
                          _currentMode == AuthMode.signIn ? 'ACCESS WORKSPACE' :
                          _currentMode == AuthMode.signUp ? 'CREATE PROFILE' :
                          _currentMode == AuthMode.google ? 'GOOGLE FEDERATION' :
                          _currentMode == AuthMode.passkey ? 'PASSKEY LOGIN' : 'FORGOT KEY',
                        style: const TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 4),
                      AnimatedDefaultTextStyle(
                        duration: const Duration(milliseconds: 250),
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          color: accentColor,
                          fontSize: 11.0,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.0,
                        ),
                        child: Text(subtitleText),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        descriptionText,
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          color: Colors.grey[400],
                          fontSize: 12.5,
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Animated Form Swapper
                      Form(
                        key: _formKey,
                        child: AnimatedSwitcher(
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
                          child: _buildActiveForm(context, isLoading, accentColor),
                        ),
                      ),

                      // Footer Links & Separator
                      if (_currentMode == AuthMode.signIn) ...[
                        const SizedBox(height: 16),
                        Align(
                          alignment: Alignment.center,
                          child: TextButton(
                            onPressed: isLoading ? null : () => _changeMode(AuthMode.forgotPassword),
                            style: TextButton.styleFrom(
                              foregroundColor: const Color(0xFF2EA44F),
                              padding: EdgeInsets.zero,
                            ),
                            child: const Text(
                              'Forgot password?',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(height: 12),
                      Container(
                        height: 1,
                        color: Colors.white.withOpacity(0.05),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'ThaibaHive secure workspace access protocols are active.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          color: Colors.grey,
                          fontSize: 11.0,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'Authorized connections only.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontFamily: 'PlusJakartaSans',
                          color: Colors.grey,
                          fontSize: 11.0,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // Sub-widget forms
  Widget _buildActiveForm(BuildContext context, bool isLoading, Color accentColor) {
    switch (_currentMode) {
      case AuthMode.signIn:
        return Column(
          key: const ValueKey('signInForm'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Email Input
            _buildLabel('EMAIL'),
            const SizedBox(height: 6),
            _buildTextFormField(
              controller: _emailController,
              hintText: 'admin@thaibahive.local',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: _validateEmail,
              accentColor: accentColor,
            ),
            const SizedBox(height: 16),

            // Password Input
            _buildLabel('PASSWORD'),
            const SizedBox(height: 6),
            _buildTextFormField(
              controller: _passwordController,
              hintText: '••••••••••••',
              icon: Icons.lock_outlined,
              textInputAction: TextInputAction.done,
              obscureText: _obscurePassword,
              validator: _validatePassword,
              accentColor: accentColor,
              suffixIcon: IconButton(
                icon: Icon(
                  _obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                  color: Colors.grey[500],
                  size: 18,
                ),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
              onFieldSubmitted: (_) => _handleLogin(),
            ),
            const SizedBox(height: 14),

            // Keep Me Signed In Checkbox
            Row(
              children: [
                GestureDetector(
                  onTap: () => setState(() => _rememberMe = !_rememberMe),
                  child: Container(
                    width: 18,
                    height: 18,
                    decoration: BoxDecoration(
                      color: const Color(0xFF121316).withOpacity(0.6),
                      border: Border.all(
                        color: _rememberMe ? const Color(0xFF2EA44F) : const Color(0xFF1E2022),
                        width: 1.5,
                      ),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: _rememberMe
                        ? const Icon(
                            Icons.check_rounded,
                            size: 14,
                            color: Color(0xFF2EA44F),
                          )
                        : null,
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () => setState(() => _rememberMe = !_rememberMe),
                  child: const Text(
                    'KEEP ME SIGNED IN',
                    style: TextStyle(
                      fontFamily: 'PlusJakartaSans',
                      color: Colors.grey,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),

            // Action Buttons
            FilledButton(
              onPressed: isLoading ? null : _handleLogin,
              style: FilledButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                disabledBackgroundColor: accentColor.withOpacity(0.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLoading ? 'Signing in...' : 'Yes, Sign In',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  if (!isLoading) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 16),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.signUp),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[300],
                side: const BorderSide(color: Color(0xFF1E2022)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: const Text(
                'No, Create Account',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.google),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[300],
                side: const BorderSide(color: Color(0xFF1E2022)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              icon: const Icon(Icons.g_mobiledata_rounded, color: Colors.white70, size: 24),
              label: const Text(
                'Sign In with Google',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.passkey),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[300],
                side: const BorderSide(color: Color(0xFF1E2022)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              icon: const Icon(Icons.login_rounded, color: Color(0xFF7C4DFF), size: 24),
              label: const Text(
                'Sign In with Passkey',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
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
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('FIRST NAME'),
                      const SizedBox(height: 6),
                      _buildTextFormField(
                        controller: _firstNameController,
                        hintText: 'First name',
                        icon: Icons.person_outline,
                        textInputAction: TextInputAction.next,
                        validator: (v) => _validateRequired(v, 'First name'),
                        accentColor: accentColor,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('LAST NAME'),
                      const SizedBox(height: 6),
                      _buildTextFormField(
                        controller: _lastNameController,
                        hintText: 'Last name',
                        icon: Icons.person_outline,
                        textInputAction: TextInputAction.next,
                        validator: (v) => _validateRequired(v, 'Last name'),
                        accentColor: accentColor,
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            _buildLabel('EMAIL'),
            const SizedBox(height: 6),
            _buildTextFormField(
              controller: _emailController,
              hintText: 'you@example.com',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              validator: _validateEmail,
              accentColor: accentColor,
            ),
            const SizedBox(height: 16),

            _buildLabel('EMPLOYEE ID'),
            const SizedBox(height: 6),
            _buildTextFormField(
              controller: _employeeIdController,
              hintText: 'Employee ID',
              icon: Icons.badge_outlined,
              textInputAction: TextInputAction.next,
              validator: (v) => _validateRequired(v, 'Employee ID'),
              accentColor: accentColor,
            ),
            const SizedBox(height: 16),

            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('PASSWORD'),
                      const SizedBox(height: 6),
                      _buildTextFormField(
                        controller: _passwordController,
                        hintText: 'Password',
                        icon: Icons.lock_outlined,
                        obscureText: true,
                        textInputAction: TextInputAction.next,
                        validator: _validatePassword,
                        accentColor: accentColor,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel('CONFIRM'),
                      const SizedBox(height: 6),
                      _buildTextFormField(
                        controller: _confirmPasswordController,
                        hintText: 'Confirm',
                        icon: Icons.lock_outlined,
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        validator: (v) {
                          if (v != _passwordController.text) return 'Mismatch';
                          return null;
                        },
                        accentColor: accentColor,
                        onFieldSubmitted: (_) => _handleSignup(),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            FilledButton(
              onPressed: isLoading ? null : _handleSignup,
              style: FilledButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                disabledBackgroundColor: accentColor.withOpacity(0.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLoading ? 'Registering...' : 'Register & Sign In',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  if (!isLoading) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 16),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.signIn),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[300],
                side: const BorderSide(color: Color(0xFF1E2022)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: const Text(
                'Already have a profile? Sign In',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
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
                color: const Color(0xFF121316).withOpacity(0.4),
                border: Border.all(color: Colors.white.withOpacity(0.04)),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.3),
                          blurRadius: 10,
                        )
                      ],
                    ),
                    child: const Icon(Icons.g_mobiledata_rounded, color: Colors.blueAccent, size: 48),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Authenticate your Google account securely without credentials.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey, fontSize: 12, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: isLoading ? null : _handleGoogleLogin,
              style: FilledButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                disabledBackgroundColor: accentColor.withOpacity(0.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLoading ? 'Federating...' : 'Continue with Google',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  if (!isLoading) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.arrow_forward_rounded, size: 16),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.signIn),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[300],
                side: const BorderSide(color: Color(0xFF1E2022)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: const Text(
                'Back to local credentials',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
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
                color: const Color(0xFF121316).withOpacity(0.4),
                border: Border.all(color: Colors.white.withOpacity(0.04)),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: const Color(0xFF7C4DFF).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.login_rounded, color: Color(0xFF7C4DFF), size: 32),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Sign in with your device passkey.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey, fontSize: 12, height: 1.4),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Uses fingerprint, face, or screen lock via Google Password Manager.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Colors.grey, fontSize: 11, height: 1.4),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _buildLabel('EMAIL'),
            const SizedBox(height: 6),
            _buildTextFormField(
              controller: _emailController,
              hintText: 'admin@thaibahive.local',
              icon: Icons.email_outlined,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.done,
              validator: _validateEmail,
              accentColor: accentColor,
              onFieldSubmitted: (_) => _handlePasskeyLogin(),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: isLoading ? null : _handlePasskeyLogin,
              style: FilledButton.styleFrom(
                backgroundColor: accentColor,
                foregroundColor: Colors.white,
                disabledBackgroundColor: accentColor.withOpacity(0.5),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                elevation: 0,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    isLoading ? 'Authenticating...' : 'Sign In with Passkey',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  if (!isLoading) ...[
                    const SizedBox(width: 8),
                    const Icon(Icons.login_rounded, size: 16),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: isLoading ? null : () => _changeMode(AuthMode.signIn),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[300],
                side: const BorderSide(color: Color(0xFF1E2022)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: const Text(
                'Back to local credentials',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
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
              _buildLabel('GROUP EMAIL'),
              const SizedBox(height: 6),
              _buildTextFormField(
                controller: _emailForgotController,
                hintText: 'admin@thaibahive.local',
                icon: Icons.email_outlined,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                validator: _validateEmail,
                accentColor: accentColor,
                onFieldSubmitted: (_) => _handleForgotPassword(),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: isLoading ? null : _handleForgotPassword,
                style: FilledButton.styleFrom(
                  backgroundColor: accentColor,
                  foregroundColor: Colors.white,
                  disabledBackgroundColor: accentColor.withOpacity(0.5),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  elevation: 0,
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      isLoading ? 'Sending link...' : 'Send Recovery Link',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    if (!isLoading) ...[
                      const SizedBox(width: 8),
                      const Icon(Icons.arrow_forward_rounded, size: 16),
                    ],
                  ],
                ),
              ),
            ] else ...[
              Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Column(
                  children: [
                    Container(
                      width: 50,
                      height: 50,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.amber.withOpacity(0.1),
                        border: Border.all(color: Colors.amber.withOpacity(0.3)),
                      ),
                      child: const Icon(Icons.mail_rounded, color: Colors.amber, size: 24),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'RECOVERY EMAIL TRANSMITTED',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'A secure node reset token has been dispatched. Please review your group inbox.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey, fontSize: 12, height: 1.4),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: isLoading
                  ? null
                  : () {
                      setState(() => _recoverySent = false);
                      _changeMode(AuthMode.signIn);
                    },
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.grey[300],
                side: const BorderSide(color: Color(0xFF1E2022)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              child: const Text(
                'Return to ACCESS WORKSPACE',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
              ),
            ),
          ],
        );
    }
  }

  // Label Widget
  Widget _buildLabel(String text) {
    return Text(
      text,
      style: TextStyle(
        fontFamily: 'PlusJakartaSans',
        color: Colors.grey[500],
        fontSize: 11.0,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.8,
      ),
    );
  }

  // TextFormField Factory using unified ThInput primitive
  Widget _buildTextFormField({
    required TextEditingController controller,
    required String hintText,
    required IconData icon,
    TextInputType? keyboardType,
    TextInputAction? textInputAction,
    bool obscureText = false,
    String? Function(String?)? validator,
    required Color accentColor,
    Widget? suffixIcon,
    void Function(String)? onFieldSubmitted,
  }) {
    return ThInput(
      label: '',
      hint: hintText,
      controller: controller,
      prefixIcon: icon,
      isPassword: obscureText,
      suffixIcon: suffixIcon,
      keyboardType: keyboardType ?? TextInputType.text,
      textInputAction: textInputAction,
      validator: validator,
      accentColor: accentColor,
      onFieldSubmitted: onFieldSubmitted,
    );
  }
}
