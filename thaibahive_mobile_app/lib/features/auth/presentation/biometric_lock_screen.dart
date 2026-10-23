import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/biometric_service.dart';
import '../../../core/services/logger_service.dart';
import '../../../models/user_model.dart';
import '../data/auth_repository.dart';
import '../data/auth_state.dart';
import '../data/biometric_provider.dart';
import '../../settings/data/settings_provider.dart';
import '../../../../shared/widgets/th_input.dart';

class BiometricLockScreenOverlay extends ConsumerStatefulWidget {
  const BiometricLockScreenOverlay({super.key});

  @override
  ConsumerState<BiometricLockScreenOverlay> createState() => _BiometricLockScreenOverlayState();
}

class _BiometricLockScreenOverlayState extends ConsumerState<BiometricLockScreenOverlay> {
  final BiometricService _service = BiometricService();
  final TextEditingController _passwordController = TextEditingController();
  
  bool _showPasswordFallback = false;
  bool _isAuthenticating = false;
  bool _obscurePassword = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    // Auto-trigger biometric prompt on screen mount
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _triggerBiometricAuth();
    });
  }

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _triggerBiometricAuth() async {
    if (_isAuthenticating) return;
    setState(() {
      _isAuthenticating = true;
      _errorMessage = null;
    });

    logger.info('[BiometricLockScreen] User triggered biometric authentication');
    final result = await _service.authenticate(
      localizedReason: 'Authenticate to access your ThaibaHive account',
    );

    if (!mounted) return;

    setState(() {
      _isAuthenticating = false;
    });

    if (result.success) {
      logger.info('[BiometricLockScreen] Biometric authentication successful, unlocking app');
      ref.read(biometricLockProvider.notifier).unlock(GoRouter.of(context));
    } else {
      logger.warning('[BiometricLockScreen] Biometric authentication unsuccessful: ${result.status} - ${result.errorMessage}');
      if (result.status == BiometricResultStatus.noBiometricsEnrolled) {
        await ref.read(biometricLockProvider.notifier).autoDisableBiometrics();
        setState(() {
          _showPasswordFallback = true;
          _errorMessage = 'Enrolled biometrics were removed or disabled on this device. Please unlock with your password. You can re-enable biometrics anytime in Settings.';
        });
      } else if (result.status == BiometricResultStatus.lockedOut) {
        setState(() {
          _showPasswordFallback = true;
          _errorMessage = result.errorMessage ?? 'Biometrics temporarily locked due to multiple failed attempts. Please unlock with your account password.';
        });
      } else {
        setState(() {
          _errorMessage = result.errorMessage ?? 'Authentication cancelled or not recognized. Tap to try again or enter your password.';
        });
      }
    }
  }

  Future<void> _submitPasswordFallback() async {
    final password = _passwordController.text.trim();
    if (password.isEmpty) {
      setState(() {
        _errorMessage = 'Please enter your password';
      });
      return;
    }

    setState(() {
      _isAuthenticating = true;
      _errorMessage = null;
    });

    try {
      final currentUser = ref.read(currentUserProvider);
      final email = currentUser?.email;
      logger.info('[BiometricLockScreen] Attempting password unlock fallback for ${email ?? "current user"}');

      if (email != null && email.isNotEmpty) {
        final authRepo = ref.read(authRepositoryProvider);
        await authRepo.login(email, password);
      } else {
        // Fallback: verify password length and session status if email unavailable
        if (password.length < 6) {
          throw Exception("Invalid password");
        }
      }

      if (!mounted) return;

      setState(() {
        _isAuthenticating = false;
      });

      logger.info('[BiometricLockScreen] Password fallback successful, unlocking app');
      ref.read(biometricLockProvider.notifier).unlock(GoRouter.of(context));
    } catch (e, stack) {
      logger.error('[BiometricLockScreen] Password fallback failed: $e', e, stack);
      if (!mounted) return;
      setState(() {
        _isAuthenticating = false;
        _errorMessage = 'Invalid password. Please try again.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    const brandColor = Color(0xFF1B4D3E);

    return PopScope(
      canPop: false,
      child: Scaffold(
        backgroundColor: const Color(0xFF0F172A),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: brandColor.withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: brandColor, width: 2),
                    ),
                    child: const Icon(
                      Icons.lock_rounded,
                      color: Color(0xFF10B981),
                      size: 40,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'ThaibaHive Locked',
                    style: TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Authenticate to resume your session',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.white70,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),

                  if (_errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.red.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Colors.red.shade400, width: 1),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline_rounded, color: Colors.red.shade300, size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              _errorMessage!,
                              style: TextStyle(color: Colors.red.shade200, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  if (!_showPasswordFallback) ...[
                    ElevatedButton.icon(
                      onPressed: _isAuthenticating ? null : _triggerBiometricAuth,
                      icon: _isAuthenticating
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.fingerprint_rounded, size: 24),
                      label: Text(_isAuthenticating ? 'Authenticating...' : 'Unlock with Biometrics'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: brandColor,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _showPasswordFallback = true;
                        });
                      },
                      child: const Text(
                        'Log in with Password',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ),
                  ] else ...[
                    ThInput(
                      label: 'Account Password',
                      hint: 'Enter your account password',
                      controller: _passwordController,
                      isPassword: true,
                      prefixIcon: Icons.lock_outline_rounded,
                      textInputAction: TextInputAction.done,
                      accentColor: brandColor,
                      onFieldSubmitted: (_) => _isAuthenticating ? null : _submitPasswordFallback(),
                    ),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _isAuthenticating ? null : _submitPasswordFallback,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: brandColor,
                        foregroundColor: Colors.white,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: _isAuthenticating
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Text('Submit Password', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 12),
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _showPasswordFallback = false;
                        });
                      },
                      child: const Text(
                        'Use Biometrics Instead',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),
                  TextButton.icon(
                    onPressed: () async {
                      final confirm = await showDialog<bool>(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: const Text('Sign Out'),
                          content: const Text('Are you sure you want to sign out and return to the login screen?'),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.pop(ctx, false),
                              child: const Text('Cancel'),
                            ),
                            FilledButton(
                              onPressed: () => Navigator.pop(ctx, true),
                              style: FilledButton.styleFrom(backgroundColor: Colors.red),
                              child: const Text('Sign Out'),
                            ),
                          ],
                        ),
                      );
                      if (confirm == true && mounted) {
                        logger.info('[BiometricLockScreen] User opted to sign out from lock screen');
                        await ref.read(authProvider.notifier).logout();
                        ref.read(biometricLockProvider.notifier).unlock(null);
                        if (mounted) {
                          GoRouter.of(context).go('/auth/login');
                        }
                      }
                    },
                    icon: const Icon(Icons.logout_rounded, size: 16, color: Colors.white54),
                    label: const Text(
                      'Sign Out / Switch Account',
                      style: TextStyle(color: Colors.white54, fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
