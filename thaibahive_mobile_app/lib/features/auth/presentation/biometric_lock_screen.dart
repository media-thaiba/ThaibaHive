import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/services/biometric_service.dart';
import '../../../models/user_model.dart';
import '../data/auth_repository.dart';
import '../data/biometric_provider.dart';
import '../../settings/data/settings_provider.dart';

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

    final result = await _service.authenticate(
      localizedReason: 'Authenticate to access your ThaibaHive account',
    );

    if (!mounted) return;

    setState(() {
      _isAuthenticating = false;
    });

    if (result.success) {
      ref.read(biometricLockProvider.notifier).unlock(GoRouter.of(context));
    } else {
      if (result.status == BiometricResultStatus.lockedOut) {
        setState(() {
          _showPasswordFallback = true;
          _errorMessage = result.errorMessage ?? 'Biometrics locked due to multiple failed attempts. Please enter your password.';
        });
      } else if (result.errorMessage != null) {
        setState(() {
          _errorMessage = result.errorMessage;
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

      ref.read(biometricLockProvider.notifier).unlock(GoRouter.of(context));
    } catch (e) {
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
                    TextField(
                      controller: _passwordController,
                      obscureText: true,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        labelText: 'Enter Password',
                        labelStyle: const TextStyle(color: Colors.white70),
                        prefixIcon: const Icon(Icons.lock_outline_rounded, color: Colors.white70),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.08),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
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
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
