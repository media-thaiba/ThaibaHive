import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:thaibahive_mobile/core/extensions.dart';
import 'package:thaibahive_mobile/features/auth/data/auth_state.dart';

enum AuthMode { signIn, signUp, google, forgotPassword }

class LoginScreen extends ConsumerStatefulWidget {
  final String? initialMode;
  const LoginScreen({super.key, this.initialMode});

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
  bool _rememberMe = false;

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
    await ref.read(authProvider.notifier).signup({
      'first_name': _firstNameController.text.trim(),
      'last_name': _lastNameController.text.trim(),
      'email': _emailController.text.trim(),
      'employee_id': _employeeIdController.text.trim(),
      'phone': null,
      'password': _passwordController.text,
    });
  }

  Future<void> _handleGoogleLogin() async {
    try {
      final googleSignIn = GoogleSignIn(scopes: ['email']);
      final account = await googleSignIn.signIn();
      if (account == null) return; // User cancelled
      final authDetails = await account.authentication;
      final idToken = authDetails.idToken;
      if (idToken == null) {
        throw Exception('Google Sign-In failed: No ID token returned.');
      }
      await ref.read(authProvider.notifier).loginWithGoogle(idToken);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Google Sign-In failed: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    }
  }

  Future<void> _handleForgotPassword() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _recoverySent = false);
    // Simulate reset link dispatch
    await Future.delayed(const Duration(milliseconds: 1500));
    if (mounted) {
      setState(() => _recoverySent = true);
    }
  }

  void _changeMode(AuthMode mode) {
    if (ref.read(authProvider).status == AuthStatus.loading) return;
    setState(() {
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
        context.go('/dashboard');
      } else if (next.status == AuthStatus.error && next.errorMessage != null) {
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

    final double green1Opacity = _currentMode == AuthMode.signIn ? 1.0 : 0.45;
    final double green2Opacity = _currentMode == AuthMode.signUp ? 1.0 : 0.45;
    final double limeOpacity = _currentMode == AuthMode.google ? 1.0 : 0.45;
    final double amberOpacity = _currentMode == AuthMode.forgotPassword ? 1.0 : 0.45;

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
                        _currentMode == AuthMode.google ? 'GOOGLE FEDERATION' : 'FORGOT KEY',
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
                          fontSize: 9.5,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
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
                          fontSize: 10,
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
                          fontSize: 10,
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
        fontSize: 9.5,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.8,
      ),
    );
  }

  // TextFormField Factory
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
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      textInputAction: textInputAction,
      obscureText: obscureText,
      style: const TextStyle(color: Colors.white, fontSize: 13.5),
      onFieldSubmitted: onFieldSubmitted,
      decoration: InputDecoration(
        filled: true,
        fillColor: const Color(0xFF121316).withOpacity(0.6),
        hintText: hintText,
        hintStyle: TextStyle(color: Colors.grey[600], fontSize: 13.5),
        prefixIcon: Icon(icon, color: Colors.grey[600], size: 18),
        suffixIcon: suffixIcon,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1E2022)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF1E2022)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: accentColor, width: 1.5),
        ),
      ),
      validator: validator,
    );
  }
}
